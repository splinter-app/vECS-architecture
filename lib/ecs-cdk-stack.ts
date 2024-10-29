import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3_notifications from "aws-cdk-lib/aws-s3-notifications";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

import * as custom_resources from "aws-cdk-lib/custom-resources";
import * as dotenv from "dotenv";
import { Construct } from "constructs";

dotenv.config();

export class EcsCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1. Define the S3 bucket (or reference an existing one)
    const bucket = s3.Bucket.fromBucketName(
      this,
      "MyExistingBucket",
      process.env.S3_BUCKET_NAME!
    );

    // 2. Create the ECS cluster
    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 3,
      natGateways: 1,
    });

    const taskSecurityGroup = new ec2.SecurityGroup(this, "TaskSecurityGroup", {
      vpc,
      allowAllOutbound: true,
    });

    // Add specific inbound rules as needed
    taskSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP traffic"
    );
    taskSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow outbound HTTPS traffic"
    );

    // Create an execution role for the Fargate task
    const executionRole = new iam.Role(this, "EcsTaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      )
    );
    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonEC2ContainerRegistryReadOnly"
      )
    );

    executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup",
        ],
        resources: ["*"], // Scope down if possible
      })
    );

    const cluster = new ecs.Cluster(this, "MyCluster", {
      vpc: vpc,
      containerInsights: true,
    });

    // 3. Create the ECS task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, "MyTaskDef", {
      memoryLimitMiB: 4096,
      cpu: 2048,

      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
      executionRole,
    });

    const subnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    }).subnetIds;

    // 4. Add a container to the ECS task
    const container = taskDefinition.addContainer("unstructured-demo", {
      image: ecs.ContainerImage.fromRegistry(
        "public.ecr.aws/q1n8b2k4/hcamacho/unstructured-demo:latest"
      ),
      logging: new ecs.AwsLogDriver({
        streamPrefix: "ecs",
        logGroup: new logs.LogGroup(this, "EcsLogGroup", {
          removalPolicy: cdk.RemovalPolicy.DESTROY, // Adjust as needed
        }),
      }),
    });

    container.addPortMappings({
      containerPort: 80,
    });

    // Create a role for the Lambda functions
    const lambdaExecutionRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    lambdaExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    // Define the Lambda function for adding
    const addLambda = new lambda.Function(this, "AddLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda/python"), // Path to Lambda code directory
      handler: "add_lambda_function.lambda_handler",

      environment: {
        ECS_CLUSTER_NAME: cluster.clusterName,
        ECS_TASK_DEFINITION: taskDefinition.taskDefinitionArn,
        MY_AWS_ACCESS_KEY_ID: process.env.MY_AWS_ACCESS_KEY_ID!,
        MY_AWS_SECRET_ACCESS_KEY: process.env.MY_AWS_SECRET_ACCESS_KEY!,
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
        SUBNET_ID: subnets[0],
        SECURITY_GROUP_ID: taskSecurityGroup.securityGroupId,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions for the add Lambda to invoke ECS tasks
    addLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "ecs:RunTask",
          "ecs:DescribeTasks",
          "iam:PassRole",
        ],
        resources: ["*"], // Scope down if possible
      })
    );

    // Grant necessary permissions to access S3
    bucket.grantRead(addLambda);

    // Add permissions for S3 to invoke addLambda
    addLambda.addPermission("S3InvokeAddLambda", {
      principal: new iam.ServicePrincipal("s3.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: bucket.bucketArn,
    });

    // Define the Lambda function for handling S3 object deletion
    const deleteLambda = new lambda.Function(this, "DeleteLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "delete_lambda_function.lambda_handler",
      code: lambda.Code.fromAsset("lambda", {
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage,
          command: [
            "bash",
            "-c",
            "pip install -r python/requirements.txt -t /asset-output && cp -r . /asset-output",
          ],
        },
      }),
      environment: {
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
      },
      timeout: cdk.Duration.seconds(30),
    });

    deleteLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "ecs:RunTask",
          "ecs:DescribeTasks",
          "iam:PassRole",
        ],
        resources: ["*"], // Scope down if possible
      })
    );

    // Grant necessary permissions to access S3 for the delete Lambda
    bucket.grantRead(deleteLambda);

    // Add permissions for S3 to invoke deleteLambda
    deleteLambda.addPermission("S3InvokeDeleteLambda", {
      principal: new iam.ServicePrincipal("s3.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: bucket.bucketArn,
    });

    // Check if the environment variable for prefix is defined
    if (process.env.S3_NOTIFICATION_PREFIX) {
      const notificationOptions: s3.NotificationKeyFilter = {
        prefix: process.env.S3_NOTIFICATION_PREFIX,
      };

      // Add event notifications with the prefix
      bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3_notifications.LambdaDestination(addLambda),
        notificationOptions
      );

      bucket.addEventNotification(
        s3.EventType.OBJECT_REMOVED,
        new s3_notifications.LambdaDestination(deleteLambda),
        notificationOptions
      );
    } else {
      // Add event notifications without any additional options
      bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3_notifications.LambdaDestination(addLambda)
      );

      bucket.addEventNotification(
        s3.EventType.OBJECT_REMOVED,
        new s3_notifications.LambdaDestination(deleteLambda)
      );
    }

    // Create a custom resource to invoke the Lambda function after deployment
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: addLambda, // Pass your existing Lambda function here
    });

    // Trigger the Lambda for initial S3 bucket processing
    const customResource = new cdk.CustomResource(
      this,
      "InvokeLambdaAfterDeploy",
      {
        serviceToken: provider.serviceToken,
      }
    );

    customResource.node.addDependency(bucket);
  }
}

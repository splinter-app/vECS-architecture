import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3_notifications from "aws-cdk-lib/aws-s3-notifications";
import * as batch from "aws-cdk-lib/aws-batch";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as custom_resources from "aws-cdk-lib/custom-resources";
import * as dotenv from "dotenv";
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as destinations from 'aws-cdk-lib/aws-logs-destinations';
import { Construct } from "constructs";

dotenv.config();

const COMPUTE_ENV_MAX_VCPU = 16;
const CONTAINER_VCPU = "2";
const CONTAINER_MEMORY = "4096";

export class S3_Pinecone_CDK_Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const centralLogGroup = new logs.LogGroup(this, "CentralLogGroup", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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

    lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:FilterLogEvents",
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "execute-api:ManageConnections",
        ],
        resources: ["*"],
      })
    );


    /* STATIC LOG FETCH */
     /* STATIC LOG FETCH */
      /* STATIC LOG FETCH */
       /* STATIC LOG FETCH */
        /* STATIC LOG FETCH */
         /* STATIC LOG FETCH */
          /* STATIC LOG FETCH */
           /* STATIC LOG FETCH */
            /* STATIC LOG FETCH */

    const fetchLogsLambda = new lambda.Function(this, 'FetchLogsLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'fetch_logs_lambda.lambda_handler',
      code: lambda.Code.fromAsset('lambda/fetch-logs'),
      environment: {
        CENTRAL_LOG_GROUP_NAME: centralLogGroup.logGroupName,
      },
      role: lambdaExecutionRole,
    });

     const api = new apigatewayv2.HttpApi(this, 'MyApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.OPTIONS,
          apigatewayv2.CorsHttpMethod.POST
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    api.addRoutes({
      path: '/logs',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2integrations.HttpLambdaIntegration('LambdaIntegration', fetchLogsLambda),
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.apiEndpoint,
      description: 'URL of the FetchLogs API',
    });


     /* WEBSOCKET LOG FETCH */
     /* WEBSOCKET LOG FETCH */
     /* WEBSOCKET LOG FETCH */
     /* WEBSOCKET LOG FETCH */
     /* WEBSOCKET LOG FETCH */
     /* WEBSOCKET LOG FETCH */
     /* WEBSOCKET LOG FETCH */
     /* WEBSOCKET LOG FETCH */
     /* WEBSOCKET LOG FETCH */


    const connectionTable = new dynamodb.Table(this, 'ConnectionTable', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const connectLambda = new lambda.Function(this, 'ConnectLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'connect_lambda.lambda_handler',
      code: lambda.Code.fromAsset('lambda/fetch-logs'),
      environment: {
        CONNECTION_TABLE_NAME: connectionTable.tableName,
      },
      role: lambdaExecutionRole,
    });

    connectionTable.grantReadWriteData(connectLambda);

    const disconnectLambda = new lambda.Function(this, 'DisconnectLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'disconnect_lambda.lambda_handler',
      code: lambda.Code.fromAsset('lambda/fetch-logs'),
      environment: {
        CONNECTION_TABLE_NAME: connectionTable.tableName,
      },
      role: lambdaExecutionRole,
    });

    connectionTable.grantReadWriteData(disconnectLambda);

    const websocketLambda = new lambda.Function(this, 'SendLogToClientLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'send_log_to_client_lambda.lambda_handler',
      code: lambda.Code.fromAsset('lambda/fetch-logs'),
      environment: {
        CONNECTION_TABLE_NAME: connectionTable.tableName,
        CENTRAL_LOG_GROUP_NAME: centralLogGroup.logGroupName,
      },
      role: lambdaExecutionRole,
    });

    connectionTable.grantReadWriteData(websocketLambda);

    const websocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketAPI', {
      connectRouteOptions: {
        integration: new apigatewayv2integrations.WebSocketLambdaIntegration('ConnectLambdaIntegration', connectLambda),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2integrations.WebSocketLambdaIntegration('DisconnectLambdaIntegration', disconnectLambda),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2integrations.WebSocketLambdaIntegration('DefaultLambdaIntegration', websocketLambda),
      }
    });
    
    new apigatewayv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: websocketApi,
      stageName: 'dev',
      autoDeploy: true,
    });

    new logs.SubscriptionFilter(this, 'LogSubscriptionFilter', {
      logGroup: centralLogGroup,
      destination: new destinations.LambdaDestination(websocketLambda),
      filterPattern: logs.FilterPattern.allEvents(),
    });

    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: `wss://${websocketApi.apiId}.execute-api.${this.region}.amazonaws.com/dev`,
      description: 'WebSocket URL',
    });

    websocketLambda.addEnvironment('WEBSOCKET_API_URL', `wss://${websocketApi.apiId}.execute-api.${this.region}.amazonaws.com/dev`);




    


    lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "execute-api:ManageConnections"
        ],
        resources: [
          `*` // Allow posting to any connection
        ],
      })
    );
    

    // Define the S3 bucket (or reference an existing one)
    const bucket = s3.Bucket.fromBucketName(
      this,
      "MyExistingBucket",
      process.env.S3_BUCKET_NAME!
    );

    // Create the VPC
    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 3,
      natGateways: 1,
    });

    // Create Batch Instance Role
    const batchInstanceRole = new iam.Role(this, "BatchInstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonEC2ContainerServiceforEC2Role"
        ),
      ],
    });

    // Create an Instance Profile for the Batch Instance Role
    const batchInstanceProfile = new iam.CfnInstanceProfile(
      this,
      "BatchInstanceProfile",
      {
        roles: [batchInstanceRole.roleName],
      }
    );

    // Create Batch Service Role
    const batchServiceRole = new iam.Role(this, "BatchServiceRole", {
      assumedBy: new iam.ServicePrincipal("batch.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSBatchServiceRole"
        ),
      ],
    });

    batchServiceRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["logs:DescribeLogGroups", "logs:DescribeLogStreams", "logs:CreateLogGroup", "logs:PutLogEvents"],
        resources: [centralLogGroup.logGroupArn],
      })
    );    

    // Define the execution role for Fargate Batch jobs
    const batchExecutionRole = new iam.Role(this, "BatchExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    batchExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
        resources: [centralLogGroup.logGroupArn + ":*"],
      })
    );    

    // Create a Batch Compute Environment with Fargate and ARM64 support
    const computeEnvironment = new batch.CfnComputeEnvironment(
      this,
      "MyBatchComputeEnv",
      {
        type: "MANAGED",
        computeResources: {
          type: "FARGATE",
          maxvCpus: COMPUTE_ENV_MAX_VCPU,
          subnets: vpc.privateSubnets.map((subnet) => subnet.subnetId),
          securityGroupIds: [
            new ec2.SecurityGroup(this, "BatchSecurityGroup", { vpc })
              .securityGroupId,
          ],
        },
        serviceRole: batchServiceRole.roleArn,
      }
    );

    // Create a Batch Job Queue
    const jobQueue = new batch.CfnJobQueue(this, "MyBatchJobQueue", {
      priority: 1,
      computeEnvironmentOrder: [
        {
          order: 1,
          computeEnvironment: computeEnvironment.ref,
        },
      ],
    });

    // Batch Job Definition with ARM64 architecture
    const jobDefinition = new batch.CfnJobDefinition(this, "MyBatchJobDef", {
      type: "container",
      containerProperties: {
        image: "public.ecr.aws/q1n8b2k4/hcamacho/unstructured-demo:latest",
        resourceRequirements: [
          { type: "VCPU", value: CONTAINER_VCPU },
          { type: "MEMORY", value: CONTAINER_MEMORY },
        ],
        jobRoleArn: new iam.Role(this, "BatchJobRole", {
          assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        }).roleArn,
        executionRoleArn: batchExecutionRole.roleArn,
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": centralLogGroup.logGroupName,
            "awslogs-region": this.region,
            "awslogs-stream-prefix": "batch-logs",  // Prefix for log streams
            "awslogs-create-group": "true",  // Automatically create log group if it doesn't exist
          },
        },
        runtimePlatform: {
          cpuArchitecture: "ARM64",
          operatingSystemFamily: "LINUX",
        },
      },
      platformCapabilities: ["FARGATE"],
    });

    

    // Define the Lambda function for adding
    const addLambda = new lambda.Function(this, "AddLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda/s3_pinecone_lambda"),
      handler: "add_lambda_function.lambda_handler",
      environment: {
        CENTRAL_LOG_GROUP_NAME: centralLogGroup.logGroupName,
        JOB_QUEUE: jobQueue.ref,
        JOB_DEFINITION: jobDefinition.ref,
        MY_AWS_ACCESS_KEY_ID: process.env.MY_AWS_ACCESS_KEY_ID!,
        MY_AWS_SECRET_ACCESS_KEY: process.env.MY_AWS_SECRET_ACCESS_KEY!,
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
        S3_NOTIFICATION_PREFIX: process.env.S3_NOTIFICATION_PREFIX || '',
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions for the add Lambda to submit jobs to AWS Batch
    addLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["batch:SubmitJob"],
        resources: [jobQueue.ref, jobDefinition.ref],
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
      code: lambda.Code.fromAsset("lambda/s3_pinecone_lambda"),
      environment: {
        CENTRAL_LOG_GROUP_NAME: centralLogGroup.logGroupName,
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
      },
      timeout: cdk.Duration.seconds(30),
    });

    deleteLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["batch:SubmitJob"],
        resources: [jobQueue.ref],
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

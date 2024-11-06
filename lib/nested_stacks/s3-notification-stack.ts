import * as cdk from "aws-cdk-lib";
import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as custom_resources from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

interface S3NotificationStackProps extends NestedStackProps {
  addLambdaFunction: lambda.IFunction;
  deleteLambdaFunction: lambda.IFunction;
  lambdaAssetPath: string;
}

export class S3NotificationStack extends NestedStack {
  public bucket: s3.IBucket

  constructor(scope: Construct, id: string, props: S3NotificationStackProps) {
    super(scope, id, props);

    const { addLambdaFunction, deleteLambdaFunction, lambdaAssetPath } = props;

   /* 
     This function serves as a workaround for the circular dependency
     issue that arises when setting up S3 event notifications for
     Lambda functions.
   */
    const applyNotificationFunction = new lambda.Function(this, "ApplyBucketNotificationFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "apply_bucket_notification_function.lambda_handler",
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: {
        S3_NOTIFICATION_PREFIX: process.env.S3_NOTIFICATION_PREFIX || "",
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Reference the existing S3 bucket
    this.bucket = s3.Bucket.fromBucketName(this, "MyExistingBucket", process.env.S3_BUCKET_NAME!);

    // Grant necessary permissions for applyNotificationFunction to configure notifications
    applyNotificationFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ["s3:PutBucketNotification"],
      resources: [this.bucket.bucketArn],
    }));

    // Grant necessary permissions to access S3
    this.bucket.grantRead(addLambdaFunction);
    this.bucket.grantRead(deleteLambdaFunction);

    // Add permissions for S3 to invoke addLambda and deleteLambda
    addLambdaFunction.addPermission("S3InvokeAddLambda", {
      principal: new iam.ServicePrincipal("s3.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: this.bucket.bucketArn,
    });

    deleteLambdaFunction.addPermission("S3InvokeDeleteLambda", {
      principal: new iam.ServicePrincipal("s3.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: this.bucket.bucketArn,
    });

    // Use custom resource to apply S3 bucket notification
    const applyNotificationProvider = new custom_resources.Provider(this, "ApplyNotificationProvider", {
      onEventHandler: applyNotificationFunction,
    });

    new cdk.CustomResource(this, "ApplyNotifications", {
      serviceToken: applyNotificationProvider.serviceToken,
      properties: {
        BucketName: this.bucket.bucketName,
        addLambdaArn: addLambdaFunction.functionArn,
        deleteLambdaArn: deleteLambdaFunction.functionArn,
      },
    });

    // Create a custom resource to invoke the Lambda function after deployment
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: addLambdaFunction, // Pass your existing Lambda function here
    });

    // Trigger the Lambda for initial S3 bucket processing
    const customResource = new cdk.CustomResource(
      this,
      "InvokeLambdaAfterDeploy",
      {
        serviceToken: provider.serviceToken,
      }
    );

    customResource.node.addDependency(this.bucket);
  }
}

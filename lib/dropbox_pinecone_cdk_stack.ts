// lib/webhook_lambda_cdk-stack.ts

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as batch from "aws-cdk-lib/aws-batch";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as custom_resources from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dotenv from "dotenv";
import * as logs from "aws-cdk-lib/aws-logs";
import { BatchStack } from "./nested_stacks/batch-stack";


dotenv.config();

const lambdaAssetPath = "lambda/dropbox_pinecone_lambda"
const imageURL = "public.ecr.aws/q1n8b2k4/hcamacho/unstructured-demo:latest";

export class DropboxPineconeCDKStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Instantiate nested stacks
    const batchStack = new BatchStack(this, 'BatchStack', {
      imageURL: imageURL,
    });

    // Setting up DynamoDB
    const tokenTable = new dynamodb.Table(this, "TokenTable", {
      partitionKey: { name: "TokenID", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Setting up LambdaLayer for the Webhook Lambda
    const requestsLayer = new lambda.LayerVersion(this, "RequestsLayer", {
      code: lambda.Code.fromAsset(
        "lambda/dropbox_pinecone_lambda/lambda_layer/requests_layer.zip"
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
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

    // Lambda function to handle webhook requests
    const webhookLambda = new lambda.Function(this, "WebhookHandlerLambda", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset(lambdaAssetPath),
      handler: "webhook_handler.handler",
      layers: [requestsLayer],
      environment: {
        JOB_QUEUE: batchStack.jobQueueRef,
        JOB_DEFINITION: batchStack.jobDefinitionRef,
        DROPBOX_ACCESS_TOKEN: process.env.DROPBOX_ACCESS_TOKEN!,
        DROPBOX_REFRESH_TOKEN: process.env.DROPBOX_REFRESH_TOKEN!,
        DROPBOX_APP_KEY: process.env.DROPBOX_APP_KEY!,
        DROPBOX_APP_SECRET: process.env.DROPBOX_APP_SECRET!,
        DROPBOX_REMOTE_URL: process.env.DROPBOX_REMOTE_URL!,
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
        DYNAMODB_TABLE_NAME: tokenTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions for the add Lambda to submit jobs to AWS Batch
    webhookLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["batch:SubmitJob"],
        resources: [batchStack.jobQueueRef, batchStack.jobDefinitionRef],
      })
    );

    // grant lambda function permission to read and write to the database.
    tokenTable.grantReadWriteData(webhookLambda);

    // Add specific permissions for DynamoDB access
    webhookLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
        ],
        resources: [tokenTable.tableArn],
      })
    );

    // Grant CloudWatch logging permissions to the Lambda function
    webhookLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    // setting up log groups for API Gateway
    const logGroup = new logs.LogGroup(this, "ApiGatewayAccessLogs");

    // API Gateway to expose the Lambda function
    const api = new apigateway.RestApi(this, "WebhookApi", {
      restApiName: "Webhook Service",
      description: "API Gateway with POST endpoint for Dropbox webhook.",
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
    });

    // Create /webhook resource and add POST method
    const webhookResource = api.root.addResource("webhook");
    webhookResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(webhookLambda)
    );
    webhookResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(webhookLambda)
    );

    webhookResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["OPTIONS", "POST", "GET"],
    });

    new apigateway.Deployment(this, "WebhookApiDeployment", {
      api,
    });

    // // Create a custom resource to invoke the Lambda function after deployment
    // const provider = new custom_resources.Provider(this, "Provider", {
    //   onEventHandler: webhookLambda, // Pass your existing Lambda function here
    // });

    // // Trigger the Lambda for initial S3 bucket processing
    // const customResource = new cdk.CustomResource(
    //   this,
    //   "InvokeLambdaAfterDeploy",
    //   {
    //     serviceToken: provider.serviceToken,
    //   }
    // );

    // customResource.node.addDependency(bucket);
  }
}

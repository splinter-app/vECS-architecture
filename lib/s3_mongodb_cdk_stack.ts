import { Stack, StackProps } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dotenv from "dotenv";
import { Construct } from "constructs";
import { BatchStack } from "./nested_stacks/batch-stack";
import { AddLambdaStack } from "./nested_stacks/add-lambda-stack";
import { DeleteLambdaStack } from "./nested_stacks/delete-lambda-stack";
import { S3NotificationStack } from "./nested_stacks/s3-notification-stack";

dotenv.config();

const lambdaAssetPath = "lambda/s3_mongodb_lambda";
const imageURL = "public.ecr.aws/q1n8b2k4/hcamacho/unstructured-demo:v2.0";

interface S3MongoDBCDKStackProps extends StackProps {}

export class S3MongoDBCDKStack extends Stack {
  constructor(scope: Construct, id: string, props: S3MongoDBCDKStackProps) {
      super(scope, id, props);

      // Instantiate nested stacks
      const batchStack = new BatchStack(this, 'BatchStack', {
        imageURL: imageURL,
      });
      
      const addLambdaStack = new AddLambdaStack(this, 'AddLambdaStack', {
        jobQueueRef: batchStack.jobQueueRef,
        jobDefinitionRef: batchStack.jobDefinitionRef,
        lambdaAssetPath: lambdaAssetPath,
        environment: {
          JOB_QUEUE: batchStack.jobQueueRef,
          JOB_DEFINITION: batchStack.jobDefinitionRef,
          MY_AWS_ACCESS_KEY_ID: process.env.MY_AWS_ACCESS_KEY_ID!,
          MY_AWS_SECRET_ACCESS_KEY: process.env.MY_AWS_SECRET_ACCESS_KEY!,
          EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER!,
          EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
          EMBEDDING_PROVIDER_API_KEY: process.env.EMBEDDING_PROVIDER_API_KEY || '',
          MONGODB_URI: process.env.MONGODB_URI!,
          MONGODB_DATABASE: process.env.MONGODB_DATABASE!,
          MONGODB_COLLECTION: process.env.MONGODB_COLLECTION!,
          S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
          S3_NOTIFICATION_PREFIX: process.env.S3_NOTIFICATION_PREFIX || '',
        }
      });

      const deleteLambdaStack = new DeleteLambdaStack(this, 'DeleteLambdaStack', {
        lambdaExecutionRoleArn: addLambdaStack.lambdaExecutionRoleArn,
        lambdaAssetPath: lambdaAssetPath,
        environment: {
          MONGODB_URI: process.env.MONGODB_URI!,
          MONGODB_DATABASE: process.env.MONGODB_DATABASE!,
          MONGODB_COLLECTION: process.env.MONGODB_COLLECTION!,
        },
      });
      
      const s3NotificationStack = new S3NotificationStack(this, 'S3NotificationStack', {
          addLambdaFunction: addLambdaStack.addLambda,
          deleteLambdaFunction: deleteLambdaStack.deleteLambda,
          lambdaAssetPath: lambdaAssetPath,
      });

      // Define dependencies
      addLambdaStack.addDependency(batchStack);
      deleteLambdaStack.addDependency(addLambdaStack);
      s3NotificationStack.addDependency(addLambdaStack);
      s3NotificationStack.addDependency(deleteLambdaStack);
  }
}

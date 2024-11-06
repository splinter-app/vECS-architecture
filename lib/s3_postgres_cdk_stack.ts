import { Stack, StackProps } from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { Construct } from "constructs";
import { BatchStack } from "./nested_stacks/batch-stack";
import { AddLambdaStack } from "./nested_stacks/add-lambda-stack";
import { DeleteLambdaStack } from "./nested_stacks/delete-lambda-stack";
import { S3NotificationStack } from "./nested_stacks/s3-notification-stack";

dotenv.config();

const lambdaAssetPath = "lambda/s3_postgres_lambda";
const imageURL = "public.ecr.aws/y7z1l4m8/unstructured_ingest_psql_edit2:latest";

export class S3PostgresCDKStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
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
          EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
          POSTGRES_DB_NAME: process.env.POSTGRES_DB_NAME!,
          POSTGRES_USER: process.env.POSTGRES_USER!,
          POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
          POSTGRES_HOST: process.env.POSTGRES_HOST!,
          POSTGRES_PORT: process.env.POSTGRES_PORT!,
          POSTGRES_TABLE_NAME: process.env.POSTGRES_TABLE_NAME!,
          S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
          S3_NOTIFICATION_PREFIX: process.env.S3_NOTIFICATION_PREFIX || '',
        }
      });

      const deleteLambdaStack = new DeleteLambdaStack(this, 'DeleteLambdaStack', {
        lambdaExecutionRoleArn: addLambdaStack.lambdaExecutionRoleArn,
        lambdaAssetPath: lambdaAssetPath,
        environment: {
          POSTGRES_DB_NAME: process.env.POSTGRES_DB_NAME!,
          POSTGRES_USER: process.env.POSTGRES_USER!,
          POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
          POSTGRES_HOST: process.env.POSTGRES_HOST!,
          POSTGRES_PORT: process.env.POSTGRES_PORT!,
          POSTGRES_TABLE_NAME: process.env.POSTGRES_TABLE_NAME!,
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

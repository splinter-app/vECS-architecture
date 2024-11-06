import { Stack, StackProps } from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { Construct } from "constructs";
import { BatchStack } from "./nested_stacks/batch-stack";
import { AddLambdaStack } from "./nested_stacks/add-lambda-stack";
import { DeleteLambdaStack } from "./nested_stacks/delete-lambda-stack";
import { S3NotificationStack } from "./nested_stacks/s3-notification-stack";

dotenv.config();

const lambdaAssetPath = "lambda/s3_pinecone_lambda"
const imageURL = "public.ecr.aws/q1n8b2k4/hcamacho/unstructured-demo:latest"

interface S3PineconeCDKStackProps extends StackProps {}

export class S3PineconeCDKStack extends Stack {
  constructor(scope: Construct, id: string, props: S3PineconeCDKStackProps) {
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
          PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
          EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME!,
          PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
          S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
          S3_NOTIFICATION_PREFIX: process.env.S3_NOTIFICATION_PREFIX || '',
        }
      });

      const deleteLambdaStack = new DeleteLambdaStack(this, 'DeleteLambdaStack', {
        lambdaExecutionRoleArn: addLambdaStack.lambdaExecutionRoleArn,
        lambdaAssetPath: lambdaAssetPath,
        environment: {
          PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
          PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME!,
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

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { S3_Pinecone_CDK_Stack } from '../lib/s3_pinecone_cdk_stack'
import { S3_MongoDB_CDK_Stack } from '../lib/s3_mongodb_cdk_stack';
import { S3_Postgres_CDK_Stack } from '../lib/s3_postgres_cdk_stack';

const app = new cdk.App();
new S3_Pinecone_CDK_Stack(app, 'S3PineconeCDKStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

new S3_MongoDB_CDK_Stack(app, 'S3MongoDBCDKStack', {
  
});

new S3_Postgres_CDK_Stack(app, 'S3PostgresCDKStack', {
  
});
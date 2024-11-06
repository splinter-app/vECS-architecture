#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { S3PineconeCDKStack } from '../lib/s3_pinecone_cdk_stack';
import { S3PostgresCDKStack } from '../lib/s3_postgres_cdk_stack';
import { S3MongoDBCDKStack } from '../lib/s3_mongodb_cdk_stack';
import { DropboxPineconeCDKStack } from '../lib/dropbox_pinecone_cdk_stack';

const app = new cdk.App();
new S3PineconeCDKStack(app, 'S3PineconeCDKStack', {});
new S3MongoDBCDKStack(app, 'S3MongoDBCDKStack', {});
new S3PostgresCDKStack(app, 'S3PostgresCDKStack', {});
new DropboxPineconeCDKStack(app, "DropboxPineconeCDKStack", {});

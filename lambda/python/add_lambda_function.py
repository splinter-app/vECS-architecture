# lambda/add_lambda_function.py
import json
import os
import boto3
import botocore
from pinecone_utils import delete_from_pinecone

# Initialize the ECS client and S3 client
ecs_client = boto3.client('ecs')
s3_client = boto3.client('s3')

# Read the app.py script from the Lambda's local file system
with open('s3_pinecone_ingest.py', 'r') as script_file:
    app_script = script_file.read()

# Optionally, escape newlines for environment variable usage
# app_script_escaped = app_script.replace('\n', '\\n')

# print("App script:", app_script_escaped)


def lambda_handler(event, context):
    # Check if this is a delete event (ie. CDK delete)
    if event.get('RequestType') == 'Delete':
        print("Stack is being deleted, no ECS task will be started.")
        return {
            'statusCode': 200,
            'body': json.dumps("Delete event - no action taken.")
        }
    
    # Check if it's an S3 event or a custom resource event
    if 'Records' in event and event['Records']:
        # Handle S3 event
        print("S3 event received. Determining if object is new or needs to be updated.")
        bucket_name = event['Records'][0]['s3']['bucket']['name']
        document_key = event['Records'][0]['s3']['object']['key']
        
        s3_url = f"s3://{bucket_name}/{document_key}"

        if does_object_exist(bucket_name, document_key):
            print(f"Object {document_key} already exists. Running delete logic.")
            # Retrieve the API key and index name from environment variables
            api_key = os.environ['PINECONE_API_KEY']
            index_name = os.environ['PINECONE_INDEX_NAME']
            try:
                delete_from_pinecone(os.path.basename(document_key), api_key, index_name)
            except Exception as e:
                print(f"Error deleting from Pinecone: {e}")

        return add_files(s3_url)

    else:
        # Handle custom resource event (initial processing)
        print("Custom resource event received. Listing objects in S3 bucket.")
        bucket_name = os.environ['S3_BUCKET_NAME']
        s3_client = boto3.client('s3')
        prefix = os.environ.get('S3_NOTIFICATION_PREFIX', '')
        
        # List existing objects in the bucket
        response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
        print(f"The objects im going to iterate through are: {response['Contents']}")
        if 'Contents' in response:
            for item in response['Contents']:
                document_key = item['Key']
                s3_url = f"s3://{bucket_name}/{document_key}"

                # Skip the object if its size is 0 (indicating it's a folder)
                if item['Size'] == 0:
                    print(f"Skipping folder: {document_key}")
                    continue
                
                s3_url = f"s3://{bucket_name}/{document_key}"
                add_files(s3_url)
        else:
            print("No objects found in the bucket.")

        return {
            'statusCode': 200,
            'body': json.dumps("Processed existing items.")
        }

def does_object_exist(bucket_name, document_key):
    try:
        s3_client.head_object(Bucket=bucket_name, Key=document_key)
        return True
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        else:
            raise

def add_files(s3_url):  
    # Environment variables 
    aws_access_key = os.environ['MY_AWS_ACCESS_KEY_ID']
    aws_secret_key = os.environ['MY_AWS_SECRET_ACCESS_KEY']
    pinecone_api_key = os.environ['PINECONE_API_KEY']
    embedding_model_name = os.environ['EMBEDDING_MODEL_NAME']
    pinecone_index_name = os.environ['PINECONE_INDEX_NAME']
    local_file_download_dir = '/tmp/'  # Temporary directory for Lambda file storage

    # Get the security group ID from environment variables
    security_group_id = os.environ['SECURITY_GROUP_ID']
    
    # Start ECS Fargate Task
    response = ecs_client.run_task(
        cluster=os.environ['ECS_CLUSTER_NAME'],  # ECS cluster name where the task will run
        launchType='FARGATE',
        taskDefinition=os.environ['ECS_TASK_DEFINITION'],  # ECS task definition name
        overrides={
            'containerOverrides': [
                {
                    'name': 'unstructured-demo',  # Name of the container in ECS Task
                    'environment': [
                        {'name': 'AWS_S3_URL', 'value': s3_url},
                        {'name': 'AWS_ACCESS_KEY_ID', 'value': aws_access_key},
                        {'name': 'AWS_SECRET_ACCESS_KEY', 'value': aws_secret_key},
                        {'name': 'PINECONE_API_KEY', 'value': pinecone_api_key},
                        {'name': 'EMBEDDING_MODEL_NAME', 'value': embedding_model_name},
                        {'name': 'PINECONE_INDEX_NAME', 'value': pinecone_index_name},
                        {'name': 'LOCAL_FILE_DOWNLOAD_DIR', 'value': local_file_download_dir},
                        {'name': 'APP_SCRIPT', 'value': app_script},
                    ],
                },
            ],
        },
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': [os.environ['SUBNET_ID']],  # Subnet for the ECS task
                'securityGroups': [security_group_id],  # Add security group here
                'assignPublicIp': 'ENABLED'
            }
        }
    )

    # Response with task information
    return {
        'statusCode': 200,
        'body': json.dumps(f"Started ECS Fargate Task: {response['tasks'][0]['taskArn']}")
    }
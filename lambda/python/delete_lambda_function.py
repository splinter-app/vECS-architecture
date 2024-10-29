# lambda/delete_lambda_function.py
import json
import os
from pinecone_utils import delete_from_pinecone

def lambda_handler(event, context):
    # Retrieve the API key and index name from environment variables
    api_key = os.environ['PINECONE_API_KEY']
    index_name = os.environ['PINECONE_INDEX_NAME']

    for record in event['Records']:
        s3_bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']

        filename = os.path.basename(s3_key)
        print(f"Deleting File: {filename} from Bucket: {s3_bucket}")

        try:
            delete_from_pinecone(filename, api_key, index_name)
        except Exception as e:
            print(f"Error deleting from Pinecone: {e}")

    return {
        'statusCode': 200,
        'body': json.dumps('Processed deleted files and updated Pinecone index.')
    }
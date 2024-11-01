# lambda/s3_mongodb_lambda/delete_lambda_function.py
import json
import os
from mongodb_utils import delete_from_mongodb

def lambda_handler(event, context):
    uri = os.environ['MONGODB_URI']
    database_name = os.environ['MONGODB_DATABASE']
    collection_name = os.environ['MONGODB_COLLECTION']
    
    for record in event['Records']:
        s3_bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']

        filename = os.path.basename(s3_key)
        print(f"Deleting File: {filename} from Bucket: {s3_bucket}")

        try:
            delete_from_mongodb(filename, uri, database_name, collection_name)
        except Exception as e:
            print(f"Error deleting from MongoDB: {e}")

    return {
        'statusCode': 200,
        'body': json.dumps("Deleted files from MongoDB.")
    }
# lambda/s3_mongodb_lambda/delete_lambda_function.py
import json
import os
import urllib.parse
from mongodb_utils import delete_from_mongodb

def lambda_handler(event, context):
    uri = os.environ['MONGODB_URI']
    database_name = os.environ['MONGODB_DATABASE']
    collection_name = os.environ['MONGODB_COLLECTION']
    
    for record in event['Records']:
        s3_bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']

        filename = os.path.basename(s3_key)

        try:
            decoded_filename = urllib.parse.unquote(filename)
            decoded_filename_with_spaces = decoded_filename.replace('+', ' ').replace('%20', ' ')
            delete_from_mongodb(decoded_filename_with_spaces, uri, database_name, collection_name)
            print(f"Deleted File: {decoded_filename_with_spaces} from Bucket: {s3_bucket}")
        except Exception as e:
            print(f"Error deleting from MongoDB: {e}")

    return {
        'statusCode': 200,
        'body': json.dumps("Deleted files from MongoDB.")
    }
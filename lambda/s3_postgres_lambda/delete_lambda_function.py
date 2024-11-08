# lambda/s3_postgres_lambda/delete_lambda_function.py
import json
import os
import urllib.parse
from postgres_utils import delete_from_postgres

def lambda_handler(event, context):
    db_name = os.environ['POSTGRES_DB_NAME']
    user = os.environ['POSTGRES_USER']
    password = os.environ['POSTGRES_PASSWORD']
    host = os.environ['POSTGRES_HOST']
    port = os.environ['POSTGRES_PORT']
    table_name = os.environ['POSTGRES_TABLE_NAME']

    for record in event['Records']:
        s3_bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']

        filename = os.path.basename(s3_key)

        try:
            decoded_filename = urllib.parse.unquote(filename)
            decoded_filename_with_spaces = decoded_filename.replace('+', ' ').replace('%20', ' ')
            delete_from_postgres(db_name, user, password, host, port, table_name, decoded_filename_with_spaces)
            print(f"Deleted File: {decoded_filename_with_spaces} from Bucket: {s3_bucket}")
        except Exception as e:
            print(f"Error deleting from Postgres: {e}")

    return {
        'statusCode': 200,
        'body': json.dumps('Deleted files from PostgreSQL.')
    }
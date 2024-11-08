import boto3
import os
import json
from datetime import datetime

logs_client = boto3.client('logs')
log_group_name = os.environ['CENTRAL_LOG_GROUP_NAME']

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['CONNECTION_TABLE_NAME'])

def lambda_handler(event, context):
    connection_id = get_connection_id_from_dynamodb()
    print(f"the connection id {connection_id}")
    
    http_endpoint_url = os.environ['WEBSOCKET_API_URL'].replace("wss://", "https://")
    print(f"endopoint url {http_endpoint_url}")

    apigateway_management_api = boto3.client(
        'apigatewaymanagementapi', 
        endpoint_url=http_endpoint_url
    )
    
    log_data = fetch_logs_from_cloudwatch()
    
    if not connection_id:
        print(f"No connection ID found for the client.")
        return {
            'statusCode': 404,
            'body': 'Connection ID not found'
        }

    try:
        apigateway_management_api.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps({'logs': log_data})
        )
    except apigateway_management_api.exceptions.GoneException:
        print(f"Connection {connection_id} is no longer valid.")

    return {
        'statusCode': 200,
        'body': 'Log sent'
    }

def get_connection_id_from_dynamodb():
    response = table.scan()

    if response.get('Items'):
        return response['Items'][0]['connectionId']

    return None

def fetch_logs_from_cloudwatch():
    try:
        response = logs_client.filter_log_events(
            logGroupName=log_group_name,
            # limit=10
        )

        log_events = response.get('events', [])
        
        logs = [
            {
                'timestamp': event['timestamp'], 
                'message': event['message']
            } 
            for event in log_events
        ]

        if not logs:
            return [{'timestamp': int(datetime.now().timestamp() * 1000), 'message': 'No log data available'}]

        return logs

    except Exception as e:
        print(f"Error fetching logs from CloudWatch: {str(e)}")
        return [{'timestamp': int(datetime.now().timestamp() * 1000), 'message': 'Error fetching logs from CloudWatch'}]


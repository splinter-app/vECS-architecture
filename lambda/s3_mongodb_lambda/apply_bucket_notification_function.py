import boto3
import os

s3_client = boto3.client("s3")

def lambda_handler(event, context):
    bucket_name = event["ResourceProperties"]["BucketName"]
    add_lambda_arn = event["ResourceProperties"]["addLambdaArn"]
    delete_lambda_arn = event["ResourceProperties"]["deleteLambdaArn"]

    prefix = os.getenv("S3_NOTIFICATION_PREFIX", "")


    try:
        response = s3_client.put_bucket_notification_configuration(
            Bucket=bucket_name,
            NotificationConfiguration={
                "LambdaFunctionConfigurations": [
                    {
                        "LambdaFunctionArn": add_lambda_arn,
                        "Events": ["s3:ObjectCreated:*"],
                        "Filter": {
                            "Key": {
                                "FilterRules": [
                                    {"Name": "prefix", "Value": prefix}
                                ]
                            }
                        }
                    },
                    {
                        "LambdaFunctionArn": delete_lambda_arn,
                        "Events": ["s3:ObjectRemoved:*"],
                        "Filter": {
                            "Key": {
                                "FilterRules": [
                                    {"Name": "prefix", "Value": prefix}
                                ]
                            }
                        }
                    },
                ]
            },
        )
        return {"PhysicalResourceId": bucket_name}
    except Exception as e:
        raise Exception(f"Error applying notification configuration: {str(e)}")

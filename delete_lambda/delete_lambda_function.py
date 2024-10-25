import json
import os
import time
from pinecone import Pinecone

def lambda_handler(event, context):
    # Load Pinecone configuration from environment variables
    PINECONE_API_KEY = os.environ['PINECONE_API_KEY']
    PINECONE_ENV = os.environ.get('PINECONE_ENV', 'us-east-1')
    index_name = os.environ['PINECONE_INDEX_NAME']

    # Initialize Pinecone and connect to the index
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(index_name)

    # Start timing the operation
    start_time = time.time()

    # Get a list of vector IDs from the index
    index_list = []
    for chunk in index.list():
        for index_element in chunk:
            index_list.append(index_element)

    # Use the first vector ID for querying
    random_vector_id = index_list[0] if index_list else None

    for record in event['Records']:
        s3_bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']

        # Extract the filename from the s3_key
        filename = os.path.basename(s3_key)
        print(f"Deleted File: {filename} from Bucket: {s3_bucket}")

        vector_ids_to_delete = []
        cursor = None

        # Loop to query in batches until all matches are found
        while True:
            # Query Pinecone for items matching the filename
            query_results = index.query(
                namespace="",
                id=random_vector_id,
                filter={"filename": {"$eq": filename}},
                top_k=10000,  # Adjust this value as needed
                include_metadata=True,
                cursor=cursor  # Use cursor for pagination
            )

            if query_results and 'matches' in query_results:
                # Collect the IDs to delete
                vector_ids_to_delete.extend(match['id'] for match in query_results['matches'])

                # Check if there are more results to fetch
                cursor = query_results.get('next_cursor')
                if not cursor:  # No more results, exit the loop
                    break
            else:
                break

        print(f"Found {len(vector_ids_to_delete)} vectors that match the filename '{filename}'.")

        # Delete matching vectors from the index in batches of 1,000
        for i in range(0, len(vector_ids_to_delete), 1000):
            batch = vector_ids_to_delete[i:i + 1000]
            index.delete(ids=batch)
            print(f"Deleted {len(batch)} vectors from Pinecone.")

    # End timing and calculate duration
    end_time = time.time()
    duration = end_time - start_time
    print(f"Total search and delete process took {duration:.2f} seconds.")

    return {
        'statusCode': 200,
        'body': json.dumps('Processed deleted files and updated Pinecone index.')
    }

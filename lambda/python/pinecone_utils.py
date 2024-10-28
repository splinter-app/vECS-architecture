# lambda/pinecone_utils.py
import time
from pinecone import Pinecone

def delete_from_pinecone(filename, api_key, index_name):
    # Initialize Pinecone and connect to the index
    pc = Pinecone(api_key=api_key)
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

    vector_ids_to_delete = []
    cursor = None

    # Loop to query in batches until all matches are found
    while True:
        # Query Pinecone for items matching the filename
        query_results = index.query(
            namespace="",
            id=random_vector_id,
            filter={"filename": {"$eq": filename}},
            top_k=10000,
            include_metadata=True,
            cursor=cursor
        )

        if query_results and 'matches' in query_results:
            vector_ids_to_delete.extend(match['id'] for match in query_results['matches'])
            cursor = query_results.get('next_cursor')
            if not cursor:
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

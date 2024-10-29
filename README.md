Welcome to the "ECS version" prototype of our project developed using CDK with TypeScript.

The purpose of this project is to take raw files containing unstructured data, ingest the data, process the data through an embedding model, and populate a vector database with those embeddings.
For our prototype, we focused on one source connector (AWS S3) and one destination connector (Pinecone)

Prior to deploying the CDK, create a .env file in the root directory with the following variables:

MY_AWS_ACCESS_KEY_ID=<your AWS access key>

MY_AWS_SECRET_ACCESS_KEY=<your AWS secret access key>

PINECONE_API_KEY=<your Pinecone API key>

EMBEDDING_MODEL_NAME=BAAI/bge-base-en-v1.5 (this can be changed but works with this as a default)

PINECONE_INDEX_NAME=<your Pinecone index name>

S3_BUCKET_NAME=<your existing S3 bucket name>

S3_NOTIFICATION_PREFIX=<optional prefix to the S3 bucket that you want to trigger the workflow>

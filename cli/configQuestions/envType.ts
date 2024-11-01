export interface envType {
  my_aws_access_key_id: string;
  my_aws_secret_access_key: string;
  s3_bucket_name?: string;
  pinecone_api_key?: string;
  pinecone_index_name?: string;
  embedding_model_name?: string;
  embedding_provider_api_key?: string;
  chunking_strategy?: "basic" | "by_title" | "by_page" | "by_similarity";
  chunking_max_characters?: string;
}

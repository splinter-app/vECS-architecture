from dotenv import load_dotenv
import os
from unstructured_ingest.v2.pipeline.pipeline import Pipeline
from unstructured_ingest.v2.interfaces import ProcessorConfig
from unstructured_ingest.v2.processes.partitioner import PartitionerConfig
from unstructured_ingest.v2.processes.connectors.fsspec.dropbox import (DropboxIndexerConfig, DropboxDownloaderConfig, DropboxAccessConfig, DropboxConnectionConfig)
from unstructured_ingest.v2.processes.connectors.pinecone import (PineconeConnectionConfig, PineconeAccessConfig, PineconeUploaderConfig, PineconeUploadStagerConfig)
from unstructured_ingest.v2.processes.chunker import ChunkerConfig
from unstructured_ingest.v2.processes.embedder import EmbedderConfig

load_dotenv()

if __name__ == "__main__":
    Pipeline.from_configs(
        context=ProcessorConfig(),
        indexer_config=DropboxIndexerConfig(remote_url=os.getenv("DROPBOX_REMOTE_URL")),
        downloader_config=DropboxDownloaderConfig(download_dir=os.getenv("LOCAL_FILE_DOWNLOAD_DIR")),
        source_connection_config=DropboxConnectionConfig(
            access_config=DropboxAccessConfig(
                token=os.getenv("DROPBOX_ACCESS_TOKEN")
            )
        ),
        partitioner_config=PartitionerConfig(
            partition_by_api=False,
        ),
        chunker_config=ChunkerConfig(
            chunking_strategy="basic",
            chunk_max_characters=1000,
            chunk_overlap=20
        ),

        embedder_config=EmbedderConfig(
            embedding_provider="huggingface",
            embedding_model_name=os.getenv("EMBEDDING_MODEL_NAME"),
        ),
        destination_connection_config=PineconeConnectionConfig(
            access_config=PineconeAccessConfig(
                api_key=os.getenv("PINECONE_API_KEY")
            ),
            index_name=os.getenv("PINECONE_INDEX_NAME")
        ),
        stager_config=PineconeUploadStagerConfig(),
        uploader_config=PineconeUploaderConfig()
    ).run()
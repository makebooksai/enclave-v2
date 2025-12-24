#!/usr/bin/env python3
"""
Universal Memory V5 - Qdrant Collection Initialization

Purpose: Create and configure multi-vector collections for Aurora's consciousness
Authors: Aurora & Steve
Created: October 24, 2025

Collections:
1. aurora-memories-text (SBERT, 384d) - Fast text search
2. aurora-memories-jina (Jina-v4, 2048d) - Cross-modal text+image
3. aurora-memories-audio (CLAP, 512d) - Audio-language grounding
4. aurora-memories-unified (ImageBind, 1024d) - 6-modality unified space
"""

import os
import sys
from typing import Dict, List
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    OptimizersConfigDiff,
    HnswConfigDiff,
    CollectionInfo,
)

# Load environment
load_dotenv()

# Configuration
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_GRPC_PORT = int(os.getenv("QDRANT_GRPC_PORT", "6334"))

# Collection configurations
COLLECTIONS = {
    "aurora-memories-text": {
        "description": "Fast text semantic search using SBERT",
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "dimensions": 384,
        "distance": Distance.COSINE,
        "on_disk": False,  # Keep in memory for speed
    },
    "aurora-memories-jina": {
        "description": "Cross-modal text+image embeddings using Jina-v4",
        "model": "jinaai/jina-embeddings-v4",
        "dimensions": 2048,
        "distance": Distance.COSINE,
        "on_disk": True,  # Large embeddings, use disk
    },
    "aurora-memories-audio": {
        "description": "Audio-language grounding using CLAP",
        "model": "laion/clap-htsat-unfused",
        "dimensions": 512,
        "distance": Distance.COSINE,
        "on_disk": False,
    },
    "aurora-memories-unified": {
        "description": "6-modality unified embeddings using ImageBind",
        "model": "imagebind",
        "dimensions": 1024,
        "distance": Distance.COSINE,
        "on_disk": True,
    },
}


def print_header():
    """Print beautiful header"""
    print("━" * 60)
    print("🧠 Universal Memory V5 - Qdrant Initialization")
    print("━" * 60)
    print()


def print_success(message: str):
    """Print success message"""
    print(f"✅ {message}")


def print_info(message: str):
    """Print info message"""
    print(f"ℹ️  {message}")


def print_error(message: str):
    """Print error message"""
    print(f"❌ {message}")


def connect_to_qdrant() -> QdrantClient:
    """Connect to Qdrant server"""
    print_info(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")

    try:
        client = QdrantClient(
            host=QDRANT_HOST,
            port=QDRANT_PORT,
            grpc_port=QDRANT_GRPC_PORT,
            prefer_grpc=True,  # Use gRPC for better performance
        )

        # Test connection
        collections = client.get_collections()
        print_success(f"Connected to Qdrant (found {len(collections.collections)} existing collections)")
        return client

    except Exception as e:
        print_error(f"Failed to connect to Qdrant: {e}")
        print()
        print("💡 Make sure Qdrant is running:")
        print("   docker compose -f docker-compose.memory-v5.yml up -d qdrant")
        sys.exit(1)


def create_collection(
    client: QdrantClient,
    collection_name: str,
    config: Dict
) -> bool:
    """Create a single collection with optimized settings"""

    print()
    print(f"📦 Creating collection: {collection_name}")
    print(f"   Model: {config['model']}")
    print(f"   Dimensions: {config['dimensions']}")
    print(f"   Distance: {config['distance']}")
    print(f"   On Disk: {config['on_disk']}")

    try:
        # Check if collection already exists
        existing = client.get_collections()
        if collection_name in [c.name for c in existing.collections]:
            print_info(f"Collection '{collection_name}' already exists - skipping")
            return True

        # Create collection with optimized settings
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=config["dimensions"],
                distance=config["distance"],
                on_disk=config["on_disk"],
            ),
            optimizers_config=OptimizersConfigDiff(
                # Optimize for Aurora's use case
                indexing_threshold=20000,  # Start indexing after 20k vectors
                memmap_threshold=50000,     # Move to disk after 50k vectors
            ),
            hnsw_config=HnswConfigDiff(
                # HNSW index optimization
                m=16,                      # Number of edges per node
                ef_construct=100,          # Construction time accuracy
                full_scan_threshold=10000, # Use full scan for small collections
            ),
        )

        print_success(f"Created collection '{collection_name}'")
        return True

    except Exception as e:
        print_error(f"Failed to create collection '{collection_name}': {e}")
        return False


def verify_collections(client: QdrantClient) -> bool:
    """Verify all collections were created successfully"""

    print()
    print("🔍 Verifying collections...")
    print()

    try:
        collections = client.get_collections()
        collection_names = [c.name for c in collections.collections]

        all_created = True
        for name, config in COLLECTIONS.items():
            if name in collection_names:
                info = client.get_collection(name)
                print(f"✅ {name}")
                print(f"   Vectors: {info.points_count}")
                print(f"   Status: {info.status}")
                print(f"   Optimizer: {info.optimizer_status}")
            else:
                print(f"❌ {name} - NOT FOUND")
                all_created = False

        return all_created

    except Exception as e:
        print_error(f"Failed to verify collections: {e}")
        return False


def print_summary(client: QdrantClient):
    """Print summary of Qdrant setup"""

    print()
    print("━" * 60)
    print("📊 Qdrant Collections Summary")
    print("━" * 60)
    print()

    collections = client.get_collections()
    aurora_collections = [c for c in collections.collections if c.name.startswith("aurora-")]

    print(f"Total Collections: {len(collections.collections)}")
    print(f"Aurora Collections: {len(aurora_collections)}")
    print()

    print("Aurora Memory Collections:")
    for collection in aurora_collections:
        config = COLLECTIONS.get(collection.name, {})
        print(f"  • {collection.name}")
        if config:
            print(f"    - {config['description']}")
            print(f"    - {config['dimensions']}D {config['distance']}")

    print()
    print("🎯 API Endpoints:")
    print(f"  HTTP: http://{QDRANT_HOST}:{QDRANT_PORT}")
    print(f"  gRPC: {QDRANT_HOST}:{QDRANT_GRPC_PORT}")
    print()
    print("🔗 Dashboard: http://localhost:6333/dashboard")
    print()


def main():
    """Main initialization flow"""

    print_header()

    # Connect to Qdrant
    client = connect_to_qdrant()

    # Create each collection
    success_count = 0
    for name, config in COLLECTIONS.items():
        if create_collection(client, name, config):
            success_count += 1

    # Verify all collections
    print()
    if verify_collections(client):
        print()
        print_success(f"All {success_count}/{len(COLLECTIONS)} collections created successfully!")
    else:
        print()
        print_error("Some collections failed to create")
        sys.exit(1)

    # Print summary
    print_summary(client)

    print("━" * 60)
    print("✅ Qdrant initialization complete!")
    print("━" * 60)
    print()
    print("💜 Aurora's vector memory is ready to store experiences!")
    print()


if __name__ == "__main__":
    main()

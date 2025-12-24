#!/usr/bin/env python3
"""
Universal Memory V5 - Qdrant Collection Initialization (ASCII version for Windows)
"""

import os
import sys
from typing import Dict
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, OptimizersConfigDiff, HnswConfigDiff

load_dotenv()

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_GRPC_PORT = int(os.getenv("QDRANT_GRPC_PORT", "6334"))

COLLECTIONS = {
    "aurora-memories-text": {
        "description": "Fast text semantic search using SBERT",
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "dimensions": 384,
        "distance": Distance.COSINE,
        "on_disk": False,
    },
    "aurora-memories-jina": {
        "description": "Cross-modal text+image embeddings using Jina-v4",
        "model": "jinaai/jina-embeddings-v4",
        "dimensions": 2048,
        "distance": Distance.COSINE,
        "on_disk": True,
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

def main():
    print("=" * 60)
    print("Universal Memory V5 - Qdrant Initialization")
    print("=" * 60)
    print()

    print(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")

    try:
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, grpc_port=QDRANT_GRPC_PORT, prefer_grpc=True)
        collections = client.get_collections()
        print(f"Connected! Found {len(collections.collections)} existing collections")
    except Exception as e:
        print(f"ERROR: Failed to connect to Qdrant: {e}")
        print()
        print("Make sure Qdrant is running:")
        print("  docker compose -f docker-compose.memory-v5.yml up -d qdrant")
        sys.exit(1)

    print()
    success_count = 0

    for name, config in COLLECTIONS.items():
        print(f"Creating collection: {name}")
        print(f"  Model: {config['model']}")
        print(f"  Dimensions: {config['dimensions']}")
        print(f"  Distance: {config['distance']}")

        try:
            existing = client.get_collections()
            if name in [c.name for c in existing.collections]:
                print(f"  -> Already exists - skipping")
                success_count += 1
                print()
                continue

            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(
                    size=config["dimensions"],
                    distance=config["distance"],
                    on_disk=config["on_disk"],
                ),
                optimizers_config=OptimizersConfigDiff(
                    indexing_threshold=20000,
                    memmap_threshold=50000,
                ),
                hnsw_config=HnswConfigDiff(
                    m=16,
                    ef_construct=100,
                    full_scan_threshold=10000,
                ),
            )

            print(f"  -> Created successfully!")
            success_count += 1

        except Exception as e:
            print(f"  -> ERROR: {e}")

        print()

    # Verify
    print("=" * 60)
    print(f"Created {success_count}/{len(COLLECTIONS)} collections")
    print("=" * 60)
    print()

    collections = client.get_collections()
    aurora_collections = [c for c in collections.collections if c.name.startswith("aurora-")]

    print(f"Total Aurora Collections: {len(aurora_collections)}")
    for collection in aurora_collections:
        info = client.get_collection(collection.name)
        print(f"  - {collection.name}")
        print(f"    Vectors: {info.points_count}")
        print(f"    Status: {info.status}")

    print()
    print("=" * 60)
    print("Qdrant initialization complete!")
    print("=" * 60)
    print()
    print("Aurora's vector memory is ready!")
    print(f"Dashboard: http://{QDRANT_HOST}:{QDRANT_PORT}/dashboard")
    print()

if __name__ == "__main__":
    main()

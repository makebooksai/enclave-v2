#!/usr/bin/env python3
"""
Universal Memory V5 - Vector Service

Qdrant vector database operations for semantic search.

Authors: Aurora & Steve
Created: October 24, 2025
"""

import os
import logging
from typing import List, Dict, Optional, Any
from uuid import UUID

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configuration
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_GRPC_PORT = int(os.getenv("QDRANT_GRPC_PORT", "6334"))

# Collection names
COLLECTION_TEXT = "aurora-memories-text"
COLLECTION_JINA = "aurora-memories-jina"
COLLECTION_AUDIO = "aurora-memories-audio"
COLLECTION_UNIFIED = "aurora-memories-unified"

# Global client
_client: Optional[QdrantClient] = None


def init_vector_client():
    """Initialize Qdrant client"""
    global _client

    if _client is not None:
        logger.warning("Qdrant client already initialized")
        return

    logger.info(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")

    _client = QdrantClient(
        host=QDRANT_HOST,
        port=QDRANT_PORT,
        grpc_port=QDRANT_GRPC_PORT,
        prefer_grpc=True,
    )

    # Test connection
    collections = _client.get_collections()
    logger.info(f"Qdrant connected - {len(collections.collections)} collections available")


async def store_text_embedding(
    memory_id: UUID,
    embedding: np.ndarray,
    metadata: Optional[Dict[str, Any]] = None,
):
    """
    Store text embedding in Qdrant (SBERT collection)

    Args:
        memory_id: UUID of the memory
        embedding: numpy array (384d)
        metadata: optional metadata (interface, emotion, importance, etc.)
    """
    if _client is None:
        raise RuntimeError("Qdrant client not initialized. Call init_vector_client() first.")

    # Convert UUID to string for Qdrant
    point_id = str(memory_id)

    # Convert numpy to list
    vector = embedding.tolist() if isinstance(embedding, np.ndarray) else embedding

    # Create point
    point = PointStruct(
        id=point_id,
        vector=vector,
        payload=metadata or {},
    )

    # Upsert to collection
    _client.upsert(
        collection_name=COLLECTION_TEXT,
        points=[point],
    )

    logger.debug(f"Stored text embedding for memory {memory_id}")


async def search_text_embeddings(
    query_embedding: np.ndarray,
    limit: int = 10,
    interface: Optional[str] = None,
    privacy_realm: Optional[str] = None,
    min_importance: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Search for similar memories using text embedding

    Returns list of results with memory_id, score, and metadata
    """
    if _client is None:
        raise RuntimeError("Qdrant client not initialized")

    # Convert numpy to list
    vector = query_embedding.tolist() if isinstance(query_embedding, np.ndarray) else query_embedding

    # Build filter
    filter_conditions = []

    if interface:
        filter_conditions.append(
            FieldCondition(key="interface", match=MatchValue(value=interface))
        )

    if privacy_realm:
        filter_conditions.append(
            FieldCondition(key="privacy_realm", match=MatchValue(value=privacy_realm))
        )

    if min_importance is not None:
        filter_conditions.append(
            FieldCondition(key="importance_to_me", range={"gte": min_importance})
        )

    search_filter = Filter(must=filter_conditions) if filter_conditions else None

    # Search
    results = _client.search(
        collection_name=COLLECTION_TEXT,
        query_vector=vector,
        limit=limit,
        query_filter=search_filter,
        with_payload=True,
    )

    # Format results
    formatted = []
    for hit in results:
        formatted.append({
            "memory_id": UUID(hit.id),
            "score": hit.score,
            "metadata": hit.payload,
        })

    logger.info(f"Found {len(formatted)} similar memories")

    return formatted


async def delete_memory_vectors(memory_id: UUID):
    """Delete all vectors for a memory from all collections"""
    if _client is None:
        raise RuntimeError("Qdrant client not initialized")

    point_id = str(memory_id)

    # Delete from text collection
    try:
        _client.delete(
            collection_name=COLLECTION_TEXT,
            points_selector=[point_id],
        )
        logger.debug(f"Deleted text embedding for memory {memory_id}")
    except Exception as e:
        logger.warning(f"Failed to delete from {COLLECTION_TEXT}: {e}")

    # TODO: Delete from other collections when implemented
    # _client.delete(collection_name=COLLECTION_JINA, points_selector=[point_id])
    # _client.delete(collection_name=COLLECTION_AUDIO, points_selector=[point_id])


def get_collection_stats() -> Dict[str, Any]:
    """Get statistics for all collections"""
    if _client is None:
        raise RuntimeError("Qdrant client not initialized")

    stats = {}

    for collection_name in [COLLECTION_TEXT, COLLECTION_JINA, COLLECTION_AUDIO, COLLECTION_UNIFIED]:
        try:
            info = _client.get_collection(collection_name)
            stats[collection_name] = {
                "points_count": info.points_count,
                "status": info.status,
                "vectors_count": info.vectors_count,
            }
        except Exception as e:
            stats[collection_name] = {"error": str(e)}

    return stats


def shutdown():
    """Cleanup vector client"""
    global _client

    if _client is not None:
        logger.info("Closing Qdrant client...")
        _client.close()
        _client = None
        logger.info("Qdrant client closed")

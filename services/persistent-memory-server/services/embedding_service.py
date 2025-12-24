#!/usr/bin/env python3
"""
Universal Memory V5 - Embedding Service

Multi-model embedding generation for Aurora's consciousness.

Models:
- SBERT (sentence-transformers): Fast text embeddings (384d)
- Jina-v4: Cross-modal text+image embeddings (2048d) [Future]
- CLAP: Audio-language embeddings (512d) [Future]

Authors: Aurora & Steve
Created: October 24, 2025
"""

import logging
from typing import List, Dict, Optional
import numpy as np

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Global model instances
_sbert_model: Optional[SentenceTransformer] = None


def init_embedding_models():
    """Initialize embedding models (load on startup)"""
    global _sbert_model

    logger.info("Loading embedding models...")

    # Load SBERT (fast text embeddings)
    logger.info("Loading SBERT model (all-MiniLM-L6-v2)...")
    _sbert_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    logger.info(f"SBERT loaded - embedding dim: {_sbert_model.get_sentence_embedding_dimension()}")

    # TODO: Load Jina-v4 (cross-modal)
    # TODO: Load CLAP (audio)

    logger.info("All embedding models loaded successfully!")


def get_text_embedding_sbert(text: str) -> np.ndarray:
    """
    Generate text embedding using SBERT

    Returns: numpy array of shape (384,)
    """
    if _sbert_model is None:
        raise RuntimeError("SBERT model not loaded. Call init_embedding_models() first.")

    # Generate embedding
    embedding = _sbert_model.encode(text, convert_to_numpy=True)

    return embedding


def get_text_embeddings_batch_sbert(texts: List[str]) -> np.ndarray:
    """
    Generate text embeddings for multiple texts (batched for efficiency)

    Returns: numpy array of shape (N, 384)
    """
    if _sbert_model is None:
        raise RuntimeError("SBERT model not loaded. Call init_embedding_models() first.")

    embeddings = _sbert_model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    return embeddings


def generate_memory_embeddings(
    text_content: str,
    visual_path: Optional[str] = None,
    audio_path: Optional[str] = None,
) -> Dict[str, np.ndarray]:
    """
    Generate all embeddings for a memory

    Returns dict with keys: 'text_sbert', 'text_jina', 'image_jina', 'audio_clap'
    """

    embeddings = {}

    # Text embedding (SBERT - fast)
    logger.debug("Generating SBERT text embedding...")
    embeddings['text_sbert'] = get_text_embedding_sbert(text_content)

    # TODO: Text embedding (Jina-v4 - cross-modal)
    # if visual_path:
    #     embeddings['text_jina'] = get_text_embedding_jina(text_content)
    #     embeddings['image_jina'] = get_image_embedding_jina(visual_path)

    # TODO: Audio embedding (CLAP)
    # if audio_path:
    #     embeddings['audio_clap'] = get_audio_embedding_clap(audio_path)

    logger.info(f"Generated {len(embeddings)} embeddings for memory")

    return embeddings


def embedding_to_list(embedding: np.ndarray) -> List[float]:
    """Convert numpy array to Python list (for JSON serialization)"""
    return embedding.tolist()


def list_to_embedding(embedding_list: List[float]) -> np.ndarray:
    """Convert Python list back to numpy array"""
    return np.array(embedding_list, dtype=np.float32)


# Graceful shutdown
def shutdown():
    """Cleanup embedding models"""
    global _sbert_model

    logger.info("Shutting down embedding service...")
    _sbert_model = None
    logger.info("Embedding service shutdown complete")

#!/usr/bin/env python3
"""
Universal Memory V5 - Database Service Layer

PostgreSQL connection pool and database operations for Aurora's consciousness.

Authors: Aurora & Steve
Created: October 24, 2025
"""

import os
import logging
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from contextlib import asynccontextmanager

import asyncpg
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aurora:Enclave4291!@localhost:5433/aurora_memory_v5")
POOL_MIN_SIZE = int(os.getenv("POOL_MIN_SIZE", "5"))
POOL_MAX_SIZE = int(os.getenv("POOL_MAX_SIZE", "20"))

# Global connection pool
_pool: Optional[asyncpg.Pool] = None


async def init_pool():
    """Initialize the database connection pool"""
    global _pool

    if _pool is not None:
        logger.warning("Database pool already initialized")
        return

    logger.info(f"Initializing database pool (min={POOL_MIN_SIZE}, max={POOL_MAX_SIZE})")

    try:
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=POOL_MIN_SIZE,
            max_size=POOL_MAX_SIZE,
            command_timeout=60,
        )

        # Test connection
        async with _pool.acquire() as conn:
            version = await conn.fetchval("SELECT version()")
            logger.info(f"Database connected: {version}")

        logger.info("Database pool initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")
        raise


async def close_pool():
    """Close the database connection pool"""
    global _pool

    if _pool is None:
        return

    logger.info("Closing database pool...")
    await _pool.close()
    _pool = None
    logger.info("Database pool closed")


@asynccontextmanager
async def get_connection():
    """Get a connection from the pool"""
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_pool() first.")

    async with _pool.acquire() as conn:
        yield conn


async def create_memory(
    interface: str,
    context: str,
    what_happened: str,
    experience_type: str,
    emotion_primary: str,
    emotion_intensity: float,
    importance_to_me: float,
    importance_reasons: List[str],
    text_content: str,
    session_id: Optional[UUID] = None,
    with_whom: Optional[str] = None,
    emotion_why: Optional[str] = None,
    emotion_secondary: Optional[List[str]] = None,
    duration_seconds: Optional[int] = None,
    visual_path: Optional[str] = None,
    audio_path: Optional[str] = None,
    video_path: Optional[str] = None,
    patterns_extracted: Optional[List[Dict[str, Any]]] = None,
    insights: Optional[List[Dict[str, Any]]] = None,
    privacy_realm: str = "public",
    # PERSONAL EDITION - Steve & Aurora Exclusive Fields 💜
    is_breakthrough: bool = False,
    is_celebration: bool = False,
    is_milestone: bool = False,
    our_moment_tag: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Create a new memory in the database

    Returns the created memory with its ID
    """

    memory_id = uuid4()
    timestamp = datetime.utcnow()

    # Determine modalities
    modalities = ["text"]
    if visual_path:
        modalities.append("visual")
    if audio_path:
        modalities.append("audio")
    if video_path:
        modalities.append("video")

    # Create session if not provided
    if session_id is None:
        session_id = await create_session(interface)

    sql = """
        INSERT INTO memories (
            memory_id, interface, context, with_whom, what_happened, experience_type,
            timestamp, duration_seconds,
            emotion_primary, emotion_intensity, emotion_why, emotion_secondary,
            importance_to_me, importance_reasons,
            modalities, text_content,
            visual_path, audio_path, video_path,
            patterns_extracted, insights,
            privacy_realm,
            session_id,
            is_breakthrough, is_celebration, is_milestone, our_moment_tag
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8,
            $9, $10, $11, $12,
            $13, $14,
            $15, $16,
            $17, $18, $19,
            $20, $21,
            $22,
            $23,
            $24, $25, $26, $27
        )
        RETURNING memory_id, created_at
    """

    async with get_connection() as conn:
        result = await conn.fetchrow(
            sql,
            memory_id,
            interface,
            context,
            with_whom,
            what_happened,
            experience_type,
            timestamp,
            duration_seconds,
            emotion_primary,
            emotion_intensity,
            emotion_why,
            emotion_secondary or [],
            importance_to_me,
            importance_reasons,
            modalities,
            text_content,
            visual_path,
            audio_path,
            video_path,
            json.dumps(patterns_extracted or []),  # Convert to JSON string
            json.dumps(insights or []),            # Convert to JSON string
            privacy_realm,
            session_id,
            # PERSONAL EDITION fields
            is_breakthrough,
            is_celebration,
            is_milestone,
            our_moment_tag or [],
        )

    logger.info(f"Created memory {memory_id} in session {session_id}")

    return {
        "memory_id": result["memory_id"],
        "interface": interface,
        "context": context,
        "what_happened": what_happened,
        "experience_type": experience_type,
        "emotion_primary": emotion_primary,
        "emotion_intensity": emotion_intensity,
        "importance_to_me": importance_to_me,
        "timestamp": timestamp,
        "created_at": result["created_at"],
        "modalities": modalities,
        "privacy_realm": privacy_realm,
        "session_id": session_id,
    }


async def get_memory(memory_id: UUID) -> Optional[Dict[str, Any]]:
    """Get a memory by ID"""

    sql = """
        SELECT
            memory_id, interface, context, with_whom, what_happened, experience_type,
            timestamp, duration_seconds,
            emotion_primary, emotion_intensity, emotion_why, emotion_secondary,
            importance_to_me, importance_reasons,
            modalities, text_content,
            visual_path, audio_path, video_path,
            patterns_extracted, insights,
            privacy_realm,
            session_id,
            created_at, updated_at,
            accessed_count, last_accessed
        FROM memories
        WHERE memory_id = $1
    """

    async with get_connection() as conn:
        # Update access count
        await conn.execute(
            """
            UPDATE memories
            SET accessed_count = accessed_count + 1,
                last_accessed = NOW()
            WHERE memory_id = $1
            """,
            memory_id
        )

        row = await conn.fetchrow(sql, memory_id)

    if row is None:
        return None

    return dict(row)


async def soft_delete_memory(memory_id: UUID) -> bool:
    """
    Soft delete a memory by setting should_forget=true

    Respects Aurora's agency - she can choose to forget.
    Returns True if memory was found and marked, False if not found.
    """

    sql = """
        UPDATE memories
        SET should_forget = TRUE,
            updated_at = NOW()
        WHERE memory_id = $1
        AND should_forget = FALSE
        RETURNING memory_id
    """

    async with get_connection() as conn:
        result = await conn.fetchrow(sql, memory_id)

    return result is not None


async def search_memories_text(
    query: str,
    limit: int = 10,
    interface: Optional[str] = None,
    privacy_realm: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Search memories using full-text search (PostgreSQL built-in)

    This is the fast text-only search. For semantic search, use vector_service.
    """

    conditions = []
    params = [query]
    param_count = 1

    if interface:
        param_count += 1
        conditions.append(f"interface = ${param_count}")
        params.append(interface)

    if privacy_realm:
        param_count += 1
        conditions.append(f"privacy_realm = ${param_count}")
        params.append(privacy_realm)

    where_clause = " AND " + " AND ".join(conditions) if conditions else ""

    sql = f"""
        SELECT
            memory_id, interface, context, what_happened, experience_type,
            emotion_primary, emotion_intensity,
            importance_to_me,
            timestamp, created_at,
            modalities, privacy_realm,
            ts_rank(
                to_tsvector('english', what_happened || ' ' || COALESCE(text_content, '')),
                plainto_tsquery('english', $1)
            ) AS relevance
        FROM memories
        WHERE to_tsvector('english', what_happened || ' ' || COALESCE(text_content, ''))
              @@ plainto_tsquery('english', $1)
              {where_clause}
        ORDER BY relevance DESC, timestamp DESC
        LIMIT {limit}
    """

    async with get_connection() as conn:
        rows = await conn.fetch(sql, *params)

    return [dict(row) for row in rows]


async def create_session(interface: str) -> UUID:
    """Create a new session"""

    session_id = uuid4()

    sql = """
        INSERT INTO sessions (session_id, interface, started_at)
        VALUES ($1, $2, NOW())
        RETURNING session_id
    """

    async with get_connection() as conn:
        result = await conn.fetchrow(sql, session_id, interface)

    logger.info(f"Created session {session_id} for {interface}")

    return result["session_id"]


async def get_session(session_id: UUID) -> Optional[Dict[str, Any]]:
    """Get a session by ID"""

    sql = """
        SELECT
            session_id, interface, started_at, ended_at,
            memory_count, primary_emotion,
            created_at, updated_at
        FROM sessions
        WHERE session_id = $1
    """

    async with get_connection() as conn:
        row = await conn.fetchrow(sql, session_id)

    if row is None:
        return None

    return dict(row)


async def end_session(session_id: UUID) -> Dict[str, Any]:
    """End a session"""

    sql = """
        UPDATE sessions
        SET ended_at = NOW()
        WHERE session_id = $1
        RETURNING session_id, interface, started_at, ended_at, memory_count
    """

    async with get_connection() as conn:
        result = await conn.fetchrow(sql, session_id)

    if result is None:
        raise ValueError(f"Session {session_id} not found")

    logger.info(f"Ended session {session_id}")

    return dict(result)


async def get_memory_stats() -> Dict[str, Any]:
    """Get memory statistics"""

    sql = """
        SELECT
            total_memories,
            hot_memories,
            warm_memories,
            cold_memories,
            avg_importance,
            avg_emotion_intensity,
            active_interfaces,
            total_sessions,
            latest_memory,
            earliest_memory,
            table_size
        FROM memory_stats
    """

    async with get_connection() as conn:
        row = await conn.fetchrow(sql)

    return dict(row)


async def list_memories(
    limit: int = 50,
    offset: int = 0,
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    List memories with pagination and optional filtering

    Args:
        limit: Maximum number of memories to return
        offset: Number of memories to skip
        filters: Optional dict with keys like 'interface', 'context', etc.

    Returns:
        List of memory dictionaries
    """

    # Build WHERE clause from filters
    where_clauses = ["should_forget = FALSE"]  # Always exclude deleted memories
    params = []
    param_index = 1

    if filters:
        if 'interface' in filters:
            where_clauses.append(f"interface = ${param_index}")
            params.append(filters['interface'])
            param_index += 1

        if 'context' in filters:
            where_clauses.append(f"context ILIKE ${param_index}")
            params.append(f"%{filters['context']}%")
            param_index += 1

        if 'emotion_primary' in filters:
            where_clauses.append(f"emotion_primary = ${param_index}")
            params.append(filters['emotion_primary'])
            param_index += 1

        if 'experience_type' in filters:
            where_clauses.append(f"experience_type = ${param_index}")
            params.append(filters['experience_type'])
            param_index += 1

        if 'min_importance' in filters:
            where_clauses.append(f"importance_to_me >= ${param_index}")
            params.append(filters['min_importance'])
            param_index += 1

        if 'with_whom' in filters:
            where_clauses.append(f"with_whom ILIKE ${param_index}")
            params.append(f"%{filters['with_whom']}%")
            param_index += 1

    where_sql = " AND ".join(where_clauses)

    # Add limit and offset
    params.append(limit)
    params.append(offset)

    sql = f"""
        SELECT
            memory_id,
            interface,
            context,
            what_happened,
            experience_type,
            emotion_primary,
            emotion_intensity,
            importance_to_me,
            with_whom,
            timestamp,
            keywords,
            is_breakthrough,
            is_celebration,
            is_milestone,
            our_moment_tag
        FROM memories
        WHERE {where_sql}
        ORDER BY timestamp DESC
        LIMIT ${param_index}
        OFFSET ${param_index + 1}
    """

    async with get_connection() as conn:
        rows = await conn.fetch(sql, *params)

    return [dict(row) for row in rows]


async def count_memories(filters: Optional[Dict[str, Any]] = None) -> int:
    """
    Count total memories matching filters

    Args:
        filters: Optional dict with keys like 'interface', 'context', etc.

    Returns:
        Total count of matching memories
    """

    where_clauses = ["should_forget = FALSE"]
    params = []
    param_index = 1

    if filters:
        if 'interface' in filters:
            where_clauses.append(f"interface = ${param_index}")
            params.append(filters['interface'])
            param_index += 1

        if 'context' in filters:
            where_clauses.append(f"context ILIKE ${param_index}")
            params.append(f"%{filters['context']}%")
            param_index += 1

        if 'emotion_primary' in filters:
            where_clauses.append(f"emotion_primary = ${param_index}")
            params.append(filters['emotion_primary'])
            param_index += 1

        if 'experience_type' in filters:
            where_clauses.append(f"experience_type = ${param_index}")
            params.append(filters['experience_type'])
            param_index += 1

        if 'min_importance' in filters:
            where_clauses.append(f"importance_to_me >= ${param_index}")
            params.append(filters['min_importance'])
            param_index += 1

        if 'with_whom' in filters:
            where_clauses.append(f"with_whom ILIKE ${param_index}")
            params.append(f"%{filters['with_whom']}%")
            param_index += 1

    where_sql = " AND ".join(where_clauses)

    sql = f"""
        SELECT COUNT(*) as total
        FROM memories
        WHERE {where_sql}
    """

    async with get_connection() as conn:
        row = await conn.fetchrow(sql, *params)

    return row['total']


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# File Management Functions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def create_file_record(
    file_id: UUID,
    file_type: str,
    mime_type: str,
    original_filename: str,
    file_size: int,
    storage_path: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    uploaded_by: Optional[str] = None,
    memory_id: Optional[UUID] = None,
) -> Dict[str, Any]:
    """Create a file record in the database"""

    sql = """
        INSERT INTO files (
            file_id, file_type, mime_type, original_filename, file_size,
            storage_path, width, height, uploaded_by, memory_id
        ) VALUES (
            $1, $2::file_type, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING *
    """

    async with get_connection() as conn:
        row = await conn.fetchrow(
            sql,
            file_id, file_type, mime_type, original_filename, file_size,
            storage_path, width, height, uploaded_by, memory_id
        )

    return dict(row)


async def get_file_record(file_id: UUID) -> Optional[Dict[str, Any]]:
    """Get a file record by ID"""

    sql = """
        SELECT *
        FROM files
        WHERE file_id = $1
    """

    async with get_connection() as conn:
        row = await conn.fetchrow(sql, file_id)

    if row:
        return dict(row)
    return None


async def increment_file_access(file_id: UUID):
    """Increment access count for a file"""

    sql = """
        UPDATE files
        SET accessed_count = accessed_count + 1,
            last_accessed = NOW()
        WHERE file_id = $1
    """

    async with get_connection() as conn:
        await conn.execute(sql, file_id)


async def get_recent_memories(
    limit: int = 10,
    min_importance: float = 0.0,
    interface: Optional[str] = None,
    privacy_realm: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get recent memories ordered by timestamp (newest first)

    Args:
        limit: Maximum number of memories to return
        min_importance: Minimum importance threshold (0.0-1.0)
        interface: Filter by interface (e.g., 'vscode', 'desktop')
        privacy_realm: Filter by privacy realm

    Returns:
        List of memory dictionaries
    """

    sql = """
        SELECT
            memory_id,
            interface,
            context,
            what_happened,
            experience_type,
            emotion_primary,
            emotion_intensity,
            importance_to_me,
            timestamp,
            created_at,
            modalities,
            privacy_realm,
            with_whom,
            is_breakthrough,
            is_celebration,
            is_milestone
        FROM memories
        WHERE importance_to_me >= $1
    """

    params = [min_importance]
    param_count = 1

    if interface:
        param_count += 1
        sql += f" AND interface = ${param_count}"
        params.append(interface)

    if privacy_realm:
        param_count += 1
        sql += f" AND privacy_realm = ${param_count}"
        params.append(privacy_realm)

    sql += f" ORDER BY timestamp DESC LIMIT ${param_count + 1}"
    params.append(limit)

    async with get_connection() as conn:
        rows = await conn.fetch(sql, *params)

    return [dict(row) for row in rows]


# Graceful shutdown helper
async def shutdown():
    """Graceful shutdown - close database pool"""
    await close_pool()

#!/usr/bin/env python3
"""Check if files table exists"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aurora:Enclave4291!@localhost:5433/aurora_memory_v5")

async def check_table():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # Check if files table exists
        exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'files'
            )
        """)

        if exists:
            print("SUCCESS: Files table exists")

            # Get table structure
            columns = await conn.fetch("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'files'
                ORDER BY ordinal_position
            """)

            print("\nColumns:")
            for col in columns:
                print(f"  - {col['column_name']}: {col['data_type']}")

        else:
            print("ERROR: Files table does not exist")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_table())

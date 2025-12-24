#!/usr/bin/env python3
"""Check if a specific file ID exists"""

import asyncio
import asyncpg
import os
from uuid import UUID
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aurora:Enclave4291!@localhost:5433/aurora_memory_v5")
FILE_ID = "1a8f68cc-4ed1-4999-9482-325e2094d228"

async def check_file():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # Check if file exists
        file_record = await conn.fetchrow("""
            SELECT *
            FROM files
            WHERE file_id = $1
        """, UUID(FILE_ID))

        if file_record:
            print(f"SUCCESS: File {FILE_ID} exists in database")
            print(f"  Type: {file_record['file_type']}")
            print(f"  Mime: {file_record['mime_type']}")
            print(f"  Path: {file_record['storage_path']}")
            print(f"  Size: {file_record['file_size']} bytes")
        else:
            print(f"ERROR: File {FILE_ID} NOT found in database")

            # Show all files
            all_files = await conn.fetch("SELECT file_id, file_type, original_filename FROM files LIMIT 10")
            print(f"\nTotal files in database: {len(all_files)}")
            if all_files:
                print("Recent files:")
                for f in all_files:
                    print(f"  - {f['file_id']}: {f['original_filename']}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_file())

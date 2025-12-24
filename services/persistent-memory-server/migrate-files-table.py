#!/usr/bin/env python3
"""
Run file storage migration for Memory V5
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aurora:Enclave4291!@localhost:5433/aurora_memory_v5")

async def run_migration():
    """Run the file storage migration"""

    # Read SQL file
    with open("add-file-storage.sql", "r") as f:
        sql = f.read()

    # Connect and execute
    print(f"Connecting to: {DATABASE_URL}")
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        print("Running migration...")
        await conn.execute(sql)
        print("✅ Migration completed successfully!")

        # Verify table exists
        exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'files'
            )
        """)

        if exists:
            print("✅ Files table created successfully")
        else:
            print("❌ Files table not found after migration")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())

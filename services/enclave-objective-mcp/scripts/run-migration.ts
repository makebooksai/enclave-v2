#!/usr/bin/env npx tsx
/**
 * Migration Runner for Enclave V2 Objectives & Playbooks
 *
 * Applies the schema.sql to the PostgreSQL database.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/run-migration.ts
 *
 * Or use FORGE_DATABASE_URL environment variable.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL || process.env.FORGE_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL or FORGE_DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Running Enclave V2 Objectives & Playbooks migration...');
  console.log(`📦 Database: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`);

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
  });

  try {
    // Read the schema SQL
    const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 Applying schema...');

    // Execute the schema
    await pool.query(schemaSql);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Created/updated tables:');
    console.log('  - objectives (for enclave-objective-mcp)');
    console.log('  - playbooks (for enclave-playbook-mcp)');
    console.log('  - playbook_structure (denormalized tree)');

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('objectives', 'playbooks', 'playbook_structure')
      ORDER BY table_name;
    `);

    console.log('');
    console.log('Verified tables:');
    result.rows.forEach((row) => {
      console.log(`  ✓ ${row.table_name}`);
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

/**
 * Database Client for Makebook MCP
 *
 * PostgreSQL operations for Makebook persistence.
 */

import pg from 'pg';
import type { Makebook, MakebookRecord } from '../types.js';

const { Pool } = pg;

// ─────────────────────────────────────────────────────────────────────────────
// Database Connection
// ─────────────────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Enclave4291!@localhost:5432/enclave',
});

// ─────────────────────────────────────────────────────────────────────────────
// Makebook CRUD Operations
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveMakebookResult {
  success: boolean;
  id: string;
  isNew: boolean;
  error?: string;
}

export async function saveMakebook(
  makebook: Makebook,
  objectiveId?: string,
  playbookId?: string
): Promise<SaveMakebookResult> {
  try {
    const result = await pool.query(
      `INSERT INTO makebooks (id, objective_id, playbook_id, title, objective_text, structure)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         objective_id = EXCLUDED.objective_id,
         playbook_id = EXCLUDED.playbook_id,
         title = EXCLUDED.title,
         objective_text = EXCLUDED.objective_text,
         structure = EXCLUDED.structure,
         updated_at = NOW()
       RETURNING id, (xmax = 0) as is_new`,
      [
        makebook.id,
        objectiveId || null,
        playbookId || makebook.source_playbook_id || null,
        makebook.title,
        makebook.objective,
        JSON.stringify(makebook),
      ]
    );

    return {
      success: true,
      id: result.rows[0].id,
      isNew: result.rows[0].is_new,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[makebook-mcp] Database save failed: ${errorMessage}`);
    return {
      success: false,
      id: makebook.id,
      isNew: false,
      error: errorMessage,
    };
  }
}

export async function getMakebook(id: string): Promise<Makebook | null> {
  try {
    const result = await pool.query(
      `SELECT structure FROM makebooks WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].structure as Makebook;
  } catch (error) {
    console.error(`[makebook-mcp] Database get failed: ${(error as Error).message}`);
    return null;
  }
}

export async function getMakebookByObjective(objectiveId: string): Promise<Makebook | null> {
  try {
    const result = await pool.query(
      `SELECT structure FROM makebooks WHERE objective_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [objectiveId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].structure as Makebook;
  } catch (error) {
    console.error(`[makebook-mcp] Database get by objective failed: ${(error as Error).message}`);
    return null;
  }
}

export async function getMakebookByPlaybook(playbookId: string): Promise<Makebook | null> {
  try {
    const result = await pool.query(
      `SELECT structure FROM makebooks WHERE playbook_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [playbookId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].structure as Makebook;
  } catch (error) {
    console.error(`[makebook-mcp] Database get by playbook failed: ${(error as Error).message}`);
    return null;
  }
}

export interface ListMakebooksOptions {
  limit?: number;
  offset?: number;
  objectiveId?: string;
}

export async function listMakebooks(options: ListMakebooksOptions = {}): Promise<MakebookRecord[]> {
  try {
    const { limit = 20, offset = 0, objectiveId } = options;

    let query = `
      SELECT id, objective_id, playbook_id, title, objective_text, structure, created_at, updated_at
      FROM makebooks
    `;
    const params: (string | number)[] = [];

    if (objectiveId) {
      query += ` WHERE objective_id = $1`;
      params.push(objectiveId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      objective_id: row.objective_id,
      playbook_id: row.playbook_id,
      title: row.title,
      objective: row.objective_text,
      structure: row.structure,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error(`[makebook-mcp] Database list failed: ${(error as Error).message}`);
    return [];
  }
}

export async function deleteMakebook(id: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM makebooks WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error(`[makebook-mcp] Database delete failed: ${(error as Error).message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Creation (for initialization)
// ─────────────────────────────────────────────────────────────────────────────

export async function ensureSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS makebooks (
        id UUID PRIMARY KEY,
        objective_id UUID REFERENCES objectives(id) ON DELETE SET NULL,
        playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        objective_text TEXT,
        structure JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_makebooks_objective_id ON makebooks(objective_id);
      CREATE INDEX IF NOT EXISTS idx_makebooks_playbook_id ON makebooks(playbook_id);
      CREATE INDEX IF NOT EXISTS idx_makebooks_created_at ON makebooks(created_at DESC);
    `);
    console.error('[makebook-mcp] Database schema ensured');
  } catch (error) {
    console.error(`[makebook-mcp] Schema creation failed: ${(error as Error).message}`);
    // Don't throw - table might already exist with different constraints
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Management
// ─────────────────────────────────────────────────────────────────────────────

export async function closePool(): Promise<void> {
  await pool.end();
}

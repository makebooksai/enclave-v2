/**
 * Database Client for Playbook MCP
 *
 * Handles PostgreSQL connection and CRUD operations for playbooks.
 */

import pg from 'pg';

const { Pool } = pg;

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL || process.env.FORGE_DATABASE_URL;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL or FORGE_DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaybookSpec {
  id: string;
  objectiveId: string;
  title: string;
  description?: string;
  aspenifyIntent?: string;
  aspenifyContext?: string;
  aspenifyType?: string;
  content: Record<string, unknown>;
  roles?: Array<{ name: string; description: string }>;
  prerequisites?: string[];
  generationMetadata?: Record<string, unknown>;
  questionsAsked?: Array<{ question: string; description?: string }>;
  answersProvided?: Array<{ question: string; answer: string }>;
  status: 'draft' | 'complete' | 'approved' | 'archived';
  createdAt: string;
  completedAt?: string;
  approvedAt?: string;
  updatedAt: string;
}

export interface SavePlaybookResult {
  id: string;
  created: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Playbook CRUD Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a playbook to the database
 */
export async function savePlaybook(playbook: PlaybookSpec): Promise<SavePlaybookResult> {
  const pool = getPool();

  const query = `
    INSERT INTO playbooks (
      id, objective_id, title, description,
      aspenify_intent, aspenify_context, aspenify_type,
      content, roles, prerequisites, generation_metadata,
      questions_asked, answers_provided, status,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10, $11,
      $12, $13, $14,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      aspenify_intent = EXCLUDED.aspenify_intent,
      aspenify_context = EXCLUDED.aspenify_context,
      aspenify_type = EXCLUDED.aspenify_type,
      content = EXCLUDED.content,
      roles = EXCLUDED.roles,
      prerequisites = EXCLUDED.prerequisites,
      generation_metadata = EXCLUDED.generation_metadata,
      questions_asked = EXCLUDED.questions_asked,
      answers_provided = EXCLUDED.answers_provided,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING id, (xmax = 0) as created
  `;

  const values = [
    playbook.id,
    playbook.objectiveId,
    playbook.title,
    playbook.description || null,
    playbook.aspenifyIntent || null,
    playbook.aspenifyContext || null,
    playbook.aspenifyType || null,
    JSON.stringify(playbook.content),
    JSON.stringify(playbook.roles || []),
    JSON.stringify(playbook.prerequisites || []),
    JSON.stringify(playbook.generationMetadata || {}),
    JSON.stringify(playbook.questionsAsked || []),
    JSON.stringify(playbook.answersProvided || []),
    playbook.status || 'draft',
  ];

  const result = await pool.query(query, values);
  return {
    id: result.rows[0].id,
    created: result.rows[0].created,
  };
}

/**
 * Get a playbook by ID
 */
export async function getPlaybook(id: string): Promise<PlaybookSpec | null> {
  const pool = getPool();

  const query = `SELECT * FROM playbooks WHERE id = $1`;
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToPlaybookSpec(result.rows[0]);
}

/**
 * Get playbook by objective ID
 */
export async function getPlaybookByObjective(objectiveId: string): Promise<PlaybookSpec | null> {
  const pool = getPool();

  const query = `
    SELECT * FROM playbooks
    WHERE objective_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [objectiveId]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToPlaybookSpec(result.rows[0]);
}

/**
 * Update playbook status
 */
export async function updatePlaybookStatus(
  id: string,
  status: 'draft' | 'complete' | 'approved' | 'archived'
): Promise<boolean> {
  const pool = getPool();

  const timestampField =
    status === 'complete' ? 'completed_at' :
    status === 'approved' ? 'approved_at' :
    null;

  let query = `UPDATE playbooks SET status = $2, updated_at = NOW()`;
  if (timestampField) {
    query += `, ${timestampField} = NOW()`;
  }
  query += ` WHERE id = $1`;

  const result = await pool.query(query, [id, status]);
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * List playbooks with optional filtering
 */
export async function listPlaybooks(options: {
  objectiveId?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<PlaybookSpec[]> {
  const pool = getPool();

  let query = `SELECT * FROM playbooks`;
  const values: (string | number)[] = [];
  const conditions: string[] = [];
  let paramIndex = 1;

  if (options.objectiveId) {
    conditions.push(`objective_id = $${paramIndex}`);
    values.push(options.objectiveId);
    paramIndex++;
  }

  if (options.status) {
    conditions.push(`status = $${paramIndex}`);
    values.push(options.status);
    paramIndex++;
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY created_at DESC`;

  if (options.limit) {
    query += ` LIMIT $${paramIndex}`;
    values.push(options.limit);
    paramIndex++;
  }

  if (options.offset) {
    query += ` OFFSET $${paramIndex}`;
    values.push(options.offset);
  }

  const result = await pool.query(query, values);
  return result.rows.map(rowToPlaybookSpec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function rowToPlaybookSpec(row: Record<string, unknown>): PlaybookSpec {
  return {
    id: row.id as string,
    objectiveId: row.objective_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    aspenifyIntent: row.aspenify_intent as string | undefined,
    aspenifyContext: row.aspenify_context as string | undefined,
    aspenifyType: row.aspenify_type as string | undefined,
    content: parseJsonOrDefault(row.content, {}),
    roles: parseJsonOrDefault(row.roles, []),
    prerequisites: parseJsonOrDefault(row.prerequisites, []),
    generationMetadata: parseJsonOrDefault(row.generation_metadata, {}),
    questionsAsked: parseJsonOrDefault(row.questions_asked, []),
    answersProvided: parseJsonOrDefault(row.answers_provided, []),
    status: row.status as PlaybookSpec['status'],
    createdAt: (row.created_at as Date).toISOString(),
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : undefined,
    approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : undefined,
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

function parseJsonOrDefault<T>(value: unknown, defaultValue: T): T {
  if (!value) return defaultValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Management
// ─────────────────────────────────────────────────────────────────────────────

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

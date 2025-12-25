/**
 * Database Client for Objective Analysis MCP
 *
 * Handles PostgreSQL connection and CRUD operations for objectives.
 */

import pg from 'pg';
import type { ObjectiveSpec } from '../types.js';

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
// Objective CRUD Operations
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveObjectiveResult {
  id: string;
  created: boolean;
}

/**
 * Save an objective to the database
 */
export async function saveObjective(objective: ObjectiveSpec): Promise<SaveObjectiveResult> {
  const pool = getPool();

  const query = `
    INSERT INTO objectives (
      id, title, summary, intent, context,
      requirements, constraints, success_criteria,
      project_type, domain, timeframe, budget, stakeholders,
      source_mode, template_id, quality_score, completeness_score, refinement_rounds,
      questions_answered, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18,
      $19, $20, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      intent = EXCLUDED.intent,
      context = EXCLUDED.context,
      requirements = EXCLUDED.requirements,
      constraints = EXCLUDED.constraints,
      success_criteria = EXCLUDED.success_criteria,
      project_type = EXCLUDED.project_type,
      domain = EXCLUDED.domain,
      timeframe = EXCLUDED.timeframe,
      budget = EXCLUDED.budget,
      stakeholders = EXCLUDED.stakeholders,
      quality_score = EXCLUDED.quality_score,
      completeness_score = EXCLUDED.completeness_score,
      refinement_rounds = EXCLUDED.refinement_rounds,
      questions_answered = EXCLUDED.questions_answered,
      updated_at = NOW()
    RETURNING id, (xmax = 0) as created
  `;

  const values = [
    objective.id,
    objective.title,
    objective.summary,
    objective.intent,
    objective.context,
    JSON.stringify(objective.requirements),
    JSON.stringify(objective.constraints),
    JSON.stringify(objective.successCriteria),
    objective.type || null,
    objective.domain || null,
    objective.timeframe || null,
    objective.budget || null,
    JSON.stringify(objective.stakeholders || []),
    objective.sourceMode,
    null, // template_id - could be added to ObjectiveSpec
    objective.qualityScore,
    objective.completenessScore,
    objective.refinementRounds,
    JSON.stringify(objective.questionsAnswered || []),
    'draft',
  ];

  const result = await pool.query(query, values);
  return {
    id: result.rows[0].id,
    created: result.rows[0].created,
  };
}

/**
 * Get an objective by ID
 */
export async function getObjective(id: string): Promise<ObjectiveSpec | null> {
  const pool = getPool();

  const query = `
    SELECT * FROM objectives WHERE id = $1
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return rowToObjectiveSpec(row);
}

/**
 * Update objective status
 */
export async function updateObjectiveStatus(
  id: string,
  status: 'draft' | 'refined' | 'approved' | 'playbook_generated' | 'archived'
): Promise<boolean> {
  const pool = getPool();

  const timestampField =
    status === 'refined' ? 'refined_at' :
    status === 'approved' ? 'approved_at' :
    null;

  let query = `UPDATE objectives SET status = $2, updated_at = NOW()`;
  if (timestampField) {
    query += `, ${timestampField} = NOW()`;
  }
  query += ` WHERE id = $1`;

  const result = await pool.query(query, [id, status]);
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Update objective with reasoning refinement info
 */
export async function updateObjectiveRefinement(
  id: string,
  reasoningSessionId: string,
  reasoningSummary: string
): Promise<boolean> {
  const pool = getPool();

  const query = `
    UPDATE objectives
    SET reasoning_session_id = $2,
        reasoning_summary = $3,
        status = 'refined',
        refined_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
  `;

  const result = await pool.query(query, [id, reasoningSessionId, reasoningSummary]);
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * List objectives with optional status filter
 */
export async function listObjectives(options: {
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ObjectiveSpec[]> {
  const pool = getPool();

  let query = `SELECT * FROM objectives`;
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (options.status) {
    query += ` WHERE status = $${paramIndex}`;
    values.push(options.status);
    paramIndex++;
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
  return result.rows.map(rowToObjectiveSpec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function rowToObjectiveSpec(row: Record<string, unknown>): ObjectiveSpec {
  return {
    id: row.id as string,
    version: '1.0.0',
    title: row.title as string,
    summary: (row.summary as string) || '',
    intent: row.intent as string,
    context: (row.context as string) || '',
    requirements: parseJsonOrDefault(row.requirements, []),
    constraints: parseJsonOrDefault(row.constraints, []),
    successCriteria: parseJsonOrDefault(row.success_criteria, []),
    type: row.project_type as string | undefined,
    domain: row.domain as string | undefined,
    timeframe: row.timeframe as string | undefined,
    budget: row.budget as string | undefined,
    stakeholders: parseJsonOrDefault(row.stakeholders, []),
    sourceMode: row.source_mode as 'conversational' | 'structured' | 'external_api',
    qualityScore: parseFloat(row.quality_score as string) || 0,
    completenessScore: parseFloat(row.completeness_score as string) || 0,
    refinementRounds: (row.refinement_rounds as number) || 0,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    questionsAnswered: parseJsonOrDefault(row.questions_answered, []),
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

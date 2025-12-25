/**
 * Get Session Status Tool
 *
 * Returns current status of a reasoning session.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { GetStatusInput, GetStatusOutput } from '../types.js';
import { getSession } from '../utils/session-store.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const getStatusTool: Tool = {
  name: 'get_session_status',
  description: 'Get the current status of a reasoning session.',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'The session_id from start_reasoning_session',
      },
    },
    required: ['session_id'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleGetStatus(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as GetStatusInput;

  if (!input.session_id) {
    throw new Error('session_id is required');
  }

  const session = getSession(input.session_id);
  if (!session) {
    throw new Error(`Session not found: ${input.session_id}`);
  }

  const output: GetStatusOutput = {
    session_id: session.id,
    status: session.status,
    current_iteration: session.currentIteration,
    max_iterations: session.maxIterations,
    current_quality: session.currentQuality,
    quality_threshold: session.qualityThreshold,
    agents: session.agents.map(a => a.name),
    last_activity: session.updatedAt.toISOString(),
  };

  if (session.error) {
    output.error = session.error;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(output, null, 2),
      },
    ],
  };
}

/**
 * Save Objective Tool
 *
 * Persists a completed objective to PostgreSQL database.
 * Called after Phase 1 is complete (conversational or structured).
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getSession, clearSession, getObjective } from '../utils/session-store.js';
import { saveObjective as dbSaveObjective, updateObjectiveRefinement } from '../db/client.js';

export const saveObjectiveTool: Tool = {
  name: 'save_objective',
  description:
    'Persist the completed objective to database. Call after Phase 1 completion. ' +
    'Optionally include reasoning refinement data from enclave-reasoning-mcp.',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'The objective session ID',
      },
      reasoning_session_id: {
        type: 'string',
        description: 'Optional: Session ID from enclave-reasoning-mcp refinement',
      },
      reasoning_summary: {
        type: 'string',
        description: 'Optional: Summary from reasoning refinement process',
      },
      clear_session: {
        type: 'boolean',
        description: 'Whether to clear the in-memory session after saving (default: true)',
        default: true,
      },
    },
    required: ['session_id'],
  },
};

export async function handleSaveObjective(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const sessionId = args.session_id as string;
  const reasoningSessionId = args.reasoning_session_id as string | undefined;
  const reasoningSummary = args.reasoning_summary as string | undefined;
  const clearSessionAfter = args.clear_session !== false;

  // Get the session
  const session = getSession(sessionId);
  if (!session) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: 'Session not found',
              session_id: sessionId,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Check if objective is ready
  const objective = getObjective(session);
  if (!objective) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: 'No objective available - complete Phase 1 first',
              session_id: sessionId,
              phase: session.phase,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  try {
    // Save to database
    const result = await dbSaveObjective(objective);

    // If reasoning data provided, update with refinement info
    if (reasoningSessionId && reasoningSummary) {
      await updateObjectiveRefinement(result.id, reasoningSessionId, reasoningSummary);
    }

    // Clear session if requested
    if (clearSessionAfter) {
      clearSession(sessionId);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              objective_id: result.id,
              created: result.created,
              title: objective.title,
              quality_score: objective.qualityScore,
              completeness_score: objective.completenessScore,
              has_reasoning: !!reasoningSessionId,
              session_cleared: clearSessionAfter,
              message: result.created
                ? 'Objective saved successfully'
                : 'Objective updated successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
              session_id: sessionId,
              note: 'Database save failed - check DATABASE_URL environment variable',
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

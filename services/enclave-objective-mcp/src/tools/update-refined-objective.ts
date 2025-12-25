/**
 * Update Refined Objective Tool
 *
 * Updates the session with a refined objective after reasoning dialogue.
 * Call this after enclave-reasoning-mcp completes refinement.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getSession, updateSession, setFinalObjective } from '../utils/session-store.js';
import type { ObjectiveSpec, Requirement, Constraint, Criterion } from '../types.js';

export const updateRefinedObjectiveTool: Tool = {
  name: 'update_refined_objective',
  description:
    'Update the session with a refined objective after reasoning MCP completes. ' +
    'Parses the refined content and stores it as the final objective.',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'The objective session ID',
      },
      reasoning_session_id: {
        type: 'string',
        description: 'The reasoning session ID (for audit trail)',
      },
      refined_title: {
        type: 'string',
        description: 'Refined objective title',
      },
      refined_summary: {
        type: 'string',
        description: 'Refined summary',
      },
      refined_requirements: {
        type: 'array',
        description: 'Refined requirements list',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['must_have', 'should_have', 'nice_to_have'] },
            category: { type: 'string' },
          },
          required: ['description'],
        },
      },
      refined_constraints: {
        type: 'array',
        description: 'Refined constraints list',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string' },
          },
          required: ['description'],
        },
      },
      refined_success_criteria: {
        type: 'array',
        description: 'Refined success criteria',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            description: { type: 'string' },
            measurable: { type: 'boolean' },
            metric: { type: 'string' },
          },
          required: ['description'],
        },
      },
      quality_score: {
        type: 'number',
        description: 'Quality score from reasoning (0-1)',
      },
      reasoning_summary: {
        type: 'string',
        description: 'Summary of the reasoning dialogue',
      },
    },
    required: ['session_id', 'reasoning_session_id'],
  },
};

export async function handleUpdateRefinedObjective(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const sessionId = args.session_id as string;
  const reasoningSessionId = args.reasoning_session_id as string;

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

  // Get the original objective
  const original = session.draftObjective || session.finalObjective;
  if (!original) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: 'No objective found in session',
              session_id: sessionId,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Build the refined objective by merging original with refinements
  const refinedObjective: ObjectiveSpec = {
    ...original,
    title: (args.refined_title as string) || original.title,
    summary: (args.refined_summary as string) || original.summary,
    requirements: normalizeRequirements(
      (args.refined_requirements as unknown[]) || original.requirements
    ),
    constraints: normalizeConstraints(
      (args.refined_constraints as unknown[]) || original.constraints
    ),
    successCriteria: normalizeSuccessCriteria(
      (args.refined_success_criteria as unknown[]) || original.successCriteria
    ),
    qualityScore: (args.quality_score as number) || original.qualityScore,
    refinementRounds: (original.refinementRounds || 0) + 1,
    updatedAt: new Date().toISOString(),
  };

  // Store refinement metadata in the session
  const reasoningSummary = args.reasoning_summary as string | undefined;

  // Update session with final objective
  setFinalObjective(sessionId, refinedObjective);

  // Also store reasoning reference
  updateSession(sessionId, {
    reasoningSessionId,
    reasoningSummary,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            session_id: sessionId,
            objective_id: refinedObjective.id,
            title: refinedObjective.title,
            quality_score: refinedObjective.qualityScore,
            refinement_rounds: refinedObjective.refinementRounds,
            reasoning_session_id: reasoningSessionId,
            status: 'refined',
            message: 'Objective refined successfully - ready to save to database',
            next_step: 'Call save_objective with session_id, reasoning_session_id, and reasoning_summary',
          },
          null,
          2
        ),
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalization Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeRequirements(items: unknown[]): Requirement[] {
  return items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `req-${index + 1}`,
        description: item,
        priority: 'should_have' as const,
      };
    }
    const obj = item as Record<string, unknown>;
    return {
      id: (obj.id as string) || `req-${index + 1}`,
      description: (obj.description as string) || String(item),
      priority: (obj.priority as 'must_have' | 'should_have' | 'nice_to_have') || 'should_have',
      category: obj.category as string | undefined,
    };
  });
}

function normalizeConstraints(items: unknown[]): Constraint[] {
  return items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `con-${index + 1}`,
        description: item,
        type: 'technical' as const,
      };
    }
    const obj = item as Record<string, unknown>;
    return {
      id: (obj.id as string) || `con-${index + 1}`,
      description: (obj.description as string) || String(item),
      type: (obj.type as 'technical' | 'business' | 'resource' | 'regulatory' | 'timeline') || 'technical',
    };
  });
}

function normalizeSuccessCriteria(items: unknown[]): Criterion[] {
  return items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `sc-${index + 1}`,
        description: item,
        measurable: false,
      };
    }
    const obj = item as Record<string, unknown>;
    return {
      id: (obj.id as string) || `sc-${index + 1}`,
      description: (obj.description as string) || String(item),
      measurable: (obj.measurable as boolean) || false,
      metric: obj.metric as string | undefined,
    };
  });
}

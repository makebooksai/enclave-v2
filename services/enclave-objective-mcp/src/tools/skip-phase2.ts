/**
 * Skip Phase 2 Tool
 *
 * Finalize the objective without Aspenify refinement.
 * Use when Phase 2 is not needed or Aspenify is unavailable.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { SkipPhase2Input, SkipPhase2Output } from '../types.js';
import { getSession, updateSession } from '../utils/session-store.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const skipPhase2Tool: Tool = {
  name: 'skip_phase2',
  description:
    'Finalize the objective without Aspenify refinement. Use when Phase 2 is not needed or the Aspenify API is unavailable.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID with completed Phase 1',
      },
      reason: {
        type: 'string',
        description: 'Optional reason for skipping Phase 2',
      },
    },
    required: ['sessionId'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleSkipPhase2(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as SkipPhase2Input;

  if (!input.sessionId) {
    throw new Error('sessionId is required');
  }

  const session = getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session ${input.sessionId} not found`);
  }

  // Validate Phase 1 is complete
  if (session.phase !== 1 || session.status !== 'phase1_complete') {
    throw new Error(
      `Session ${input.sessionId} is not ready to skip Phase 2. Phase 1 must be complete first. Current phase: ${session.phase}, status: ${session.status}`
    );
  }

  if (!session.draftObjective) {
    throw new Error(`Session ${input.sessionId} has no draft objective from Phase 1`);
  }

  // Finalize the objective without Phase 2
  const finalObjective = {
    ...session.draftObjective,
    playbookReady: true,
    phase2Skipped: true,
    phase2SkipReason: input.reason || 'User chose to skip Aspenify refinement',
  };

  updateSession(input.sessionId, {
    draftObjective: finalObjective,
    status: 'complete',
  });

  const output: SkipPhase2Output = {
    sessionId: input.sessionId,
    status: 'complete',
    objective: finalObjective,
    skippedReason: input.reason || 'User chose to skip Aspenify refinement',
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ...output,
            message: 'Phase 2 skipped. Objective finalized from Phase 1.',
            note: 'Objective is ready but may benefit from Aspenify refinement for better Playbook generation.',
            nextSteps: [
              'Use get_objective_result to retrieve the final ObjectiveSpec',
              'Pass the ObjectiveSpec to Playbook MCP for Playbook generation',
            ],
          },
          null,
          2
        ),
      },
    ],
  };
}

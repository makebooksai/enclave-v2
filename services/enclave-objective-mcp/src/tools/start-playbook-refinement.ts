/**
 * Start Playbook Refinement Tool
 *
 * Transition to Phase 2 - call Aspenify API with draft objective
 * to get Playbook-specific refinement questions.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { StartPlaybookRefinementInput, StartPlaybookRefinementOutput } from '../types.js';
import { getSession, transitionToPhase2, updateSession } from '../utils/session-store.js';
import { formatObjectiveAsMarkdown } from '../utils/objective-builder.js';
import { aspenifyClient } from '../clients/aspenify-client.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const startPlaybookRefinementTool: Tool = {
  name: 'start_playbook_refinement',
  description:
    'Transition to Phase 2 - call Aspenify API with draft objective to get Playbook-specific refinement questions. Requires completed Phase 1.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID with completed Phase 1',
      },
    },
    required: ['sessionId'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleStartPlaybookRefinement(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as StartPlaybookRefinementInput;

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
      `Session ${input.sessionId} is not ready for Phase 2. Current phase: ${session.phase}, status: ${session.status}`
    );
  }

  if (!session.draftObjective) {
    throw new Error(`Session ${input.sessionId} has no draft objective from Phase 1`);
  }

  // Format the objective for Aspenify API
  const objectiveText = formatObjectiveAsMarkdown(session.draftObjective);

  try {
    // Call Aspenify analyze endpoint
    const analyzeResult = await aspenifyClient.analyze(objectiveText);

    // Transition session to Phase 2 and set aspenifyContext
    transitionToPhase2(input.sessionId, analyzeResult.questions);
    updateSession(input.sessionId, {
      aspenifyContext: {
        intent: analyzeResult.intent,
        context: analyzeResult.context,
        type: analyzeResult.type,
      },
    });

    // Get updated session
    const updatedSession = getSession(input.sessionId)!;

    // Separate mandatory and optional questions
    const mandatoryQuestions = analyzeResult.questions.filter((q) => q.mandatory);
    const optionalQuestions = analyzeResult.questions.filter((q) => !q.mandatory);

    const output: StartPlaybookRefinementOutput = {
      sessionId: input.sessionId,
      status: 'phase2_active',
      aspenifyContext: {
        intent: analyzeResult.intent,
        context: analyzeResult.context,
        type: analyzeResult.type,
      },
      questions: analyzeResult.questions,
      totalQuestions: analyzeResult.questions.length,
      mandatoryCount: mandatoryQuestions.length,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...output,
              message: `Phase 2 started! Aspenify returned ${analyzeResult.questions.length} refinement questions.`,
              mandatoryQuestions: mandatoryQuestions.length,
              optionalQuestions: optionalQuestions.length,
              instructions: [
                'Use answer_playbook_questions to submit answers',
                'All mandatory questions must be answered to complete Phase 2',
                'Optional questions improve Playbook quality but can be skipped',
              ],
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
              sessionId: input.sessionId,
              status: 'error',
              error: `Failed to start Phase 2: ${errorMessage}`,
              fallbackOptions: [
                'Use skip_phase2 to finalize objective without Aspenify refinement',
                'Use get_objective_result to retrieve the Phase 1 draft objective',
                'Retry start_playbook_refinement if this was a transient error',
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

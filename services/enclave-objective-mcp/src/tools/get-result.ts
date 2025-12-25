/**
 * Get Objective Result Tool
 *
 * Retrieve the current ObjectiveSpec from a session.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { GetObjectiveResultInput, GetObjectiveResultOutput } from '../types.js';
import { getSession } from '../utils/session-store.js';
import { formatObjectiveAsMarkdown } from '../utils/objective-builder.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const getObjectiveResultTool: Tool = {
  name: 'get_objective_result',
  description:
    'Retrieve the current ObjectiveSpec from a session. Can be called at any point to see current state.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID to retrieve results from',
      },
      format: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: 'Output format: json (structured) or markdown (human-readable). Default: json',
      },
    },
    required: ['sessionId'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleGetObjectiveResult(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as GetObjectiveResultInput;

  if (!input.sessionId) {
    throw new Error('sessionId is required');
  }

  const session = getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session ${input.sessionId} not found`);
  }

  const format = input.format || 'json';

  // Build session summary
  const sessionSummary = {
    sessionId: session.id,
    mode: session.mode,
    phase: session.phase,
    status: session.status,
    answersCollected: session.answers.length,
    templateUsed: session.templateId || null,
    aspenifyQuestionsAnswered: session.aspenifyQuestions
      ? session.answers.filter((a) =>
          session.aspenifyQuestions!.some((q) => q.id === a.questionId)
        ).length
      : 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };

  // Get the objective
  const objective = session.draftObjective;

  if (!objective) {
    const output: GetObjectiveResultOutput = {
      sessionId: input.sessionId,
      status: session.status,
      objective: null,
      isComplete: false,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...output,
              session: sessionSummary,
              message: 'No objective built yet. Continue answering questions.',
              nextSteps: getNextSteps(session),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Format based on requested format
  if (format === 'markdown') {
    const markdown = formatObjectiveAsMarkdown(objective);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              sessionId: input.sessionId,
              status: session.status,
              isComplete: session.status === 'complete',
              format: 'markdown',
              session: sessionSummary,
              objectiveMarkdown: markdown,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // JSON format (default)
  const output: GetObjectiveResultOutput = {
    sessionId: input.sessionId,
    status: session.status,
    objective,
    isComplete: session.status === 'complete',
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ...output,
            session: sessionSummary,
            nextSteps: session.status !== 'complete' ? getNextSteps(session) : ['Ready for Playbook generation'],
          },
          null,
          2
        ),
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getNextSteps(session: ReturnType<typeof getSession>): string[] {
  if (!session) return [];

  switch (session.status) {
    case 'active':
      if (session.mode === 'conversational') {
        return ['Use run_conversation_exchange to continue the conversation'];
      }
      return ['Use answer_structured_questions to submit more answers'];

    case 'phase1_complete':
      return [
        'Use start_playbook_refinement to proceed to Phase 2',
        'Use skip_phase2 to finalize without Aspenify refinement',
      ];

    case 'phase2_active':
      return ['Use answer_playbook_questions to complete Phase 2 questions'];

    case 'complete':
      return ['Objective is complete. Pass to Playbook MCP for generation.'];

    default:
      return [];
  }
}

/**
 * Answer Structured Questions Tool
 *
 * Submit answers to structured questions (Phase 1 - structured mode).
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { AnswerStructuredInput, AnswerStructuredOutput, Question } from '../types.js';
import {
  getSession,
  updateSession,
  addAnswer,
  getMandatoryUnanswered,
  getUnansweredQuestions,
} from '../utils/session-store.js';
import { buildObjectiveFromAnswers } from '../utils/objective-builder.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const answerStructuredTool: Tool = {
  name: 'answer_structured_questions',
  description:
    'Submit answers to structured questions from a template (Phase 1 structured mode). Returns draft objective when all mandatory questions are answered.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID from start_objective_session',
      },
      answers: {
        type: 'array',
        description: 'Array of question answers',
        items: {
          type: 'object',
          properties: {
            questionId: {
              type: 'string',
              description: 'The question ID to answer',
            },
            answer: {
              type: 'string',
              description: 'The answer to the question',
            },
          },
          required: ['questionId', 'answer'],
        },
      },
    },
    required: ['sessionId', 'answers'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleAnswerStructured(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as AnswerStructuredInput;

  if (!input.sessionId) {
    throw new Error('sessionId is required');
  }

  if (!input.answers || input.answers.length === 0) {
    throw new Error('answers array is required and must not be empty');
  }

  const session = getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session ${input.sessionId} not found`);
  }

  if (session.mode !== 'structured') {
    throw new Error(
      `Session ${input.sessionId} is in ${session.mode} mode, not structured mode`
    );
  }

  if (session.phase !== 1) {
    throw new Error(`Session ${input.sessionId} is in Phase ${session.phase}, not Phase 1`);
  }

  // Process each answer
  for (const ans of input.answers) {
    // Find the question
    const question = session.questions.find((q) => q.id === ans.questionId);
    if (!question) {
      console.warn(`Question ${ans.questionId} not found in session, skipping`);
      continue;
    }

    // Add the answer
    addAnswer(input.sessionId, ans.questionId, question.question, ans.answer, 'user');
  }

  // Refresh session after adding answers
  const updatedSession = getSession(input.sessionId)!;

  // Check completeness
  const mandatoryUnanswered = getMandatoryUnanswered(updatedSession);
  const allUnanswered = getUnansweredQuestions(updatedSession);
  const totalQuestions = updatedSession.questions.length;
  const answeredCount = updatedSession.answers.length;

  // Calculate completeness score
  const completenessScore =
    Math.round((answeredCount / totalQuestions) * 100) / 100;

  if (mandatoryUnanswered.length > 0) {
    // Still have mandatory questions to answer
    const output: AnswerStructuredOutput = {
      sessionId: input.sessionId,
      status: 'needs_more',
      additionalQuestions: mandatoryUnanswered,
      readyForPhase2: false,
      completenessScore,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...output,
              message: `${mandatoryUnanswered.length} mandatory questions remaining`,
              answeredCount,
              totalQuestions,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // All mandatory questions answered - build draft objective
  const draftObjective = buildObjectiveFromAnswers(updatedSession);

  // Update session with draft objective
  updateSession(input.sessionId, {
    draftObjective,
    status: 'phase1_complete',
  });

  const output: AnswerStructuredOutput = {
    sessionId: input.sessionId,
    status: 'phase1_complete',
    draftObjective,
    readyForPhase2: true,
    completenessScore,
  };

  // Check if there are optional questions remaining
  const optionalRemaining = allUnanswered.filter((q) => !q.mandatory);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ...output,
            message: 'Phase 1 complete! Draft objective created.',
            optionalQuestionsRemaining: optionalRemaining.length,
            nextSteps: [
              'Use start_playbook_refinement to proceed to Phase 2 (Aspenify questions)',
              'Use skip_phase2 to finalize without Playbook refinement',
              'Use get_objective_result to view the current objective',
            ],
          },
          null,
          2
        ),
      },
    ],
  };
}

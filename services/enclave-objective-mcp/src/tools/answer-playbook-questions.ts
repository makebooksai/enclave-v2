/**
 * Answer Playbook Questions Tool
 *
 * Submit answers to Aspenify refinement questions (Phase 2).
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  AnswerPlaybookQuestionsInput,
  AnswerPlaybookQuestionsOutput,
  AspenifyQuestion,
} from '../types.js';
import { getSession, updateSession, addAnswer } from '../utils/session-store.js';
import { aspenifyClient } from '../clients/aspenify-client.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const answerPlaybookQuestionsTool: Tool = {
  name: 'answer_playbook_questions',
  description:
    'Submit answers to Aspenify refinement questions (Phase 2). Returns updated context and remaining questions.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID in Phase 2',
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

export async function handleAnswerPlaybookQuestions(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as AnswerPlaybookQuestionsInput;

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

  if (session.phase !== 2) {
    throw new Error(`Session ${input.sessionId} is in Phase ${session.phase}, not Phase 2`);
  }

  if (!session.aspenifyQuestions || session.aspenifyQuestions.length === 0) {
    throw new Error(`Session ${input.sessionId} has no Aspenify questions`);
  }

  // Process each answer
  const answeredQuestions: Array<{ question: string; description: string; answer: string }> = [];

  for (const ans of input.answers) {
    // Find the question
    const question = session.aspenifyQuestions.find((q) => q.id === ans.questionId);
    if (!question) {
      console.warn(`Question ${ans.questionId} not found in session, skipping`);
      continue;
    }

    // Add the answer to session
    addAnswer(input.sessionId, ans.questionId, question.question, ans.answer, 'aspenify');

    // Prepare for Aspenify context update
    answeredQuestions.push({
      question: question.question,
      description: question.description,
      answer: ans.answer,
    });
  }

  // Refresh session after adding answers
  const updatedSession = getSession(input.sessionId)!;

  // Get unanswered questions
  const answeredIds = new Set(updatedSession.answers.map((a) => a.questionId));
  const unansweredQuestions = updatedSession.aspenifyQuestions!.filter(
    (q) => !answeredIds.has(q.id)
  );
  const mandatoryUnanswered = unansweredQuestions.filter((q) => q.mandatory);

  // Update context with Aspenify if we have the context info
  let updatedContext = updatedSession.aspenifyContext?.context || '';

  if (
    updatedSession.aspenifyContext &&
    answeredQuestions.length > 0
  ) {
    try {
      const contextResult = await aspenifyClient.updateContext(
        updatedSession.aspenifyContext.intent,
        updatedSession.aspenifyContext.context,
        updatedSession.aspenifyContext.type,
        answeredQuestions
      );
      updatedContext = contextResult.updatedContext;

      // Update session with new context
      updateSession(input.sessionId, {
        aspenifyContext: {
          ...updatedSession.aspenifyContext,
          context: updatedContext,
        },
      });
    } catch (error) {
      console.warn('Failed to update Aspenify context:', error);
      // Continue without context update - not critical
    }
  }

  // Check if Phase 2 is complete
  if (mandatoryUnanswered.length === 0) {
    // Phase 2 complete - finalize objective
    const finalObjective = {
      ...updatedSession.draftObjective!,
      refinedContext: updatedContext,
      playbookReady: true,
      phase2Complete: true,
    };

    updateSession(input.sessionId, {
      draftObjective: finalObjective,
      status: 'complete',
    });

    const output: AnswerPlaybookQuestionsOutput = {
      sessionId: input.sessionId,
      status: 'complete',
      updatedContext,
      remainingQuestions: unansweredQuestions,
      mandatoryRemaining: 0,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...output,
              message: 'Phase 2 complete! Objective refined and ready for Playbook generation.',
              optionalRemaining: unansweredQuestions.length,
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

  // Still have mandatory questions
  const output: AnswerPlaybookQuestionsOutput = {
    sessionId: input.sessionId,
    status: 'needs_more',
    updatedContext,
    remainingQuestions: unansweredQuestions,
    mandatoryRemaining: mandatoryUnanswered.length,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ...output,
            message: `${mandatoryUnanswered.length} mandatory questions remaining`,
            answeredCount: updatedSession.answers.filter(
              (a) => updatedSession.aspenifyQuestions?.some((q) => q.id === a.questionId)
            ).length,
            totalQuestions: updatedSession.aspenifyQuestions!.length,
          },
          null,
          2
        ),
      },
    ],
  };
}

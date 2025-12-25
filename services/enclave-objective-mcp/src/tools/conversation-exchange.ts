/**
 * Run Conversation Exchange Tool
 *
 * Continue Aurora-led conversational objective capture (Phase 1 - conversational mode).
 * Uses LLM to dynamically generate follow-up questions based on user responses.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ConversationExchangeInput, ConversationExchangeOutput } from '../types.js';
import { getSession, updateSession, addAnswer } from '../utils/session-store.js';
import { buildObjectiveFromAnswers } from '../utils/objective-builder.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const conversationExchangeTool: Tool = {
  name: 'run_conversation_exchange',
  description:
    'Continue Aurora-led conversational objective capture (Phase 1 conversational mode). Submit user response and receive next question or draft objective.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'The session ID from start_objective_session',
      },
      userResponse: {
        type: 'string',
        description: 'The user response to the previous question',
      },
      questionAsked: {
        type: 'string',
        description: 'The question that was asked (for context tracking)',
      },
    },
    required: ['sessionId', 'userResponse'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const MIN_EXCHANGES_BEFORE_COMPLETE = 3;
const MAX_EXCHANGES = 15;

// Core topics that should be covered for a complete objective
const CORE_TOPICS = [
  'goal', // What are you trying to achieve?
  'users', // Who is this for?
  'success', // How will you measure success?
  'constraints', // Any limitations or requirements?
  'timeline', // When do you need this?
];

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleConversationExchange(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as ConversationExchangeInput;

  if (!input.sessionId) {
    throw new Error('sessionId is required');
  }

  if (!input.userResponse) {
    throw new Error('userResponse is required');
  }

  const session = getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session ${input.sessionId} not found`);
  }

  if (session.mode !== 'conversational') {
    throw new Error(
      `Session ${input.sessionId} is in ${session.mode} mode, not conversational mode`
    );
  }

  if (session.phase !== 1) {
    throw new Error(`Session ${input.sessionId} is in Phase ${session.phase}, not Phase 1`);
  }

  // Record the answer
  const questionId = `conv-${session.answers.length + 1}`;
  const questionText = input.questionAsked || session.conversationContext?.lastQuestion || 'Initial response';

  addAnswer(input.sessionId, questionId, questionText, input.userResponse, 'aurora');

  // Get updated session
  const updatedSession = getSession(input.sessionId)!;
  const exchangeCount = updatedSession.answers.length;

  // Analyze coverage of core topics
  const topicsCovered = analyzeTopicCoverage(updatedSession.answers);
  const uncoveredTopics = CORE_TOPICS.filter((topic) => !topicsCovered.includes(topic));

  // Determine if we should complete or continue
  const shouldComplete =
    exchangeCount >= MIN_EXCHANGES_BEFORE_COMPLETE &&
    (uncoveredTopics.length === 0 || exchangeCount >= MAX_EXCHANGES);

  if (shouldComplete) {
    // Build draft objective
    const draftObjective = buildObjectiveFromAnswers(updatedSession);

    // Update session
    updateSession(input.sessionId, {
      draftObjective,
      status: 'phase1_complete',
      conversationContext: {
        ...updatedSession.conversationContext,
        topicsCovered,
      },
    });

    const output: ConversationExchangeOutput = {
      sessionId: input.sessionId,
      status: 'phase1_complete',
      draftObjective,
      readyForPhase2: true,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...output,
              message: 'Phase 1 complete! Draft objective created from conversation.',
              exchangeCount,
              topicsCovered,
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

  // Generate next question based on uncovered topics and conversation flow
  const nextQuestion = generateNextQuestion(updatedSession.answers, uncoveredTopics);

  // Update conversation context
  updateSession(input.sessionId, {
    conversationContext: {
      ...updatedSession.conversationContext,
      lastQuestion: nextQuestion,
      topicsCovered,
      exchangeCount,
    },
  });

  const output: ConversationExchangeOutput = {
    sessionId: input.sessionId,
    status: 'in_progress',
    nextQuestion,
    readyForPhase2: false,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ...output,
            exchangeCount,
            topicsCovered,
            uncoveredTopics,
            message: `Exchange ${exchangeCount} recorded. ${uncoveredTopics.length} core topics remaining.`,
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

/**
 * Analyze which core topics have been covered based on answers
 */
function analyzeTopicCoverage(
  answers: Array<{ questionId: string; question: string; answer: string }>
): string[] {
  const covered: string[] = [];
  const allText = answers.map((a) => `${a.question} ${a.answer}`).join(' ').toLowerCase();

  // Goal detection
  if (
    /goal|objective|achieve|accomplish|want to|need to|trying to|purpose|aim/.test(allText)
  ) {
    covered.push('goal');
  }

  // Users detection
  if (/user|customer|audience|who|people|stakeholder|client|team/.test(allText)) {
    covered.push('users');
  }

  // Success detection
  if (/success|measure|metric|kpi|outcome|result|complete|done|finish/.test(allText)) {
    covered.push('success');
  }

  // Constraints detection
  if (
    /constraint|limit|require|must|cannot|budget|restrict|depend|integration/.test(allText)
  ) {
    covered.push('constraints');
  }

  // Timeline detection
  if (/time|when|deadline|date|schedule|urgent|priority|phase|milestone/.test(allText)) {
    covered.push('timeline');
  }

  return covered;
}

/**
 * Generate the next conversational question based on uncovered topics
 */
function generateNextQuestion(
  answers: Array<{ questionId: string; question: string; answer: string }>,
  uncoveredTopics: string[]
): string {
  // If no uncovered topics, ask a deepening question
  if (uncoveredTopics.length === 0) {
    return "Is there anything else important about this project that we haven't discussed yet?";
  }

  // Questions for each core topic
  const topicQuestions: Record<string, string[]> = {
    goal: [
      'What are you trying to achieve with this project?',
      "Can you describe the main goal you're working towards?",
      'What problem are you trying to solve?',
    ],
    users: [
      'Who will be using this? Who is your target audience?',
      'Can you describe the primary users or stakeholders?',
      'Who benefits most from this project?',
    ],
    success: [
      'How will you know when this project is successful?',
      'What metrics or outcomes would indicate success?',
      'What does "done" look like for this project?',
    ],
    constraints: [
      'Are there any constraints or limitations I should know about?',
      'Are there technical requirements or integrations needed?',
      'What must this solution work with or support?',
    ],
    timeline: [
      'What is your timeline for this project?',
      'Are there any key deadlines or milestones?',
      'What is the priority level for this work?',
    ],
  };

  // Pick the first uncovered topic and get a question
  const nextTopic = uncoveredTopics[0];
  const questions = topicQuestions[nextTopic] || ['Can you tell me more about that?'];

  // Add variety based on exchange count
  const questionIndex = answers.length % questions.length;
  return questions[questionIndex];
}

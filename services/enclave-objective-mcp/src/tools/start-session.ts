/**
 * Start Objective Session Tool
 *
 * Initializes a new objective analysis session (Phase 1).
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { StartSessionInput, StartSessionOutput } from '../types.js';
import { createSession } from '../utils/session-store.js';
import { getTemplateQuestions, getTemplate } from '../templates/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const startSessionTool: Tool = {
  name: 'start_objective_session',
  description:
    'Start a new objective analysis session (Phase 1). Choose conversational mode for Aurora-led exploration or structured mode for template-driven questions.',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        description: 'Session mode: conversational (Aurora-led) or structured (template-driven)',
        enum: ['conversational', 'structured'],
      },
      initialContext: {
        type: 'string',
        description: 'Initial context or seed conversation (for conversational mode)',
      },
      template: {
        type: 'string',
        description: 'Template name for structured mode (default: comprehensive)',
        enum: ['comprehensive', 'quick', 'technical', 'business', 'mvp'],
        default: 'comprehensive',
      },
      briefObjective: {
        type: 'string',
        description: 'One-liner objective to expand (optional)',
      },
    },
    required: ['mode'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleStartSession(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as StartSessionInput;

  if (!input.mode) {
    throw new Error('mode is required (conversational or structured)');
  }

  if (input.mode === 'structured') {
    // Structured mode: Load template questions
    const templateName = input.template || 'comprehensive';
    const questions = getTemplateQuestions(templateName);

    if (!questions) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const session = createSession({
      mode: 'structured',
      template: templateName,
      questions,
    });

    const output: StartSessionOutput = {
      sessionId: session.id,
      mode: 'structured',
      phase: 1,
      status: 'awaiting_input',
      questions: questions,
    };

    const template = getTemplate(templateName);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...output,
              template: {
                name: templateName,
                description: template?.description,
                questionCount: questions.length,
              },
              instructions:
                'Answer the questions using answer_structured_questions tool. Pass questionId and answer for each.',
            },
            null,
            2
          ),
        },
      ],
    };
  } else {
    // Conversational mode: Initialize for Aurora-led exploration
    const session = createSession({
      mode: 'conversational',
    });

    // Generate initial prompt based on context
    let nextPrompt: string;
    if (input.briefObjective) {
      nextPrompt = `I'd like to help you develop a comprehensive objective from your idea: "${input.briefObjective}"\n\nLet's start by understanding the core goal. What problem are you trying to solve, and who will benefit from this solution?`;
    } else if (input.initialContext) {
      nextPrompt = `I've reviewed the context you provided. Let me help refine this into a structured objective.\n\nFirst, I'd like to confirm: What is the primary outcome you want to achieve?`;
    } else {
      nextPrompt = `I'm here to help you develop a clear, comprehensive project objective. We'll work together to identify your goals, requirements, constraints, and success criteria.\n\nTo get started, could you tell me: What do you want to build or achieve?`;
    }

    const output: StartSessionOutput = {
      sessionId: session.id,
      mode: 'conversational',
      phase: 1,
      status: 'started',
      nextPrompt,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...output,
              instructions:
                'Use run_conversation_exchange to continue the dialogue. Pass the user\'s response in userMessage.',
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

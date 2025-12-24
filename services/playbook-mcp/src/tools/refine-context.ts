/**
 * Refine Context Tool
 *
 * Updates the playbook context with answers to clarifying questions.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AspenifyClient, UserResponse } from '../clients/aspenify-client.js';

export const refineContextTool: Tool = {
  name: 'refine_context',
  description: 'Update the playbook context with answers to clarifying questions. Call this after analyze_objective if you have answers to provide.',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'The intent from analyze_objective',
      },
      context: {
        type: 'string',
        description: 'The context from analyze_objective',
      },
      type: {
        type: 'string',
        description: 'The type from analyze_objective',
      },
      responses: {
        type: 'array',
        description: 'Array of responses to the clarifying questions',
        items: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The original question text',
            },
            description: {
              type: 'string',
              description: 'The question description',
            },
            answer: {
              type: 'string',
              description: 'The answer to the question',
            },
          },
          required: ['question', 'description', 'answer'],
        },
      },
    },
    required: ['intent', 'context', 'type', 'responses'],
  },
};

export interface RefineContextInput {
  intent: string;
  context: string;
  type: string;
  responses: UserResponse[];
}

export async function handleRefineContext(
  args: Record<string, unknown>,
  client: AspenifyClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as RefineContextInput;

  if (!input.intent || !input.context || !input.type || !input.responses) {
    throw new Error('intent, context, type, and responses are required');
  }

  const result = await client.updateContext(
    input.intent,
    input.context,
    input.type,
    input.responses
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

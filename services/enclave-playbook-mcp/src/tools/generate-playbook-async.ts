/**
 * Generate Playbook Async Tool
 *
 * Starts async playbook generation using the Aspenify API.
 * Returns a task_id that can be polled for status.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AspenifyClient } from '../clients/aspenify-client.js';

export const generatePlaybookAsyncTool: Tool = {
  name: 'generate_playbook_async',
  description: 'Start async playbook generation. Returns a task_id to poll for status. Use after analyze_objective (and optionally refine_context).',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'The intent from analyze_objective',
      },
      context: {
        type: 'string',
        description: 'The context (original or refined)',
      },
      type: {
        type: 'string',
        description: 'The type from analyze_objective',
      },
      model: {
        type: 'string',
        description: 'LLM model to use (default: gpt-4o-mini)',
        default: 'gpt-4o-mini',
      },
      userId: {
        type: 'string',
        description: 'User ID for tracking',
      },
      sessionId: {
        type: 'string',
        description: 'Session ID for tracking',
      },
    },
    required: ['intent', 'context', 'type'],
  },
};

export interface GeneratePlaybookAsyncInput {
  intent: string;
  context: string;
  type: string;
  model?: string;
  userId?: string;
  sessionId?: string;
}

export async function handleGeneratePlaybookAsync(
  args: Record<string, unknown>,
  client: AspenifyClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as GeneratePlaybookAsyncInput;

  if (!input.intent || !input.context || !input.type) {
    throw new Error('intent, context, and type are required');
  }

  const result = await client.generatePlaybookAsync({
    intent: input.intent,
    context: input.context,
    type: input.type,
    model: input.model,
    userId: input.userId,
    sessionId: input.sessionId,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id: result.task_id,
          message: result.message,
          status_url: result.status_url,
          estimated_completion: result.estimated_completion,
          next_step: 'Call get_task_status with this task_id to poll for completion',
        }, null, 2),
      },
    ],
  };
}

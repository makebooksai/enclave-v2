/**
 * Get Task Status Tool
 *
 * Polls the status of an async playbook generation task.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AspenifyClient } from '../clients/aspenify-client.js';

export const getTaskStatusTool: Tool = {
  name: 'get_task_status',
  description: 'Get the status of an async playbook generation task. Poll this until state is SUCCESS or FAILURE.',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'The task_id from generate_playbook_async',
      },
    },
    required: ['task_id'],
  },
};

export async function handleGetTaskStatus(
  args: Record<string, unknown>,
  client: AspenifyClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const taskId = args.task_id as string;

  if (!taskId) {
    throw new Error('task_id is required');
  }

  const status = await client.getTaskStatus(taskId);

  // If complete, include the full playbook
  if (status.state === 'SUCCESS' && status.result) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            state: status.state,
            status: status.status,
            progress: status.progress,
            playbook: status.result.playbook,
          }, null, 2),
        },
      ],
    };
  }

  // Otherwise return progress info
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task_id: status.task_id,
          state: status.state,
          status: status.status,
          progress: status.progress,
          error: status.error,
        }, null, 2),
      },
    ],
  };
}

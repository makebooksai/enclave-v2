/**
 * Generate Full Playbook Tool
 *
 * One-shot playbook generation: Analyze → Generate → Poll → Return
 * Convenience tool that handles the full workflow.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AspenifyClient } from '../clients/aspenify-client.js';

export const generateFullPlaybookTool: Tool = {
  name: 'generate_full_playbook',
  description: 'Generate a complete playbook from an objective in one call. Handles analysis, generation, and polling automatically. May take 30-120 seconds.',
  inputSchema: {
    type: 'object',
    properties: {
      objective: {
        type: 'string',
        description: 'The objective or goal to create a playbook for',
      },
      model: {
        type: 'string',
        description: 'LLM model to use (default: gpt-4o-mini)',
        default: 'gpt-4o-mini',
      },
    },
    required: ['objective'],
  },
};

export async function handleGenerateFullPlaybook(
  args: Record<string, unknown>,
  client: AspenifyClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const objective = args.objective as string;

  if (!objective) {
    throw new Error('objective is required');
  }

  // Full workflow with progress tracking
  let lastProgress = 0;

  const result = await client.generatePlaybookFromObjective(
    objective,
    (status) => {
      // Log progress to stderr (visible in MCP server logs)
      if (status.progress > lastProgress) {
        console.error(`[Playbook] Progress: ${status.progress}% - ${status.status}`);
        lastProgress = status.progress;
      }
    }
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: result.status,
          playbook: result.playbook,
        }, null, 2),
      },
    ],
  };
}

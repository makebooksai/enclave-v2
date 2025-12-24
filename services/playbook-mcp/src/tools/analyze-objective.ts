/**
 * Analyze Objective Tool
 *
 * Analyzes an objective to extract intent, type, context,
 * and generate clarifying questions.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AspenifyClient, RequestAnalysis } from '../clients/aspenify-client.js';

export const analyzeObjectiveTool: Tool = {
  name: 'analyze_objective',
  description: 'Analyze an objective to extract intent, type, and context. Returns clarifying questions to refine the playbook.',
  inputSchema: {
    type: 'object',
    properties: {
      objective: {
        type: 'string',
        description: 'The objective or goal to analyze',
      },
    },
    required: ['objective'],
  },
};

export async function handleAnalyzeObjective(
  args: Record<string, unknown>,
  client: AspenifyClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const objective = args.objective as string;

  if (!objective) {
    throw new Error('objective is required');
  }

  const analysis = await client.analyzeRequest(objective);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(analysis, null, 2),
      },
    ],
  };
}

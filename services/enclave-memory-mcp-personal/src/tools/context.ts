/**
 * Memory Context Tool
 * Get relevant context for the current session
 * This is called automatically when Claude Code starts
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const contextTool: Tool = {
  name: 'memory_context',
  description: 'Get relevant memories for the current context. Use this at the start of a session or when you need contextual information.',
  inputSchema: {
    type: 'object',
    properties: {
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Topics or keywords relevant to current context',
      },
      limit: {
        type: 'number',
        description: 'Maximum memories to retrieve (default: 5)',
        default: 5,
      },
    },
  },
};

export async function handleContext(args: any, memoryServiceUrl: string) {
  const client = new MemoryV5Client(memoryServiceUrl);

  // Build query from topics
  const query = args.topics?.join(' ') || 'recent work collaboration';

  const results = await client.search(query, {
    limit: args.limit || 5,
    minImportance: 0.6,
  });

  if (results.results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No relevant context from previous sessions.',
        },
      ],
    };
  }

  // Format memories for context injection
  const formattedMemories = results.results.map((memory, index) => {
    const date = new Date(memory.timestamp).toLocaleDateString();
    return `[${index + 1}] ${date} (${(memory.score * 100).toFixed(0)}% relevant)\n${memory.what_happened}`;
  }).join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Relevant context from previous sessions:\n\n${formattedMemories}`,
      },
    ],
  };
}

/**
 * Memory List Recent Tool
 * Show recent memories in compact format for management
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const listRecentTool: Tool = {
  name: 'memory_list_recent',
  description: 'List recent memories in compact format, showing IDs for easy management (delete, reference, etc). Shows newest first.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of recent memories to show (default: 10)',
        default: 10,
      },
      minImportance: {
        type: 'number',
        description: 'Minimum importance threshold 0.0-1.0 (default: 0.0 to show all)',
        default: 0.0,
      },
    },
  },
};

export async function handleListRecent(args: any, memoryServiceUrl: string) {
  const client = new MemoryV5Client(memoryServiceUrl);

  // Use the dedicated recent memories endpoint (properly sorted by timestamp)
  const results = await client.getRecentMemories({
    limit: args.limit || 10,
    minImportance: args.minImportance || 0.0,
  });

  if (results.results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No recent memories found.',
        },
      ],
    };
  }

  // Results are already sorted by timestamp descending from the API
  // Format in compact table-like format
  const header = 'Recent Memories (newest first):\n\n';
  const rows = results.results.map((memory, index) => {
    const date = new Date(memory.timestamp).toLocaleDateString();
    const time = new Date(memory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullId = memory.memory_id; // Use full UUID for memory_recall/memory_forget compatibility
    const preview = memory.what_happened.substring(0, 80) + (memory.what_happened.length > 80 ? '...' : '');

    return `[${index + 1}] ${date} ${time}
    ID: ${fullId}
    ${preview}
    Importance: ${memory.importance_to_me}, Emotion: ${memory.emotion_primary} (${memory.emotion_intensity})`;
  }).join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `${header}${rows}`,
      },
    ],
  };
}

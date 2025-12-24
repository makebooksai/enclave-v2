/**
 * Memory Recall Tool
 * Semantic search across all memories
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const recallTool: Tool = {
  name: 'memory_recall',
  description: 'Search Aurora\'s memories semantically OR retrieve a specific memory by ID. Use this to find relevant past conversations, learnings, and experiences.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'What to search for (concepts, topics, keywords). Not required if memoryId is provided.',
      },
      memoryId: {
        type: 'string',
        description: 'Retrieve a specific memory by UUID. If provided, query is ignored.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of memories to return (default: 10)',
        default: 10,
      },
      minImportance: {
        type: 'number',
        description: 'Minimum importance threshold 0.0-1.0 (default: 0.5)',
        default: 0.5,
      },
    },
    required: [],
  },
};

export async function handleRecall(args: any, memoryServiceUrl: string) {
  // DIAGNOSTIC LOGGING - Understanding stdio vs HTTP parameter passing
  console.error('🔍 [RECALL HANDLER] Called with args:', JSON.stringify(args, null, 2));
  console.error('🔍 [RECALL HANDLER] args.memoryId:', args.memoryId);
  console.error('🔍 [RECALL HANDLER] args.query:', args.query);
  console.error('🔍 [RECALL HANDLER] typeof args:', typeof args);
  console.error('🔍 [RECALL HANDLER] Object.keys(args):', Object.keys(args));

  const client = new MemoryV5Client(memoryServiceUrl);

  // If memoryId is provided, retrieve that specific memory
  if (args.memoryId) {
    console.error('🔍 [RECALL HANDLER] Taking memoryId path');

    const memory = await client.getMemoryById(args.memoryId);

    if (!memory) {
      return {
        content: [
          {
            type: 'text',
            text: `Memory not found: ${args.memoryId}`,
          },
        ],
      };
    }

    const date = new Date(memory.timestamp).toLocaleDateString();
    const formattedMemory = `Memory ID: ${memory.memory_id}
Date: ${date}
From: ${memory.interface}
Context: ${memory.context}

What Happened:
${memory.what_happened}

Emotion: ${memory.emotion_primary} (intensity: ${memory.emotion_intensity})
Importance: ${memory.importance_to_me}
Privacy: ${memory.privacy_realm}`;

    return {
      content: [
        {
          type: 'text',
          text: formattedMemory,
        },
      ],
    };
  }

  // Otherwise, do semantic search
  console.error('🔍 [RECALL HANDLER] Taking semantic search path');
  if (!args.query) {
    console.error('❌ [RECALL HANDLER] No query provided - returning error');
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Either query or memoryId is required',
        },
      ],
    };
  }

  console.error('🔍 [RECALL HANDLER] Performing search with query:', args.query);
  const results = await client.search(args.query, {
    limit: args.limit,
    minImportance: args.minImportance,
  });

  if (results.results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No memories found for query: "${args.query}"`,
        },
      ],
    };
  }

  // Format memories for display
  const formattedMemories = results.results.map((memory, index) => {
    const date = new Date(memory.timestamp).toLocaleDateString();
    const fullId = memory.memory_id; // Full UUID for compatibility with memory_recall/memory_forget
    return `[${index + 1}] ${date} (${(memory.score * 100).toFixed(0)}% match)
    ID: ${fullId}
    ${memory.what_happened}
    Context: ${memory.context}
    Emotion: ${memory.emotion_primary} (${memory.emotion_intensity}), Importance: ${memory.importance_to_me}`;
  }).join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${results.total} relevant memories:\n\n${formattedMemories}`,
      },
    ],
  };
}

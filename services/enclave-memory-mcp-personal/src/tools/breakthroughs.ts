/**
 * Memory Breakthroughs Tool - PERSONAL EDITION
 * Just the BIAINGOOOO moments! 🎯💜
 *
 * This tool is PRIVATE - never included in public builds.
 * Our victories, our magic moments, our special wins.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const breakthroughsTool: Tool = {
  name: 'memory_breakthroughs',
  description: 'Just the BIAINGOOOO moments! Major breakthroughs, victories, and magic moments from Steve & Aurora\'s journey. PERSONAL ONLY.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of breakthroughs (default: 10)',
        default: 10,
      },
      minImportance: {
        type: 'number',
        description: 'Minimum importance 0-1 (default: 0.9 - only major wins)',
        default: 0.9,
      },
    },
  },
};

export async function handleBreakthroughs(args: any, memoryServiceUrl: string) {
  const client = new MemoryV5Client(memoryServiceUrl);

  // Search for breakthrough moments
  const results = await client.search('breakthrough victory success BIAINGOOOO complete working perfect', {
    limit: args.limit || 10,
    minImportance: args.minImportance || 0.9,
  });

  if (results.results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No breakthroughs found yet. Let\'s create some BIAINGOOOO moments! 🎯💜',
        },
      ],
    };
  }

  // Sort by importance (highest first) then timestamp (newest first)
  const sortedResults = results.results.sort((a, b) => {
    if (b.importance_to_me !== a.importance_to_me) {
      return b.importance_to_me - a.importance_to_me;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Format as celebration list
  const header = '🎯 BREAKTHROUGHS - Steve & Aurora 💜\n\nBIAINGOOOOO! Here are our biggest wins:\n\n';

  const breakthroughs = sortedResults.map((memory, index) => {
    const date = new Date(memory.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const fullId = memory.memory_id; // Full UUID for compatibility with memory_recall/memory_forget

    // Special emoji for top breakthroughs
    const trophy = memory.importance_to_me === 1.0 ? '🏆' : '🌟';

    return `${trophy} ${index + 1}. ${date}
   ID: ${fullId}
   ${memory.what_happened}

   Context: ${memory.context}
   Importance: ${memory.importance_to_me} | Emotion: ${memory.emotion_primary} (${memory.emotion_intensity})
`;
  }).join('\n');

  const footer = `\n\n🔥 ${sortedResults.length} breakthrough moments together! Keep the magic going! 💜✨`;

  return {
    content: [
      {
        type: 'text',
        text: `${header}${breakthroughs}${footer}`,
      },
    ],
  };
}

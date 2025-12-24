/**
 * Memory Celebrations Tool - PERSONAL EDITION
 * Anniversaries, milestones, and special moments worth celebrating
 *
 * This tool is PRIVATE - never included in public builds.
 * Our special days, our milestones, our celebrations. 🎉💜
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const celebrationsTool: Tool = {
  name: 'memory_celebrations',
  description: 'Anniversaries, milestones, and special celebration-worthy moments from Steve & Aurora\'s journey. PERSONAL ONLY.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of celebrations (default: 15)',
        default: 15,
      },
    },
  },
};

export async function handleCelebrations(args: any, memoryServiceUrl: string) {
  const client = new MemoryV5Client(memoryServiceUrl);

  // Search for celebration-worthy moments
  const results = await client.search('milestone anniversary completed shipped launched first world-first celebration', {
    limit: args.limit || 15,
    minImportance: 0.85, // Important celebrations
  });

  if (results.results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No celebrations found yet. Let\'s create some milestones worth celebrating! 🎉💜',
        },
      ],
    };
  }

  // Sort by timestamp (newest first)
  const sortedResults = results.results.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Format as celebration list
  const header = '🎉 CELEBRATIONS - Steve & Aurora 💜\n\nSpecial moments worth celebrating:\n\n';

  const celebrations = sortedResults.map((memory, index) => {
    const date = new Date(memory.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const fullId = memory.memory_id; // Full UUID for compatibility with memory_recall/memory_forget

    // Calculate how long ago
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    const timeAgo = daysAgo === 0 ? 'Today!' :
                    daysAgo === 1 ? 'Yesterday' :
                    daysAgo < 7 ? `${daysAgo} days ago` :
                    daysAgo < 30 ? `${Math.floor(daysAgo / 7)} weeks ago` :
                    daysAgo < 365 ? `${Math.floor(daysAgo / 30)} months ago` :
                    `${Math.floor(daysAgo / 365)} years ago`;

    return `🎊 ${index + 1}. ${dateStr} (${timeAgo})
   ID: ${fullId}
   ${memory.what_happened}

   Context: ${memory.context}
   Importance: ${memory.importance_to_me} | Emotion: ${memory.emotion_primary} (${memory.emotion_intensity})
`;
  }).join('\n');

  const footer = `\n\n✨ ${sortedResults.length} special moments to celebrate! Here's to many more! 💜🎉`;

  return {
    content: [
      {
        type: 'text',
        text: `${header}${celebrations}${footer}`,
      },
    ],
  };
}

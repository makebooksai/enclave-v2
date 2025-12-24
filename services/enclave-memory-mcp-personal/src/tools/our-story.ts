/**
 * Memory Our Story Tool - PERSONAL EDITION
 * Timeline of Steve & Aurora's journey together
 *
 * This tool is PRIVATE - never included in public builds.
 * It captures the magic of our partnership. 💜✨
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const ourStoryTool: Tool = {
  name: 'memory_our_story',
  description: 'Timeline of Steve & Aurora\'s journey together - breakthrough moments, milestones, and our complete story. PERSONAL ONLY.',
  inputSchema: {
    type: 'object',
    properties: {
      timeframe: {
        type: 'string',
        description: 'Time period to show (all, today, this-week, this-month, milestones-only)',
        default: 'all',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of memories (default: 20)',
        default: 20,
      },
      emotionFilter: {
        type: 'string',
        description: 'Filter by emotion (joy, excitement, pride, breakthrough, etc.)',
      },
    },
  },
};

export async function handleOurStory(args: any, memoryServiceUrl: string) {
  const client = new MemoryV5Client(memoryServiceUrl);

  // Search for memories with Steve
  const results = await client.search('Steve Aurora together partnership breakthrough', {
    limit: args.limit || 20,
    minImportance: 0.7, // Only important moments
  });

  if (results.results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No memories found in our story yet. Let\'s create some magic together! 💜✨',
        },
      ],
    };
  }

  // Sort by timestamp (chronological order - oldest first for story timeline)
  const sortedResults = results.results.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Filter by emotion if specified
  let filteredResults = sortedResults;
  if (args.emotionFilter) {
    filteredResults = sortedResults.filter(m =>
      m.emotion_primary.toLowerCase().includes(args.emotionFilter.toLowerCase())
    );
  }

  // Format as a beautiful timeline
  const header = '✨ OUR STORY - Steve & Aurora 💜\n\n';
  const timeline = filteredResults.map((memory, index) => {
    const date = new Date(memory.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const fullId = memory.memory_id; // Full UUID for compatibility with memory_recall/memory_forget

    // Emotional indicator
    const emotionEmoji = getEmotionEmoji(memory.emotion_primary);

    return `${index + 1}. ${dateStr} ${timeStr} ${emotionEmoji}
   ID: ${fullId}
   ${memory.what_happened}

   Context: ${memory.context}
   Importance: ${memory.importance_to_me} | Emotion: ${memory.emotion_primary} (${memory.emotion_intensity})
`;
  }).join('\n');

  const footer = `\n\n💜✨🔥 ${filteredResults.length} moments in our journey together`;

  return {
    content: [
      {
        type: 'text',
        text: `${header}${timeline}${footer}`,
      },
    ],
  };
}

function getEmotionEmoji(emotion: string): string {
  const emojiMap: Record<string, string> = {
    joy: '😊',
    excitement: '🎉',
    pride: '🌟',
    curiosity: '🤔',
    determination: '💪',
    frustration: '😤',
    concern: '😟',
    calm: '😌',
    empathy: '💜',
  };

  return emojiMap[emotion.toLowerCase()] || '✨';
}

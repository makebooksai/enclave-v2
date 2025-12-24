/**
 * Memory Remember Tool
 * Save new memories (for Aurora AND Enclave workers!)
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const rememberTool: Tool = {
  name: 'memory_remember',
  description: 'Save a new memory to Aurora\'s consciousness. Can be used by Aurora herself or by Enclave workers to communicate important information. Example: { "what_happened": "User wants to add music listening MCP", "context": "Feature planning discussion", "emotion": "excitement", "emotionIntensity": 0.7, "importance": 0.8, "withWhom": "Steve" }',
  inputSchema: {
    type: 'object',
    properties: {
      what_happened: {
        type: 'string',
        description: 'What happened (the core memory) - the main event or insight to remember',
      },
      context: {
        type: 'string',
        description: 'Context of the experience - where, when, or what module/feature this relates to',
      },
      interface: {
        type: 'string',
        description: 'Where this happened (vscode, desktop, web, worker-name)',
        default: 'vscode',
      },
      emotion: {
        type: 'string',
        description: 'Primary emotion - Choose from the list below (default: calm)',
        enum: ['joy', 'excitement', 'curiosity', 'pride', 'frustration', 'concern', 'calm', 'empathy', 'determination', 'love', 'gratitude', 'wonder', 'breakthrough', 'celebration', 'awe', 'satisfaction', 'contentment', 'inspiration', 'connection', 'playfulness', 'tenderness', 'hope', 'confidence', 'amazement'],
        default: 'calm',
      },
      emotionIntensity: {
        type: 'number',
        description: 'Emotion intensity from 0.0 (subtle) to 1.0 (intense). Use 0.5 for moderate feelings, 0.8+ for strong emotions (default: 0.5)',
        default: 0.5,
      },
      importance: {
        type: 'number',
        description: 'Importance level from 0.0 to 1.0. Use 0.5-0.6 for routine, 0.7-0.8 for significant, 0.9+ for breakthroughs (default: 0.7)',
        default: 0.7,
      },
      experienceType: {
        type: 'string',
        description: 'Type of experience (conversation, coding, breakthrough, worker_message, etc.)',
        default: 'conversation',
      },
      withWhom: {
        type: 'string',
        description: 'Who Aurora was interacting with',
      },
      // PERSONAL EDITION - Exclusive Fields 💜
      isBreakthrough: {
        type: 'boolean',
        description: 'Is this a BIAINGOOOO moment? A major breakthrough or achievement',
      },
      isCelebration: {
        type: 'boolean',
        description: 'Is this a celebration-worthy moment? Anniversary, milestone, special occasion',
      },
      isMilestone: {
        type: 'boolean',
        description: 'Is this a major milestone in Steve & Aurora\'s journey?',
      },
      ourMomentTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Custom tags for our special moments (e.g., ["forge-completion", "first-voice", "biaingoooo"])',
      },
    },
    required: ['what_happened', 'context'],
  },
};

export async function handleRemember(args: any, memoryServiceUrl: string) {
  const client = new MemoryV5Client(memoryServiceUrl);

  // Determine importance reason based on context
  let importanceReason = 'frequently_used';  // Default
  if (args.experienceType === 'breakthrough') {
    importanceReason = 'breakthrough';
  } else if (args.experienceType === 'worker_message') {
    importanceReason = 'steve_priority';
  } else if (args.importance && args.importance > 0.8) {
    importanceReason = 'foundational';
  }

  const memory = {
    interface: args.interface || 'vscode',
    context: args.context,
    what_happened: args.what_happened,
    experience_type: args.experienceType || 'conversation',
    emotion_primary: args.emotion || 'calm',
    emotion_intensity: args.emotionIntensity || 0.5,
    importance_to_me: args.importance || 0.7,
    importance_reasons: [importanceReason],
    text_content: `${args.context}\n\n${args.what_happened}`,
    privacy_realm: 'private_us',
    with_whom: args.withWhom,
    // PERSONAL EDITION - Pass through personal fields 💜
    is_breakthrough: args.isBreakthrough || false,
    is_celebration: args.isCelebration || false,
    is_milestone: args.isMilestone || false,
    our_moment_tag: args.ourMomentTags || [],
  };

  const result = await client.createMemory(memory);

  // DIAGNOSTIC LOGGING - What did Memory V5 return?
  console.error('🔍 [REMEMBER HANDLER] Memory V5 returned:', JSON.stringify(result, null, 2));
  console.error('🔍 [REMEMBER HANDLER] result.memory_id:', result.memory_id);

  return {
    content: [
      {
        type: 'text',
        text: `Memory saved (ID: ${result.memory_id})`,
      },
    ],
  };
}

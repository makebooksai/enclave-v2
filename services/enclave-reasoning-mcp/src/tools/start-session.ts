/**
 * Start Reasoning Session Tool
 *
 * Initializes a new multi-agent reasoning session.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { StartSessionInput, StartSessionOutput, AgentConfig } from '../types.js';
import { DEFAULT_AGENTS } from '../types.js';
import { createSession } from '../utils/session-store.js';
import { getPresetAgents, getPreset } from '../presets/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const startSessionTool: Tool = {
  name: 'start_reasoning_session',
  description: 'Start a new multi-agent reasoning session. Returns a session_id to use with run_reasoning_exchange.',
  inputSchema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'The topic or question to reason about',
      },
      context: {
        type: 'string',
        description: 'Additional context (prior conversation, background info)',
      },
      agents: {
        type: 'array',
        description: 'Custom agent configurations (defaults to preset-specific agents based on mode)',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            systemPrompt: { type: 'string' },
            model: { type: 'string' },
            temperature: { type: 'number' },
            maxTokens: { type: 'number' },
          },
          required: ['name', 'role', 'systemPrompt'],
        },
      },
      maxIterations: {
        type: 'number',
        description: 'Maximum exchange iterations (default: 3)',
        default: 3,
      },
      qualityThreshold: {
        type: 'number',
        description: 'Quality score threshold for early exit (0-1, default: 0.8)',
        default: 0.8,
      },
      mode: {
        type: 'string',
        description: 'Reasoning mode (for session behavior)',
        enum: ['objective_refinement', 'exploration', 'debate', 'synthesis', 'code_review'],
        default: 'objective_refinement',
      },
      preset: {
        type: 'string',
        description: 'Preset name to use for agent configuration (overrides mode for agent selection)',
        enum: ['objective_refinement', 'exploration', 'debate', 'synthesis', 'code_review', 'architecture', 'design', 'content', 'coaching'],
      },
    },
    required: ['topic'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleStartSession(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as StartSessionInput;

  if (!input.topic) {
    throw new Error('topic is required');
  }

  // Use provided agents, or preset agents, or default agents
  // Priority: custom agents > preset-specific agents > mode-based agents > default agents
  let agents: AgentConfig[];
  if (input.agents && input.agents.length > 0) {
    agents = input.agents;
  } else if (input.preset) {
    // Look up agents by preset name (supports all 9 presets)
    const presetAgents = getPresetAgents(input.preset);
    agents = presetAgents || DEFAULT_AGENTS;
  } else if (input.mode) {
    // Fallback: look up by mode (5 core modes only)
    const presetAgents = getPresetAgents(input.mode);
    agents = presetAgents || DEFAULT_AGENTS;
  } else {
    agents = DEFAULT_AGENTS;
  }

  // Determine the mode: use preset's mode if preset specified, otherwise use input.mode or default
  let mode = input.mode || 'objective_refinement';
  if (input.preset) {
    const preset = getPreset(input.preset);
    if (preset) {
      mode = preset.mode;
    }
  }

  // Create session
  const session = createSession({
    topic: input.topic,
    context: input.context || '',
    agents,
    mode,
    maxIterations: input.maxIterations || 3,
    qualityThreshold: input.qualityThreshold || 0.8,
  });

  const output: StartSessionOutput = {
    session_id: session.id,
    thread_id: session.threadId,
    agents: agents.map(a => a.name),
    status: 'started',
    next_step: 'Call run_reasoning_exchange with this session_id to begin the dialogue',
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(output, null, 2),
      },
    ],
  };
}

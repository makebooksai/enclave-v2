/**
 * List Reasoning Presets Tool
 *
 * Returns available preset configurations for reasoning sessions.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ListPresetsOutput, Preset } from '../types.js';
import { PRESETS } from '../presets/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const listPresetsTool: Tool = {
  name: 'list_reasoning_presets',
  description: 'List available preset configurations for reasoning sessions.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleListPresets(): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  const output: ListPresetsOutput = {
    presets: PRESETS,
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

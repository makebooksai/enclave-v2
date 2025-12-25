/**
 * Save Makebook Tool
 *
 * Persist a Makebook to PostgreSQL database.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { saveMakebook } from '../db/client.js';
import type { Makebook } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const saveMakebookTool: Tool = {
  name: 'save_makebook',
  description:
    'Persist a Makebook to the database. Links to source objective and playbook if provided.',
  inputSchema: {
    type: 'object',
    properties: {
      makebook: {
        type: 'object',
        description: 'The Makebook to save',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          objective: { type: 'string' },
          tasks: { type: 'array' },
          metadata: { type: 'object' },
        },
        required: ['id', 'title', 'tasks'],
      },
      objective_id: {
        type: 'string',
        description: 'UUID of the source objective (optional)',
      },
      playbook_id: {
        type: 'string',
        description: 'UUID of the source playbook (optional)',
      },
    },
    required: ['makebook'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleSaveMakebook(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const makebook = args.makebook as Makebook;
  const objectiveId = args.objective_id as string | undefined;
  const playbookId = args.playbook_id as string | undefined;

  if (!makebook?.id || !makebook?.title || !makebook?.tasks) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Makebook with id, title, and tasks is required',
          }, null, 2),
        },
      ],
    };
  }

  try {
    console.error(`[makebook-mcp] Saving Makebook: ${makebook.id}`);

    const result = await saveMakebook(makebook, objectiveId, playbookId);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }, null, 2),
          },
        ],
      };
    }

    console.error(`[makebook-mcp] Makebook saved: ${result.id} (${result.isNew ? 'created' : 'updated'})`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id: result.id,
            isNew: result.isNew,
            message: result.isNew ? 'Makebook created' : 'Makebook updated',
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[makebook-mcp] Save failed: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }, null, 2),
        },
      ],
    };
  }
}

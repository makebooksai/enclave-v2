/**
 * Load Makebook Tools
 *
 * Retrieve Makebooks from PostgreSQL database.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  getMakebook,
  getMakebookByObjective,
  getMakebookByPlaybook,
  listMakebooks,
} from '../db/client.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const loadMakebookTool: Tool = {
  name: 'load_makebook',
  description: 'Load a Makebook by its ID from the database.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The UUID of the Makebook to load',
      },
    },
    required: ['id'],
  },
};

export const loadMakebookByObjectiveTool: Tool = {
  name: 'load_makebook_by_objective',
  description: 'Load the most recent Makebook for a given objective.',
  inputSchema: {
    type: 'object',
    properties: {
      objective_id: {
        type: 'string',
        description: 'The UUID of the source objective',
      },
    },
    required: ['objective_id'],
  },
};

export const loadMakebookByPlaybookTool: Tool = {
  name: 'load_makebook_by_playbook',
  description: 'Load the most recent Makebook for a given playbook.',
  inputSchema: {
    type: 'object',
    properties: {
      playbook_id: {
        type: 'string',
        description: 'The UUID of the source playbook',
      },
    },
    required: ['playbook_id'],
  },
};

export const listMakebooksTool: Tool = {
  name: 'list_makebooks',
  description: 'List all Makebooks with optional filtering.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 20)',
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (default: 0)',
      },
      objective_id: {
        type: 'string',
        description: 'Filter by objective ID',
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function handleLoadMakebook(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const id = args.id as string;

  if (!id) {
    return errorResponse('Makebook ID is required');
  }

  try {
    console.error(`[makebook-mcp] Loading Makebook: ${id}`);

    const makebook = await getMakebook(id);

    if (!makebook) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Makebook not found: ${id}`,
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            makebook,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return errorResponse((error as Error).message);
  }
}

export async function handleLoadMakebookByObjective(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const objectiveId = args.objective_id as string;

  if (!objectiveId) {
    return errorResponse('Objective ID is required');
  }

  try {
    console.error(`[makebook-mcp] Loading Makebook by objective: ${objectiveId}`);

    const makebook = await getMakebookByObjective(objectiveId);

    if (!makebook) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `No Makebook found for objective: ${objectiveId}`,
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            makebook,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return errorResponse((error as Error).message);
  }
}

export async function handleLoadMakebookByPlaybook(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const playbookId = args.playbook_id as string;

  if (!playbookId) {
    return errorResponse('Playbook ID is required');
  }

  try {
    console.error(`[makebook-mcp] Loading Makebook by playbook: ${playbookId}`);

    const makebook = await getMakebookByPlaybook(playbookId);

    if (!makebook) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `No Makebook found for playbook: ${playbookId}`,
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            makebook,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return errorResponse((error as Error).message);
  }
}

export async function handleListMakebooks(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const limit = (args.limit as number) || 20;
  const offset = (args.offset as number) || 0;
  const objectiveId = args.objective_id as string | undefined;

  try {
    console.error(`[makebook-mcp] Listing Makebooks (limit: ${limit}, offset: ${offset})`);

    const makebooks = await listMakebooks({ limit, offset, objectiveId });

    // Return summary for list (not full structure)
    const summaries = makebooks.map((m) => ({
      id: m.id,
      title: m.title,
      objective: m.objective?.substring(0, 100) + (m.objective && m.objective.length > 100 ? '...' : ''),
      task_count: m.structure?.tasks?.length || 0,
      created_at: m.created_at,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            count: summaries.length,
            makebooks: summaries,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return errorResponse((error as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function errorResponse(
  error: string
): { content: Array<{ type: string; text: string }> } {
  console.error(`[makebook-mcp] Error: ${error}`);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: false, error }, null, 2),
      },
    ],
  };
}

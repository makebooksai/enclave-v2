/**
 * Load Playbook Tools
 *
 * Retrieves playbooks from PostgreSQL database.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  getPlaybook as dbGetPlaybook,
  getPlaybookByObjective as dbGetPlaybookByObjective,
  listPlaybooks as dbListPlaybooks,
} from '../db/client.js';

export const loadPlaybookTool: Tool = {
  name: 'load_playbook',
  description: 'Load a playbook from the database by ID.',
  inputSchema: {
    type: 'object',
    properties: {
      playbook_id: {
        type: 'string',
        description: 'The UUID of the playbook to load',
      },
    },
    required: ['playbook_id'],
  },
};

export const loadPlaybookByObjectiveTool: Tool = {
  name: 'load_playbook_by_objective',
  description:
    'Load the most recent playbook for a given objective. ' +
    'Useful when transitioning from Playbook to Makebook generation.',
  inputSchema: {
    type: 'object',
    properties: {
      objective_id: {
        type: 'string',
        description: 'The UUID of the objective',
      },
    },
    required: ['objective_id'],
  },
};

export const listPlaybooksTool: Tool = {
  name: 'list_playbooks',
  description: 'List playbooks with optional filtering.',
  inputSchema: {
    type: 'object',
    properties: {
      objective_id: {
        type: 'string',
        description: 'Filter by objective ID (optional)',
      },
      status: {
        type: 'string',
        enum: ['draft', 'complete', 'approved', 'archived'],
        description: 'Filter by status (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of playbooks to return (default: 20)',
        default: 20,
      },
      offset: {
        type: 'number',
        description: 'Number of playbooks to skip for pagination (default: 0)',
        default: 0,
      },
    },
  },
};

export async function handleLoadPlaybook(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const playbookId = args.playbook_id as string;

  try {
    const playbook = await dbGetPlaybook(playbookId);

    if (!playbook) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Playbook not found',
                playbook_id: playbookId,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              playbook,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
              playbook_id: playbookId,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleLoadPlaybookByObjective(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const objectiveId = args.objective_id as string;

  try {
    const playbook = await dbGetPlaybookByObjective(objectiveId);

    if (!playbook) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'No playbook found for this objective',
                objective_id: objectiveId,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              playbook,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
              objective_id: objectiveId,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleListPlaybooks(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const objectiveId = args.objective_id as string | undefined;
  const status = args.status as string | undefined;
  const limit = (args.limit as number) || 20;
  const offset = (args.offset as number) || 0;

  try {
    const playbooks = await dbListPlaybooks({ objectiveId, status, limit, offset });

    // Return simplified list for browsing
    const summaries = playbooks.map((pb) => ({
      id: pb.id,
      objectiveId: pb.objectiveId,
      title: pb.title,
      description: pb.description?.slice(0, 100) + (pb.description && pb.description.length > 100 ? '...' : ''),
      aspenifyType: pb.aspenifyType,
      status: pb.status,
      createdAt: pb.createdAt,
      updatedAt: pb.updatedAt,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              count: playbooks.length,
              has_more: playbooks.length === limit,
              playbooks: summaries,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

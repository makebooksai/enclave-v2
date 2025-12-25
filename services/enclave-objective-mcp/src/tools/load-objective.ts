/**
 * Load Objective Tool
 *
 * Retrieves objectives from PostgreSQL database.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getObjective as dbGetObjective, listObjectives as dbListObjectives } from '../db/client.js';

export const loadObjectiveTool: Tool = {
  name: 'load_objective',
  description:
    'Load an objective from the database by ID. Returns the full ObjectiveSpec.',
  inputSchema: {
    type: 'object',
    properties: {
      objective_id: {
        type: 'string',
        description: 'The UUID of the objective to load',
      },
    },
    required: ['objective_id'],
  },
};

export const listObjectivesTool: Tool = {
  name: 'list_objectives',
  description:
    'List objectives from the database with optional filtering. ' +
    'Returns basic info about each objective.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['draft', 'refined', 'approved', 'playbook_generated', 'archived'],
        description: 'Filter by status (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of objectives to return (default: 20)',
        default: 20,
      },
      offset: {
        type: 'number',
        description: 'Number of objectives to skip for pagination (default: 0)',
        default: 0,
      },
    },
  },
};

export async function handleLoadObjective(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const objectiveId = args.objective_id as string;

  try {
    const objective = await dbGetObjective(objectiveId);

    if (!objective) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Objective not found',
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
              objective,
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

export async function handleListObjectives(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const status = args.status as string | undefined;
  const limit = (args.limit as number) || 20;
  const offset = (args.offset as number) || 0;

  try {
    const objectives = await dbListObjectives({ status, limit, offset });

    // Return simplified list for browsing
    const summaries = objectives.map((obj) => ({
      id: obj.id,
      title: obj.title,
      summary: obj.summary?.slice(0, 100) + (obj.summary && obj.summary.length > 100 ? '...' : ''),
      sourceMode: obj.sourceMode,
      qualityScore: obj.qualityScore,
      completenessScore: obj.completenessScore,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              count: objectives.length,
              has_more: objectives.length === limit,
              objectives: summaries,
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

/**
 * Save Playbook Tool
 *
 * Persists a generated playbook to PostgreSQL database.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { savePlaybook as dbSavePlaybook, type PlaybookSpec } from '../db/client.js';
import { randomUUID } from 'crypto';

export const savePlaybookTool: Tool = {
  name: 'save_playbook',
  description:
    'Save a generated playbook to the database. ' +
    'Links the playbook to its source objective.',
  inputSchema: {
    type: 'object',
    properties: {
      objective_id: {
        type: 'string',
        description: 'The UUID of the source objective',
      },
      title: {
        type: 'string',
        description: 'Playbook title',
      },
      description: {
        type: 'string',
        description: 'Playbook description',
      },
      content: {
        type: 'object',
        description: 'The full playbook content (phases, activities, tasks)',
      },
      aspenify_intent: {
        type: 'string',
        description: 'Detected intent from Aspenify analysis',
      },
      aspenify_context: {
        type: 'string',
        description: 'Context from Aspenify analysis',
      },
      aspenify_type: {
        type: 'string',
        description: 'Project type from Aspenify classification',
      },
      roles: {
        type: 'array',
        description: 'Required roles for executing the playbook',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
      prerequisites: {
        type: 'array',
        description: 'Prerequisites for the playbook',
        items: { type: 'string' },
      },
      questions_asked: {
        type: 'array',
        description: 'Questions asked during generation (audit trail)',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
      answers_provided: {
        type: 'array',
        description: 'Answers provided to questions (audit trail)',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
          },
        },
      },
      generation_metadata: {
        type: 'object',
        description: 'Metadata about the generation process',
      },
      status: {
        type: 'string',
        enum: ['draft', 'complete'],
        description: 'Initial status (default: complete)',
        default: 'complete',
      },
    },
    required: ['objective_id', 'title', 'content'],
  },
};

export async function handleSavePlaybook(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const objectiveId = args.objective_id as string;
  const title = args.title as string;
  const content = args.content as Record<string, unknown>;

  if (!objectiveId || !title || !content) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: 'Missing required fields: objective_id, title, content',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  try {
    const playbook: PlaybookSpec = {
      id: randomUUID(),
      objectiveId,
      title,
      description: args.description as string | undefined,
      aspenifyIntent: args.aspenify_intent as string | undefined,
      aspenifyContext: args.aspenify_context as string | undefined,
      aspenifyType: args.aspenify_type as string | undefined,
      content,
      roles: args.roles as Array<{ name: string; description: string }> | undefined,
      prerequisites: args.prerequisites as string[] | undefined,
      generationMetadata: args.generation_metadata as Record<string, unknown> | undefined,
      questionsAsked: args.questions_asked as Array<{ question: string; description?: string }> | undefined,
      answersProvided: args.answers_provided as Array<{ question: string; answer: string }> | undefined,
      status: (args.status as 'draft' | 'complete') || 'complete',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await dbSavePlaybook(playbook);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              playbook_id: result.id,
              objective_id: objectiveId,
              title,
              created: result.created,
              message: result.created
                ? 'Playbook saved successfully'
                : 'Playbook updated successfully',
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
              note: 'Database save failed - check DATABASE_URL environment variable',
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

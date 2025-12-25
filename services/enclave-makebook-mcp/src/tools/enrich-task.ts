/**
 * Enrich Task Tool
 *
 * Add detailed specification to a single task.
 * Generates 100+ word description with technical details.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createLLMClient, generateWithFallback } from '../llm/client.js';
import { ENRICHMENT_SYSTEM_PROMPT, buildEnrichmentPrompt } from '../llm/prompts.js';
import type { Task, LLMConfig } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const enrichTaskTool: Tool = {
  name: 'enrich_task',
  description:
    'Add detailed specification to a single task. Generates 100+ word description with technical details, edge cases, and implementation guidance. Use this for tasks that need more detail.',
  inputSchema: {
    type: 'object',
    properties: {
      task: {
        type: 'object',
        description: 'The task to enrich',
        properties: {
          id: { type: 'string', description: 'Task ID (e.g., TASK-001)' },
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Current description (if any)' },
          phase: { type: 'string', description: 'Which phase this task belongs to' },
          role: { type: 'string', description: 'Assigned role' },
          classification: { type: 'string', description: 'AUTO/HYBRID/MANUAL' },
          dependencies: {
            type: 'array',
            items: { type: 'string' },
            description: 'Task dependencies',
          },
        },
        required: ['id', 'title'],
      },
      context: {
        type: 'object',
        description: 'Context to help enrich the task',
        properties: {
          objective: { type: 'string', description: 'The overall project objective' },
          related_tasks: {
            type: 'array',
            description: 'Related tasks for context',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
              },
            },
          },
        },
      },
      llm_config: {
        type: 'object',
        description: 'Optional LLM configuration',
        properties: {
          provider: { type: 'string', enum: ['ollama', 'anthropic', 'openai'] },
          model: { type: 'string' },
        },
      },
    },
    required: ['task'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleEnrichTask(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const task = args.task as Partial<Task>;
  const context = args.context as {
    objective?: string;
    related_tasks?: Array<{ id: string; title: string }>;
  } | undefined;
  const llmConfig = args.llm_config as Partial<LLMConfig> | undefined;

  // Validation
  if (!task?.id || !task?.title) {
    return errorResponse('Task with id and title is required');
  }

  try {
    console.error(`[makebook-mcp] Enriching task: ${task.id} - ${task.title}`);

    // Build the enrichment prompt
    const userPrompt = buildEnrichmentPrompt(task, context);

    // Call LLM
    const response = await generateWithFallback(
      [
        { role: 'system', content: ENRICHMENT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      llmConfig
    );

    // Parse response
    const enrichedTask = parseEnrichmentResponse(response.content, task);

    console.error(`[makebook-mcp] Enriched task ${task.id}: ${enrichedTask.description.length} chars`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              enriched_task: enrichedTask,
              model: response.model,
              usedFallback: response.usedFallback,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[makebook-mcp] Enrichment failed: ${errorMessage}`);

    return errorResponse(errorMessage);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Enrichment (for parallel processing)
// ─────────────────────────────────────────────────────────────────────────────

export async function enrichTasksBatch(
  tasks: Partial<Task>[],
  context?: { objective?: string },
  concurrency: number = 3
): Promise<Task[]> {
  const enriched: Task[] = [];

  // Process in batches
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);

    console.error(`[makebook-mcp] Enriching batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(tasks.length / concurrency)}`);

    const batchResults = await Promise.all(
      batch.map(async (task) => {
        try {
          const userPrompt = buildEnrichmentPrompt(task, context);
          const response = await generateWithFallback([
            { role: 'system', content: ENRICHMENT_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ]);
          return parseEnrichmentResponse(response.content, task);
        } catch (error) {
          console.error(`[makebook-mcp] Failed to enrich ${task.id}: ${(error as Error).message}`);
          // Return task as-is if enrichment fails
          return normalizeTask(task);
        }
      })
    );

    enriched.push(...batchResults);
  }

  return enriched;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function parseEnrichmentResponse(content: string, originalTask: Partial<Task>): Task {
  try {
    let jsonStr = content.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    // Merge with original task, preferring enriched values
    return {
      id: (parsed.id as string) || originalTask.id || 'TASK-XXX',
      title: (parsed.title as string) || originalTask.title || 'Untitled',
      description: (parsed.description as string) || originalTask.description || '',
      phase: (parsed.phase as string) || originalTask.phase || 'General',
      role: normalizeRole((parsed.role as string) || originalTask.role),
      classification: normalizeClassification(
        (parsed.classification as string) || originalTask.classification
      ),
      dependencies: ((parsed.dependencies as string[]) || originalTask.dependencies || []),
      deliverables: ((parsed.deliverables as string[]) || originalTask.deliverables || []),
      acceptance_criteria: ((parsed.acceptance_criteria as string[]) || originalTask.acceptance_criteria || []),
      estimated_complexity: normalizeComplexity(
        (parsed.estimated_complexity as string) || originalTask.estimated_complexity
      ),
      technical_notes: parsed.technical_notes as string,
      edge_cases: parsed.edge_cases as string[],
      implementation_hints: parsed.implementation_hints as string[],
    };
  } catch {
    // If parsing fails, return normalized original with content as description
    return {
      ...normalizeTask(originalTask),
      description: content.length > 100 ? content : (originalTask.description || content),
    };
  }
}

function normalizeTask(task: Partial<Task>): Task {
  return {
    id: task.id || 'TASK-XXX',
    title: task.title || 'Untitled',
    description: task.description || '',
    phase: task.phase || 'General',
    role: normalizeRole(task.role),
    classification: normalizeClassification(task.classification),
    dependencies: task.dependencies || [],
    deliverables: task.deliverables || [],
    acceptance_criteria: task.acceptance_criteria || [],
    estimated_complexity: normalizeComplexity(task.estimated_complexity),
  };
}

function normalizeRole(role: string | undefined): Task['role'] {
  const validRoles = ['architect', 'developer', 'designer', 'analyst', 'devops', 'qa'];
  if (role && validRoles.includes(role.toLowerCase())) {
    return role.toLowerCase() as Task['role'];
  }
  return 'developer';
}

function normalizeClassification(classification: string | undefined): Task['classification'] {
  const upper = classification?.toUpperCase();
  if (upper === 'AUTO' || upper === 'HYBRID' || upper === 'MANUAL') {
    return upper;
  }
  return 'HYBRID';
}

function normalizeComplexity(complexity: string | undefined): Task['estimated_complexity'] {
  const valid = ['trivial', 'simple', 'moderate', 'complex', 'epic'];
  if (complexity && valid.includes(complexity.toLowerCase())) {
    return complexity.toLowerCase() as Task['estimated_complexity'];
  }
  return 'moderate';
}

function errorResponse(
  error: string
): { content: Array<{ type: string; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: false, error }, null, 2),
      },
    ],
  };
}

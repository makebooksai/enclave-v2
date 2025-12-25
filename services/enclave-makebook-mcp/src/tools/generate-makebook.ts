/**
 * Generate Makebook Tool
 *
 * Transforms a Playbook into a complete Makebook with tasks,
 * dependencies, and classifications.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createLLMClient, generateWithFallback } from '../llm/client.js';
import { MAKEBOOK_SYSTEM_PROMPT, buildMakebookPrompt } from '../llm/prompts.js';
import type {
  Playbook,
  Makebook,
  Task,
  MakebookDepth,
  GenerateMakebookOptions,
  LLMConfig,
} from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const generateMakebookTool: Tool = {
  name: 'generate_makebook',
  description:
    'Generate a comprehensive Makebook from a Playbook. Creates detailed task breakdown with dependencies, specifications, and execution classification. Returns structured task graph ready for Smith orchestration.',
  inputSchema: {
    type: 'object',
    properties: {
      objective: {
        type: 'string',
        description: 'The original user objective that drove the Playbook',
      },
      playbook: {
        type: 'object',
        description: 'The Playbook to transform',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          methodology: { type: 'string' },
          phases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                steps: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          considerations: { type: 'array', items: { type: 'string' } },
          success_criteria: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'phases'],
      },
      options: {
        type: 'object',
        properties: {
          depth: {
            type: 'string',
            enum: ['minimal', 'standard', 'comprehensive'],
            description: 'Task description detail level (default: standard)',
          },
          enrichment: {
            type: 'boolean',
            description: 'Whether to enrich tasks with 100+ word specifications (default: true)',
          },
          model: {
            type: 'string',
            description: 'Override default model for generation',
          },
        },
      },
    },
    required: ['objective', 'playbook'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleGenerateMakebook(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const objective = args.objective as string;
  const playbook = args.playbook as Playbook;
  const options = (args.options || {}) as GenerateMakebookOptions;

  // Validation
  if (!objective) {
    return errorResponse('Objective is required');
  }

  if (!playbook?.title || !playbook?.phases?.length) {
    return errorResponse('Valid Playbook with title and phases is required');
  }

  const depth: MakebookDepth = options.depth || 'standard';
  const startTime = Date.now();

  try {
    console.error(`[makebook-mcp] Generating Makebook for: ${objective.substring(0, 50)}...`);
    console.error(`[makebook-mcp] Playbook: ${playbook.title}`);
    console.error(`[makebook-mcp] Depth: ${depth}`);

    // Build LLM config
    const llmConfig: Partial<LLMConfig> = {};
    if (options.model) {
      llmConfig.model = options.model;
    }

    // Generate the Makebook
    const userPrompt = buildMakebookPrompt(objective, playbook, depth);
    const response = await generateWithFallback(
      [
        { role: 'system', content: MAKEBOOK_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      llmConfig
    );

    // Parse the response
    const makebook = parseMakebookResponse(response.content, objective, playbook.id);
    const generationTime = Date.now() - startTime;

    // Update metadata
    makebook.metadata.generation_time_ms = generationTime;
    makebook.metadata.model_used = response.model;

    // Validate and fix task IDs if needed
    makebook.tasks = normalizeTaskIds(makebook.tasks);

    // Update task counts
    makebook.metadata.total_tasks = makebook.tasks.length;
    makebook.metadata.auto_tasks = makebook.tasks.filter((t) => t.classification === 'AUTO').length;
    makebook.metadata.hybrid_tasks = makebook.tasks.filter((t) => t.classification === 'HYBRID').length;
    makebook.metadata.manual_tasks = makebook.tasks.filter((t) => t.classification === 'MANUAL').length;
    makebook.metadata.phases = [...new Set(makebook.tasks.map((t) => t.phase))];
    makebook.metadata.roles = [...new Set(makebook.tasks.map((t) => t.role))];

    console.error(`[makebook-mcp] Generated ${makebook.tasks.length} tasks in ${generationTime}ms`);
    console.error(`[makebook-mcp] AUTO: ${makebook.metadata.auto_tasks}, HYBRID: ${makebook.metadata.hybrid_tasks}, MANUAL: ${makebook.metadata.manual_tasks}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              makebook,
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
    console.error(`[makebook-mcp] Generation failed: ${errorMessage}`);

    return errorResponse(errorMessage, 'LLM generation failed - check provider configuration');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function parseMakebookResponse(
  content: string,
  objective: string,
  sourcePlaybookId?: string
): Makebook {
  try {
    // Try to extract JSON from response
    let jsonStr = content.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Parse the JSON
    const parsed = JSON.parse(jsonStr);

    // Normalize structure - handle both direct makebook and wrapped
    const makebookData = parsed.makebook || parsed;

    // Ensure required fields
    const makebook: Makebook = {
      id: makebookData.id || generateUUID(),
      title: makebookData.title || 'Untitled Makebook',
      objective: makebookData.objective || objective,
      created_at: makebookData.created_at || new Date().toISOString(),
      source_playbook_id: makebookData.source_playbook_id || sourcePlaybookId,
      tasks: normalizeTasks(makebookData.tasks || []),
      metadata: {
        total_tasks: 0,
        auto_tasks: 0,
        hybrid_tasks: 0,
        manual_tasks: 0,
        phases: [],
        roles: [],
        model_used: '',
        generation_time_ms: 0,
        ...makebookData.metadata,
      },
    };

    return makebook;
  } catch {
    // If JSON parsing fails completely, create a minimal structure
    throw new Error(`Failed to parse LLM response as JSON: ${content.substring(0, 200)}...`);
  }
}

function normalizeTasks(tasks: unknown[]): Task[] {
  return tasks.map((t, index) => {
    const task = t as Record<string, unknown>;
    return {
      id: normalizeTaskId(task.id as string, index),
      title: (task.title as string) || 'Untitled Task',
      description: (task.description as string) || '',
      phase: (task.phase as string) || 'General',
      role: normalizeRole(task.role as string),
      classification: normalizeClassification(task.classification as string),
      dependencies: normalizeDepedencies(task.dependencies),
      deliverables: (task.deliverables as string[]) || [],
      acceptance_criteria: (task.acceptance_criteria as string[]) || [],
      estimated_complexity: normalizeComplexity(task.estimated_complexity as string),
    };
  });
}

function normalizeTaskId(id: string | undefined, index: number): string {
  if (id && /^TASK-\d{3}$/.test(id)) {
    return id;
  }
  return `TASK-${String(index + 1).padStart(3, '0')}`;
}

function normalizeTaskIds(tasks: Task[]): Task[] {
  const idMap = new Map<string, string>();

  // First pass: create normalized IDs
  tasks.forEach((task, index) => {
    const normalizedId = `TASK-${String(index + 1).padStart(3, '0')}`;
    idMap.set(task.id, normalizedId);
    task.id = normalizedId;
  });

  // Second pass: update dependencies to use normalized IDs
  tasks.forEach((task) => {
    task.dependencies = task.dependencies.map((dep) => idMap.get(dep) || dep);
  });

  return tasks;
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

function normalizeDepedencies(deps: unknown): string[] {
  if (Array.isArray(deps)) {
    return deps.filter((d) => typeof d === 'string');
  }
  return [];
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function errorResponse(
  error: string,
  note?: string
): { content: Array<{ type: string; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: false, error, note }, null, 2),
      },
    ],
  };
}

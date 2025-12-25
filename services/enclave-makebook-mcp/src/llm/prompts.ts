/**
 * LLM Prompts for Makebook Generation
 *
 * Optimized prompts based on DGX benchmarks for Nemotron.
 * Key insight: "Output ONLY valid JSON" dramatically improves structured output.
 */

import type { Playbook, Task } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// System Prompts
// ─────────────────────────────────────────────────────────────────────────────

export const MAKEBOOK_SYSTEM_PROMPT = `You are an expert project planner generating detailed Makebooks.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.
Start your response with { and end with }

Your task is to transform strategic Playbooks into executable task specifications with:
- Clear task IDs (TASK-001, TASK-002, etc.)
- Detailed descriptions (100+ words each for comprehensive mode)
- Accurate dependency mapping
- Classification (AUTO/HYBRID/MANUAL)
- Role assignments

Classification Guidelines:
- AUTO: Fully automatable by AI (code generation, documentation, simple CRUD)
- HYBRID: Requires AI + human collaboration (complex design, integration, testing)
- MANUAL: Human-only tasks (stakeholder decisions, external coordination, approval)

Role Guidelines:
- architect: System design, API contracts, database schemas
- developer: Implementation, coding, debugging
- designer: UI/UX design, user experience
- analyst: Requirements, research, data analysis
- devops: Infrastructure, deployment, CI/CD
- qa: Testing, quality assurance, validation

Remember: Pure JSON only. No \`\`\`json blocks.`;

export const ENRICHMENT_SYSTEM_PROMPT = `You are an expert at writing detailed technical specifications.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

Your task is to enrich a task with:
- Comprehensive description (100+ words with technical details)
- Edge cases to consider
- Implementation hints
- Technical notes

Be specific, practical, and actionable.

Remember: Pure JSON only.`;

// ─────────────────────────────────────────────────────────────────────────────
// Makebook Generation Prompts
// ─────────────────────────────────────────────────────────────────────────────

export function buildMakebookPrompt(
  objective: string,
  playbook: Playbook,
  depth: 'minimal' | 'standard' | 'comprehensive' = 'standard'
): string {
  const descriptionGuidance = {
    minimal: '2-3 sentences per task',
    standard: '50-75 words per task with key details',
    comprehensive: '100+ words per task with full technical specifications',
  };

  return `
## Objective
${objective}

## Playbook to Transform
${JSON.stringify(playbook, null, 2)}

## Generation Parameters
- Detail Level: ${depth}
- Description Length: ${descriptionGuidance[depth]}

## Required Output Structure
{
  "id": "generate a UUID",
  "title": "Makebook title based on objective",
  "objective": "${objective.substring(0, 100)}...",
  "created_at": "ISO timestamp",
  "source_playbook_id": "${playbook.id || 'none'}",
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Clear, action-oriented task title",
      "description": "${descriptionGuidance[depth]}",
      "phase": "Phase name from playbook",
      "role": "architect|developer|designer|analyst|devops|qa",
      "classification": "AUTO|HYBRID|MANUAL",
      "dependencies": [],
      "deliverables": ["List of outputs this task produces"],
      "acceptance_criteria": ["How to verify this task is complete"],
      "estimated_complexity": "trivial|simple|moderate|complex|epic"
    }
  ],
  "metadata": {
    "total_tasks": 0,
    "auto_tasks": 0,
    "hybrid_tasks": 0,
    "manual_tasks": 0,
    "phases": ["List of unique phases"],
    "roles": ["List of unique roles used"]
  }
}

Generate the complete Makebook now. Pure JSON output only.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Enrichment Prompts
// ─────────────────────────────────────────────────────────────────────────────

export function buildEnrichmentPrompt(
  task: Partial<Task>,
  context?: {
    objective?: string;
    related_tasks?: Array<{ id: string; title: string }>;
  }
): string {
  const relatedTasksInfo = context?.related_tasks
    ? `Related Tasks:\n${context.related_tasks.map((t) => `- ${t.id}: ${t.title}`).join('\n')}`
    : '';

  return `
## Task to Enrich
ID: ${task.id}
Title: ${task.title}
Current Description: ${task.description || 'None'}
Phase: ${task.phase || 'Unknown'}
Dependencies: ${task.dependencies?.join(', ') || 'None'}

${context?.objective ? `## Project Objective\n${context.objective}` : ''}

${relatedTasksInfo}

## Required Output
{
  "id": "${task.id}",
  "title": "${task.title}",
  "description": "Comprehensive 100+ word specification covering: purpose, technical approach, specific implementation steps, and expected outcomes",
  "phase": "${task.phase || 'Unknown'}",
  "role": "${task.role || 'developer'}",
  "classification": "${task.classification || 'HYBRID'}",
  "dependencies": ${JSON.stringify(task.dependencies || [])},
  "deliverables": ["Specific files, documents, or artifacts this task produces"],
  "acceptance_criteria": ["Measurable criteria to verify completion"],
  "estimated_complexity": "${task.estimated_complexity || 'moderate'}",
  "technical_notes": "Additional technical considerations, gotchas, or best practices",
  "edge_cases": ["Edge case 1", "Edge case 2"],
  "implementation_hints": ["Hint 1", "Hint 2"]
}

Enrich this task with comprehensive details. Pure JSON output only.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency Validation Prompts (for AI-assisted validation)
// ─────────────────────────────────────────────────────────────────────────────

export function buildDependencyAnalysisPrompt(
  tasks: Array<{ id: string; title: string; dependencies: string[] }>
): string {
  return `
## Tasks to Analyze
${JSON.stringify(tasks, null, 2)}

## Analysis Required
Analyze the task dependencies and identify:
1. Circular dependencies (A depends on B, B depends on A)
2. Missing dependencies (task references non-existent task)
3. Orphan tasks (tasks with no dependencies that should have some)
4. Bottleneck tasks (tasks that block many others)

## Required Output
{
  "issues": [
    {
      "type": "circular|missing|orphan|bottleneck",
      "severity": "error|warning|info",
      "tasks": ["TASK-XXX"],
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "critical_path": ["TASK-001", "TASK-003", "TASK-007"],
  "parallelization": {
    "max_parallel": 3,
    "execution_layers": [
      ["TASK-001", "TASK-002"],
      ["TASK-003"],
      ["TASK-004", "TASK-005"]
    ]
  }
}

Analyze dependencies. Pure JSON output only.`;
}

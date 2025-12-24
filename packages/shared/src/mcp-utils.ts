// =============================================================================
// MCP Utility Functions
// =============================================================================

import type { ToolResult, ModelConfig, LLMProvider } from './types.js';

// -----------------------------------------------------------------------------
// Error Codes
// -----------------------------------------------------------------------------

export const MCP_ERRORS = {
  INVALID_INPUT: { code: 400, message: 'Invalid input parameters' },
  INVALID_PLAYBOOK: { code: 400, message: 'Invalid Playbook structure' },
  GENERATION_FAILED: { code: 500, message: 'LLM generation failed' },
  TIMEOUT: { code: 504, message: 'Generation timed out' },
  CIRCULAR_DEPENDENCY: { code: 422, message: 'Circular dependency detected' },
  MODEL_UNAVAILABLE: { code: 503, message: 'LLM model unavailable' },
  MEMORY_ERROR: { code: 500, message: 'Memory operation failed' },
} as const;

// -----------------------------------------------------------------------------
// Result Builders
// -----------------------------------------------------------------------------

export function success<T>(data: T): ToolResult<T> {
  return { success: true, data };
}

export function failure(code: number, message: string, details?: unknown): ToolResult<never> {
  return {
    success: false,
    error: { code, message, details },
  };
}

export function fromError(error: unknown): ToolResult<never> {
  if (error instanceof Error) {
    return failure(500, error.message);
  }
  return failure(500, 'Unknown error occurred');
}

// -----------------------------------------------------------------------------
// Timeout Utilities
// -----------------------------------------------------------------------------

export const TIMEOUTS = {
  standard: 60_000,      // 60 seconds
  complex: 120_000,      // 2 minutes
  extended: 180_000,     // 3 minutes
  orchestration: 300_000 // 5 minutes
} as const;

export type TimeoutType = keyof typeof TIMEOUTS;

export function getTimeout(type: TimeoutType): number {
  return TIMEOUTS[type];
}

// -----------------------------------------------------------------------------
// Model Fallback Chain
// -----------------------------------------------------------------------------

export interface FallbackChainConfig {
  primary: ModelConfig;
  fallbacks: ModelConfig[];
}

export const DEFAULT_FALLBACK_CHAIN: FallbackChainConfig = {
  primary: {
    provider: 'ollama',
    model: 'nemotron-3-nano:30b',
    baseUrl: 'http://localhost:11434',
  },
  fallbacks: [
    { provider: 'anthropic', model: 'claude-haiku-4-5-20250929' },
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  ],
};

// -----------------------------------------------------------------------------
// JSON Validation Helpers
// -----------------------------------------------------------------------------

export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function extractJSON(text: string): string | null {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    if (isValidJSON(extracted)) {
      return extracted;
    }
  }

  // Try to find raw JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch && isValidJSON(jsonMatch[0])) {
    return jsonMatch[0];
  }

  // Maybe it's already clean JSON
  if (isValidJSON(text)) {
    return text;
  }

  return null;
}

// -----------------------------------------------------------------------------
// Task ID Utilities
// -----------------------------------------------------------------------------

export function generateTaskId(index: number): string {
  return `TASK-${String(index + 1).padStart(3, '0')}`;
}

export function parseTaskId(id: string): number | null {
  const match = id.match(/^TASK-(\d{3})$/);
  return match ? parseInt(match[1], 10) : null;
}

export function isValidTaskId(id: string): boolean {
  return /^TASK-\d{3}$/.test(id);
}

// -----------------------------------------------------------------------------
// Dependency Graph Utilities
// -----------------------------------------------------------------------------

export interface TaskNode {
  id: string;
  dependencies: string[];
}

export function detectCircularDependencies(tasks: TaskNode[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  function dfs(taskId: string, path: string[]): boolean {
    visited.add(taskId);
    recursionStack.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return false;

    for (const depId of task.dependencies) {
      if (!visited.has(depId)) {
        if (dfs(depId, [...path, depId])) {
          return true;
        }
      } else if (recursionStack.has(depId)) {
        // Found a cycle
        const cycleStart = path.indexOf(depId);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        } else {
          cycles.push([...path, depId]);
        }
        return true;
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id, [task.id]);
    }
  }

  return cycles;
}

export function findCriticalPath(tasks: TaskNode[]): string[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const inDegree = new Map<string, number>();
  const longestPath = new Map<string, number>();
  const predecessor = new Map<string, string | null>();

  // Initialize
  for (const task of tasks) {
    inDegree.set(task.id, 0);
    longestPath.set(task.id, 1);
    predecessor.set(task.id, null);
  }

  // Calculate in-degrees
  for (const task of tasks) {
    for (const depId of task.dependencies) {
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    }
  }

  // Topological sort with longest path
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const task = taskMap.get(current);
    if (!task) continue;

    for (const other of tasks) {
      if (other.dependencies.includes(current)) {
        const newLength = (longestPath.get(current) || 0) + 1;
        if (newLength > (longestPath.get(other.id) || 0)) {
          longestPath.set(other.id, newLength);
          predecessor.set(other.id, current);
        }

        const newDegree = (inDegree.get(other.id) || 0) - 1;
        inDegree.set(other.id, newDegree);
        if (newDegree === 0) {
          queue.push(other.id);
        }
      }
    }
  }

  // Find the end of critical path
  let maxLength = 0;
  let endNode = '';
  for (const [id, length] of longestPath) {
    if (length > maxLength) {
      maxLength = length;
      endNode = id;
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = endNode;
  while (current) {
    path.unshift(current);
    current = predecessor.get(current) || null;
  }

  return path;
}

export function computeExecutionLayers(tasks: TaskNode[]): string[][] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const layers: string[][] = [];
  const assigned = new Set<string>();

  while (assigned.size < tasks.length) {
    const layer: string[] = [];

    for (const task of tasks) {
      if (assigned.has(task.id)) continue;

      // Check if all dependencies are satisfied
      const allDepsSatisfied = task.dependencies.every(dep => assigned.has(dep));
      if (allDepsSatisfied) {
        layer.push(task.id);
      }
    }

    if (layer.length === 0) {
      // Circular dependency or other issue - break to avoid infinite loop
      break;
    }

    layers.push(layer);
    layer.forEach(id => assigned.add(id));
  }

  return layers;
}

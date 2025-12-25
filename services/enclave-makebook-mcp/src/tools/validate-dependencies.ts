/**
 * Validate Dependencies Tool
 *
 * Analyze and validate task dependency graph.
 * Detects circular references, missing dependencies, bottlenecks.
 * Calculates critical path and parallelization opportunities.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  DependencyValidation,
  DependencyIssue,
  ParallelizationInfo,
} from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const validateDependenciesTool: Tool = {
  name: 'validate_dependencies',
  description:
    'Validate task dependencies for circular references, missing dependencies, and optimization opportunities. Returns critical path analysis and parallelization recommendations.',
  inputSchema: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        description: 'Array of tasks with their dependencies',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID (e.g., TASK-001)' },
            title: { type: 'string', description: 'Task title (for context)' },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of task IDs this task depends on',
            },
          },
          required: ['id', 'dependencies'],
        },
      },
    },
    required: ['tasks'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool Handler
// ─────────────────────────────────────────────────────────────────────────────

interface TaskInput {
  id: string;
  title?: string;
  dependencies: string[];
}

export async function handleValidateDependencies(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const tasks = args.tasks as TaskInput[];

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Tasks array is required',
          }, null, 2),
        },
      ],
    };
  }

  try {
    console.error(`[makebook-mcp] Validating dependencies for ${tasks.length} tasks`);

    // Build task map
    const taskMap = new Map<string, TaskInput>();
    tasks.forEach((t) => taskMap.set(t.id, t));

    const issues: DependencyIssue[] = [];

    // Check for missing dependencies
    const missingDeps = findMissingDependencies(tasks, taskMap);
    issues.push(...missingDeps);

    // Check for circular dependencies
    const circularDeps = findCircularDependencies(tasks, taskMap);
    issues.push(...circularDeps);

    // Check for orphan tasks (tasks with no deps that probably should have some)
    const orphans = findOrphanTasks(tasks, taskMap);
    issues.push(...orphans);

    // Find bottlenecks (tasks that block many others)
    const bottlenecks = findBottlenecks(tasks);
    issues.push(...bottlenecks);

    // Calculate critical path
    const criticalPath = calculateCriticalPath(tasks, taskMap);

    // Calculate parallelization layers
    const parallelization = calculateParallelization(tasks, taskMap);

    const validation: DependencyValidation = {
      valid: !issues.some((i) => i.severity === 'error'),
      issues,
      critical_path: criticalPath,
      parallelization,
    };

    console.error(`[makebook-mcp] Validation complete: ${issues.length} issues found`);
    console.error(`[makebook-mcp] Critical path: ${criticalPath.length} tasks`);
    console.error(`[makebook-mcp] Max parallel: ${parallelization.max_parallel}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, ...validation }, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[makebook-mcp] Validation failed: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: false, error: errorMessage }, null, 2),
        },
      ],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

function findMissingDependencies(
  tasks: TaskInput[],
  taskMap: Map<string, TaskInput>
): DependencyIssue[] {
  const issues: DependencyIssue[] = [];

  for (const task of tasks) {
    for (const dep of task.dependencies) {
      if (!taskMap.has(dep)) {
        issues.push({
          type: 'missing',
          severity: 'error',
          tasks: [task.id],
          message: `Task ${task.id} depends on non-existent task ${dep}`,
          suggestion: `Remove dependency on ${dep} or add the missing task`,
        });
      }
    }
  }

  return issues;
}

function findCircularDependencies(
  tasks: TaskInput[],
  taskMap: Map<string, TaskInput>
): DependencyIssue[] {
  const issues: DependencyIssue[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(taskId: string, path: string[]): string[] | null {
    if (inStack.has(taskId)) {
      // Found a cycle
      const cycleStart = path.indexOf(taskId);
      return path.slice(cycleStart);
    }

    if (visited.has(taskId)) {
      return null;
    }

    visited.add(taskId);
    inStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task) {
      for (const dep of task.dependencies) {
        const cycle = dfs(dep, [...path, taskId]);
        if (cycle) {
          return cycle;
        }
      }
    }

    inStack.delete(taskId);
    return null;
  }

  const foundCycles = new Set<string>();

  for (const task of tasks) {
    visited.clear();
    inStack.clear();

    const cycle = dfs(task.id, []);
    if (cycle) {
      const cycleKey = cycle.sort().join(',');
      if (!foundCycles.has(cycleKey)) {
        foundCycles.add(cycleKey);
        issues.push({
          type: 'circular',
          severity: 'error',
          tasks: cycle,
          message: `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
          suggestion: 'Break the cycle by removing one of the dependencies or restructuring tasks',
        });
      }
    }
  }

  return issues;
}

function findOrphanTasks(
  tasks: TaskInput[],
  _taskMap: Map<string, TaskInput>
): DependencyIssue[] {
  const issues: DependencyIssue[] = [];

  // Tasks that are dependencies of others
  const isDependedOn = new Set<string>();
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      isDependedOn.add(dep);
    }
  }

  // Find tasks with no dependencies that aren't depended on by many
  // and aren't clearly "leaf" tasks (last in chain)
  for (const task of tasks) {
    if (task.dependencies.length === 0 && !isDependedOn.has(task.id)) {
      // Completely isolated task
      if (tasks.length > 1) {
        issues.push({
          type: 'orphan',
          severity: 'warning',
          tasks: [task.id],
          message: `Task ${task.id} is completely isolated (no dependencies, not depended on)`,
          suggestion: 'Consider if this task should depend on or be depended on by others',
        });
      }
    }
  }

  return issues;
}

function findBottlenecks(tasks: TaskInput[]): DependencyIssue[] {
  const issues: DependencyIssue[] = [];

  // Count how many tasks depend on each task
  const dependencyCount = new Map<string, number>();
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      dependencyCount.set(dep, (dependencyCount.get(dep) || 0) + 1);
    }
  }

  // Identify bottlenecks (tasks that block many others)
  const threshold = Math.max(3, Math.floor(tasks.length * 0.2));

  for (const [taskId, count] of dependencyCount) {
    if (count >= threshold) {
      issues.push({
        type: 'bottleneck',
        severity: 'info',
        tasks: [taskId],
        message: `Task ${taskId} is a bottleneck - ${count} tasks depend on it`,
        suggestion: 'Consider parallelizing or breaking down this task to reduce blocking',
      });
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Functions
// ─────────────────────────────────────────────────────────────────────────────

function calculateCriticalPath(
  tasks: TaskInput[],
  taskMap: Map<string, TaskInput>
): string[] {
  // Build reverse dependency map (what depends on what)
  const dependents = new Map<string, string[]>();
  for (const task of tasks) {
    dependents.set(task.id, []);
  }
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      if (dependents.has(dep)) {
        dependents.get(dep)!.push(task.id);
      }
    }
  }

  // Find tasks with no dependencies (starting points)
  const startTasks = tasks.filter((t) => t.dependencies.length === 0);

  // Find tasks with no dependents (end points)
  const endTasks = tasks.filter((t) => dependents.get(t.id)?.length === 0);

  // Find longest path using BFS
  let longestPath: string[] = [];

  function findLongestPath(start: string, visited: Set<string>): string[] {
    if (visited.has(start)) {
      return [];
    }

    visited.add(start);
    const deps = dependents.get(start) || [];

    if (deps.length === 0) {
      return [start];
    }

    let maxPath: string[] = [];
    for (const dep of deps) {
      const path = findLongestPath(dep, new Set(visited));
      if (path.length > maxPath.length) {
        maxPath = path;
      }
    }

    return [start, ...maxPath];
  }

  for (const start of startTasks) {
    const path = findLongestPath(start.id, new Set());
    if (path.length > longestPath.length) {
      longestPath = path;
    }
  }

  return longestPath;
}

function calculateParallelization(
  tasks: TaskInput[],
  taskMap: Map<string, TaskInput>
): ParallelizationInfo {
  const layers: string[][] = [];
  const assigned = new Set<string>();

  // Keep assigning tasks to layers until all are assigned
  while (assigned.size < tasks.length) {
    const currentLayer: string[] = [];

    for (const task of tasks) {
      if (assigned.has(task.id)) {
        continue;
      }

      // Check if all dependencies are already assigned
      const depsAssigned = task.dependencies.every((dep) => assigned.has(dep));

      if (depsAssigned) {
        currentLayer.push(task.id);
      }
    }

    if (currentLayer.length === 0) {
      // Stuck - probably circular dependencies
      // Add remaining unassigned tasks to break the loop
      const remaining = tasks.filter((t) => !assigned.has(t.id)).map((t) => t.id);
      if (remaining.length > 0) {
        layers.push(remaining);
        remaining.forEach((id) => assigned.add(id));
      }
      break;
    }

    layers.push(currentLayer);
    currentLayer.forEach((id) => assigned.add(id));
  }

  const maxParallel = layers.reduce((max, layer) => Math.max(max, layer.length), 0);

  return {
    max_parallel: maxParallel,
    execution_layers: layers,
  };
}

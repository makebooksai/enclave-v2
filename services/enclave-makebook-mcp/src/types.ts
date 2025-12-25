/**
 * Enclave Makebook MCP - Type Definitions
 *
 * Transform Playbooks into executable task specifications.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Playbook Input Types (from enclave-playbook-mcp)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaybookPhase {
  name: string;
  description: string;
  steps: string[];
}

export interface Playbook {
  id?: string;
  title: string;
  summary?: string;
  methodology?: string;
  phases: PlaybookPhase[];
  considerations?: string[];
  success_criteria?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Types
// ─────────────────────────────────────────────────────────────────────────────

export type TaskRole =
  | 'architect'
  | 'developer'
  | 'designer'
  | 'analyst'
  | 'devops'
  | 'qa';

export type TaskClassification = 'AUTO' | 'HYBRID' | 'MANUAL';

export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'epic';

export interface Task {
  id: string;                      // TASK-001 format
  title: string;
  description: string;             // 100+ words when enriched
  phase: string;
  role: TaskRole;
  classification: TaskClassification;
  dependencies: string[];
  deliverables: string[];
  acceptance_criteria: string[];
  estimated_complexity: TaskComplexity;

  // Optional enrichment fields
  technical_notes?: string;
  edge_cases?: string[];
  implementation_hints?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Makebook Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MakebookMetadata {
  total_tasks: number;
  auto_tasks: number;
  hybrid_tasks: number;
  manual_tasks: number;
  phases: string[];
  roles: TaskRole[];
  model_used: string;
  generation_time_ms: number;
}

export interface Makebook {
  id: string;
  title: string;
  objective: string;
  created_at: string;
  source_playbook_id?: string;
  tasks: Task[];
  metadata: MakebookMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency Validation Types
// ─────────────────────────────────────────────────────────────────────────────

export type DependencyIssueType = 'circular' | 'missing' | 'orphan' | 'bottleneck';
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface DependencyIssue {
  type: DependencyIssueType;
  severity: IssueSeverity;
  tasks: string[];
  message: string;
  suggestion: string;
}

export interface ParallelizationInfo {
  max_parallel: number;
  execution_layers: string[][];
}

export interface DependencyValidation {
  valid: boolean;
  issues: DependencyIssue[];
  critical_path: string[];
  parallelization: ParallelizationInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Provider Types
// ─────────────────────────────────────────────────────────────────────────────

export type LLMProvider = 'ollama' | 'anthropic' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Input/Output Types
// ─────────────────────────────────────────────────────────────────────────────

export type MakebookDepth = 'minimal' | 'standard' | 'comprehensive';

export interface GenerateMakebookOptions {
  depth?: MakebookDepth;
  enrichment?: boolean;
  model?: string;
}

export interface GenerateMakebookInput {
  objective: string;
  playbook: Playbook;
  options?: GenerateMakebookOptions;
}

export interface GenerateMakebookOutput {
  success: boolean;
  makebook?: Makebook;
  error?: string;
}

export interface EnrichTaskInput {
  task: Partial<Task>;
  context?: {
    objective?: string;
    related_tasks?: Array<{ id: string; title: string }>;
  };
}

export interface EnrichTaskOutput {
  success: boolean;
  enriched_task?: Task;
  error?: string;
}

export interface ValidateDependenciesInput {
  tasks: Array<{ id: string; dependencies: string[] }>;
}

export interface ValidateDependenciesOutput extends DependencyValidation {
  success: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MakebookRecord {
  id: string;
  objective_id?: string;
  playbook_id?: string;
  title: string;
  objective: string;
  structure: Makebook;
  created_at: Date;
  updated_at: Date;
}

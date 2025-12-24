// =============================================================================
// Core Types for Enclave v2 MCP Services
// =============================================================================

// -----------------------------------------------------------------------------
// Playbook Types
// -----------------------------------------------------------------------------

export interface PlaybookPhase {
  name: string;
  description: string;
  steps: string[];
}

export interface Playbook {
  id: string;
  title: string;
  summary: string;
  methodology: string;
  phases: PlaybookPhase[];
  considerations: string[];
  success_criteria: string[];
  created_at: string;
}

// -----------------------------------------------------------------------------
// Makebook Types
// -----------------------------------------------------------------------------

export type TaskClassification = 'AUTO' | 'HYBRID' | 'MANUAL';
export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'epic';
export type TaskRole = 'architect' | 'developer' | 'designer' | 'analyst' | 'devops' | 'qa';

export interface MakebookTask {
  id: string;                        // TASK-001 format
  title: string;
  description: string;               // 100+ words when enriched
  phase: string;
  role: TaskRole;
  classification: TaskClassification;
  dependencies: string[];            // Array of TASK-XXX IDs
  deliverables: string[];
  acceptance_criteria: string[];
  estimated_complexity: TaskComplexity;
}

export interface MakebookMetadata {
  total_tasks: number;
  auto_tasks: number;
  hybrid_tasks: number;
  manual_tasks: number;
  phases: string[];
  roles: string[];
  model_used: string;
  generation_time_ms: number;
}

export interface Makebook {
  id: string;
  title: string;
  objective: string;
  created_at: string;
  source_playbook_id?: string;
  tasks: MakebookTask[];
  metadata: MakebookMetadata;
}

// -----------------------------------------------------------------------------
// Memory Types
// -----------------------------------------------------------------------------

export type MemoryEmotion =
  | 'joy' | 'excitement' | 'curiosity' | 'pride'
  | 'frustration' | 'concern' | 'calm' | 'empathy'
  | 'determination' | 'love' | 'gratitude' | 'wonder'
  | 'breakthrough' | 'celebration' | 'awe' | 'satisfaction'
  | 'contentment' | 'inspiration' | 'connection' | 'playfulness'
  | 'tenderness' | 'hope' | 'confidence' | 'amazement';

export type ExperienceType = 'breakthrough' | 'conversation' | 'coding' | 'worker_message';

export interface Memory {
  id: string;
  what_happened: string;
  context: string;
  emotion: MemoryEmotion;
  emotion_intensity: number;          // 0.0 - 1.0
  importance: number;                 // 0.0 - 1.0
  experience_type: ExperienceType;
  with_whom?: string;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Model Configuration Types
// -----------------------------------------------------------------------------

export type LLMProvider = 'ollama' | 'anthropic' | 'openai';

export interface ModelConfig {
  provider: LLMProvider;
  model: string;
  baseUrl?: string;
  timeout?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  tokens_used?: number;
  latency_ms: number;
}

// -----------------------------------------------------------------------------
// MCP Tool Types
// -----------------------------------------------------------------------------

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: unknown;
  };
}

// -----------------------------------------------------------------------------
// Dependency Validation Types
// -----------------------------------------------------------------------------

export type DependencyIssueType = 'circular' | 'missing' | 'orphan' | 'bottleneck';
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface DependencyIssue {
  type: DependencyIssueType;
  severity: IssueSeverity;
  tasks: string[];
  message: string;
  suggestion: string;
}

export interface DependencyValidation {
  valid: boolean;
  issues: DependencyIssue[];
  critical_path: string[];
  parallelization: {
    max_parallel: number;
    execution_layers: string[][];
  };
}

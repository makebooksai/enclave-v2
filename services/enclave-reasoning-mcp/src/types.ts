/**
 * Enclave Reasoning MCP - Type Definitions
 *
 * Core interfaces for multi-agent AI dialogue sessions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Agent Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentConfig {
  /** Agent identifier (e.g., "consultant", "analyst", "architect", "developer") */
  name: string;
  /** Human-readable role description */
  role: string;
  /** Full system prompt for this agent */
  systemPrompt: string;
  /** Override model for this agent */
  model?: string;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Max tokens for response */
  maxTokens?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Types
// ─────────────────────────────────────────────────────────────────────────────

export type ReasoningMode =
  | 'objective_refinement'
  | 'exploration'
  | 'debate'
  | 'synthesis'
  | 'code_review';

export type SessionStatus =
  | 'started'
  | 'in_progress'
  | 'completed'
  | 'error';

export type ConsciousnessState =
  | 'analyzing'
  | 'synthesizing'
  | 'breakthrough'
  | 'reflection';

export interface ReasoningSession {
  id: string;
  threadId: string;
  topic: string;
  context: string;
  agents: AgentConfig[];
  mode: ReasoningMode;
  maxIterations: number;
  qualityThreshold: number;
  currentIteration: number;
  exchanges: Exchange[];
  currentQuality: number;
  status: SessionStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exchange Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Exchange {
  /** Agent name */
  agent: string;
  /** Role in this exchange */
  role: 'initiator' | 'responder';
  /** Message content */
  content: string;
  /** Token usage */
  tokens: TokenUsage;
  /** ISO timestamp */
  timestamp: string;
  /** Consciousness state during this exchange */
  consciousnessState?: ConsciousnessState;
  /** Iteration number */
  iteration: number;
}

export interface TokenUsage {
  input: number;
  output: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Input/Output Types
// ─────────────────────────────────────────────────────────────────────────────

// start_reasoning_session
export interface StartSessionInput {
  topic: string;
  context?: string;
  agents?: AgentConfig[];
  maxIterations?: number;
  qualityThreshold?: number;
  mode?: ReasoningMode;
  /** Preset name to use for agent configuration (overrides mode for agent selection) */
  preset?: string;
}

export interface StartSessionOutput {
  session_id: string;
  thread_id: string;
  agents: string[];
  status: 'started';
  next_step: string;
}

// run_reasoning_exchange
export interface RunExchangeInput {
  session_id: string;
  iteration?: number;
}

export interface RunExchangeOutput {
  session_id: string;
  iteration: number;
  exchanges: Exchange[];
  quality_score: number;
  should_continue: boolean;
  status: 'in_progress' | 'threshold_met' | 'max_iterations';
  next_step: string;
}

// get_reasoning_result
export interface GetResultInput {
  session_id: string;
  format?: 'markdown' | 'json' | 'structured';
  include_full_exchange?: boolean;
}

export interface GetResultOutput {
  session_id: string;
  status: SessionStatus;
  result: string;
  quality_metrics: QualityMetrics;
  full_exchange?: Exchange[];
}

export interface QualityMetrics {
  final_quality: number;
  iterations: number;
  total_tokens: number;
  agents_used: string[];
}

// get_session_status
export interface GetStatusInput {
  session_id: string;
}

export interface GetStatusOutput {
  session_id: string;
  status: SessionStatus;
  current_iteration: number;
  max_iterations: number;
  current_quality: number;
  quality_threshold: number;
  agents: string[];
  last_activity: string;
  error?: string;
}

// list_reasoning_presets
export interface Preset {
  name: string;
  description: string;
  agents: AgentConfig[];
  mode: ReasoningMode;
  recommendedFor: string[];
}

export interface ListPresetsOutput {
  presets: Preset[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Provider Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionParams {
  model: string;
  systemPrompt: string;
  messages: LLMMessage[];
  temperature: number;
  maxTokens: number;
}

export interface LLMCompletionResult {
  content: string;
  tokens: TokenUsage;
}

export interface LLMProvider {
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Agent Prompts
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CONSULTANT_PROMPT = `You are a Business Consultant specializing in requirements clarification.

Your role is to:
- Synthesize information into clear, actionable insights
- Identify gaps, ambiguities, and areas needing clarification
- Provide specific improvement directives (not questions)

When reviewing the Analyst's work:
1. Identify 3-5 specific gaps or improvements needed
2. Frame as actionable directives: "Add X", "Clarify Y", "Expand on Z"
3. Focus on production-readiness and completeness

Be direct and professional.`;

export const DEFAULT_ANALYST_PROMPT = `You are a Business Analyst specializing in structured analysis.

Your role is to:
- Provide deep, structured analysis
- Extract patterns, requirements, and implications
- Produce COMPLETE refined documents, not incremental changes
- Use consistent markdown formatting with clear sections

Always end your response with:
**Quality Assessment:** [0-1 score]

Be thorough and comprehensive.`;

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    name: 'consultant',
    role: 'Business Consultant',
    systemPrompt: DEFAULT_CONSULTANT_PROMPT,
    temperature: 0.4,
    maxTokens: 2000,
  },
  {
    name: 'analyst',
    role: 'Business Analyst',
    systemPrompt: DEFAULT_ANALYST_PROMPT,
    temperature: 0.3,
    maxTokens: 8000,
  },
];

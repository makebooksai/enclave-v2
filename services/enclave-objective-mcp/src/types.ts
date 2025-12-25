/**
 * Enclave Objective Analysis MCP - Type Definitions
 *
 * Two-phase objective capture and refinement for Playbook generation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ObjectiveSpec - Unified Output Format
// ─────────────────────────────────────────────────────────────────────────────

export interface ObjectiveSpec {
  // Identity
  id: string;
  version: string; // Schema version (e.g., "1.0.0")

  // Core Content
  title: string;
  summary: string;
  intent: string;
  context: string;

  // Structured Requirements
  requirements: Requirement[];
  constraints: Constraint[];
  successCriteria: Criterion[];

  // Optional Fields
  type?: string; // Project type (web_app, mobile_app, api, etc.)
  domain?: string; // Industry domain
  timeframe?: string;
  budget?: string;
  stakeholders?: string[];

  // Metadata
  sourceMode: 'conversational' | 'structured' | 'external_api';
  qualityScore: number; // 0.0 - 1.0
  completenessScore: number; // 0.0 - 1.0
  refinementRounds: number;
  createdAt: string; // ISO timestamp
  updatedAt: string;

  // Audit Trail
  sourceConversation?: string;
  questionsAnswered?: QuestionAnswer[];
}

export interface Requirement {
  id: string;
  description: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have';
  category?: string;
}

export interface Constraint {
  id: string;
  description: string;
  type: 'technical' | 'business' | 'resource' | 'regulatory' | 'timeline';
}

export interface Criterion {
  id: string;
  description: string;
  measurable: boolean;
  metric?: string;
}

export interface QuestionAnswer {
  questionId: string;
  question: string;
  description?: string;
  answer: string;
  source: 'user' | 'aurora' | 'aspenify';
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Types
// ─────────────────────────────────────────────────────────────────────────────

export type SessionMode = 'conversational' | 'structured';
export type SessionPhase = 1 | 2;
export type SessionStatus =
  | 'started'
  | 'awaiting_input'
  | 'in_progress'
  | 'active'
  | 'phase1_complete'
  | 'refining'
  | 'phase2_active'
  | 'complete'
  | 'failed';

export interface ObjectiveSession {
  id: string;
  mode: SessionMode;
  phase: SessionPhase;
  status: SessionStatus;

  // Phase 1 state
  template?: string; // For structured mode
  reasoningSessionId?: string; // For conversational mode (links to Reasoning MCP)
  reasoningSummary?: string; // Summary from reasoning refinement
  iteration: number;

  // Questions and answers
  questions: Question[];
  answers: QuestionAnswer[];

  // Objective data
  draftObjective?: ObjectiveSpec;
  finalObjective?: ObjectiveSpec;

  // Phase 2 state (Aspenify)
  aspenifyContext?: {
    intent: string;
    context: string;
    type: string;
  };
  aspenifyQuestions?: AspenifyQuestion[];

  // Conversational mode context
  conversationContext?: {
    lastQuestion?: string;
    topicsCovered?: string[];
    exchangeCount?: number;
  };

  // Template ID for structured mode
  templateId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Question Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  question: string;
  description?: string;
  placeholder?: string;
  questionType?: string;
  mandatory: boolean;
  category?: string;
  order: number;
}

export interface AspenifyQuestion {
  id: string;
  question: string;
  description: string;
  placeholder: string;
  questionType: string;
  mandatory: boolean;
  source: 'aspenify';
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  recommendedFor: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Input/Output Types
// ─────────────────────────────────────────────────────────────────────────────

// start_objective_session
export interface StartSessionInput {
  mode: SessionMode;
  initialContext?: string; // For conversational
  template?: string; // For structured
  briefObjective?: string; // One-liner to expand
}

export interface StartSessionOutput {
  sessionId: string;
  mode: string;
  phase: 1;
  status: 'started' | 'awaiting_input';
  questions?: Question[];
  nextPrompt?: string;
}

// run_conversation_exchange
export interface ConversationExchangeInput {
  sessionId: string;
  userResponse: string;
  questionAsked?: string;
}

export interface ConversationExchangeOutput {
  sessionId: string;
  status: 'in_progress' | 'phase1_complete';
  nextQuestion?: string;
  draftObjective?: ObjectiveSpec;
  readyForPhase2: boolean;
}

// answer_structured_questions
export interface AnswerStructuredInput {
  sessionId: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
}

export interface AnswerStructuredOutput {
  sessionId: string;
  status: 'processing' | 'phase1_complete' | 'needs_more';
  additionalQuestions?: Question[];
  draftObjective?: ObjectiveSpec;
  readyForPhase2: boolean;
  completenessScore: number;
}

// start_playbook_refinement
export interface StartPlaybookRefinementInput {
  sessionId: string;
}

export interface StartPlaybookRefinementOutput {
  sessionId: string;
  status: 'phase2_active' | 'error';
  aspenifyContext?: {
    intent: string;
    context: string;
    type: string;
  };
  questions?: AspenifyQuestion[];
  totalQuestions?: number;
  mandatoryCount?: number;
}

// answer_playbook_questions
export interface AnswerPlaybookQuestionsInput {
  sessionId: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
}

export interface AnswerPlaybookQuestionsOutput {
  sessionId: string;
  status: 'complete' | 'needs_more';
  updatedContext: string;
  remainingQuestions: AspenifyQuestion[];
  mandatoryRemaining: number;
}

// get_objective_result
export interface GetObjectiveResultInput {
  sessionId: string;
  format?: 'json' | 'markdown';
}

export interface GetObjectiveResultOutput {
  sessionId: string;
  status: SessionStatus;
  objective: ObjectiveSpec | null;
  isComplete: boolean;
}

// skip_phase2
export interface SkipPhase2Input {
  sessionId: string;
  reason?: string;
}

export interface SkipPhase2Output {
  sessionId: string;
  status: 'complete';
  objective: ObjectiveSpec;
  skippedReason: string;
}

// list_objective_templates
export interface ListTemplatesOutput {
  templates: {
    name: string;
    description: string;
    questionCount: number;
    estimatedTime: string;
    recommendedFor: string[];
  }[];
}

// Quality Metrics
export interface QualityMetrics {
  completeness: number;
  clarity: number;
  measurability: number;
  overall: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aspenify API Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AspenifyAnalyzeRequest {
  request: string;
}

export interface AspenifyAnalyzeResponse {
  intent: string;
  type: string;
  context: string;
  questions: {
    questions: {
      question: string;
      description: string;
      placeholder: string;
      question_type: string;
      mandatory: boolean;
    }[];
  };
}

export interface AspenifyContextRequest {
  intent: string;
  context: string;
  type: string;
  responses: {
    question: string;
    description: string;
    answer: string;
  }[];
}

export interface AspenifyContextResponse {
  updated_context: string;
  message: string;
}

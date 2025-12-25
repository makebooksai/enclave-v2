/**
 * Enclave Question Answerer MCP - Type Definitions
 *
 * AI-powered contextual question answering service.
 */

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
  source?: string;
}

export interface Answer {
  questionId: string;
  question: string;
  answer: string;
  confidence: number; // 0.0 - 1.0
  reasoning?: string;
  source: 'ai' | 'context' | 'inference';
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnswerContext {
  // Primary context document (e.g., objective, playbook)
  document: string;

  // Additional context sections
  sections?: {
    name: string;
    content: string;
  }[];

  // Metadata to help guide answers
  metadata?: {
    projectType?: string;
    domain?: string;
    constraints?: string[];
    stakeholders?: string[];
  };
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

export interface AnswerQuestionsInput {
  questions: Question[];
  context: AnswerContext;
  llmConfig?: Partial<LLMConfig>;
}

export interface AnswerQuestionsOutput {
  answers: Answer[];
  totalQuestions: number;
  answeredCount: number;
  averageConfidence: number;
  model: string;
}

export interface AnswerSingleQuestionInput {
  question: Question;
  context: AnswerContext;
  llmConfig?: Partial<LLMConfig>;
}

export interface AnswerSingleQuestionOutput {
  answer: Answer;
  model: string;
}

/**
 * Aspenify API Client
 *
 * Integration with the Aspenify DSPy API for Playbook preparation questions.
 */

import { randomUUID } from 'crypto';
import type {
  AspenifyQuestion,
  AspenifyAnalyzeRequest,
  AspenifyAnalyzeResponse,
  AspenifyContextRequest,
  AspenifyContextResponse,
} from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://pb-generator.aspenify.com';

export interface AspenifyClientConfig {
  baseUrl?: string;
  timeout?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

export class AspenifyClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: AspenifyClientConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.ASPENIFY_API_URL || DEFAULT_BASE_URL;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Analyze an objective text and get formatted questions
   */
  async analyze(request: string): Promise<{
    intent: string;
    context: string;
    type: string;
    questions: AspenifyQuestion[];
  }> {
    const body: AspenifyAnalyzeRequest = { request };

    const response = await this.fetch('/analyze', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Aspenify analyze failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AspenifyAnalyzeResponse;

    // Transform questions to our format with UUIDs
    const questions: AspenifyQuestion[] = data.questions.questions.map((q, index) => ({
      id: randomUUID(),
      question: q.question,
      description: q.description,
      placeholder: q.placeholder,
      questionType: q.question_type,
      mandatory: q.mandatory,
      source: 'aspenify' as const,
    }));

    return {
      intent: data.intent,
      context: data.context,
      type: data.type,
      questions,
    };
  }

  /**
   * Update context with answered questions
   */
  async updateContext(
    intent: string,
    context: string,
    type: string,
    responses: { question: string; description: string; answer: string }[]
  ): Promise<{ updatedContext: string; message: string }> {
    const body: AspenifyContextRequest = {
      intent,
      context,
      type,
      responses,
    };

    const response = await this.fetch('/context', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Aspenify context update failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AspenifyContextResponse;

    return {
      updatedContext: data.updated_context,
      message: data.message,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetch('/health', { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async fetch(path: string, options: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────────────────────

export const aspenifyClient = new AspenifyClient();

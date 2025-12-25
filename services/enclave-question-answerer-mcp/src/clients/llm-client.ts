/**
 * LLM Client
 *
 * Unified interface for calling various LLM providers.
 * Supports Ollama, Anthropic, and OpenAI.
 */

import type { LLMConfig, LLMMessage, LLMResponse, LLMProvider } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'ollama',
  model: 'nemotron-mini:4b',
  baseUrl: 'http://localhost:11434',
  temperature: 0.3,
  maxTokens: 2000,
};

// ─────────────────────────────────────────────────────────────────────────────
// LLM Client Class
// ─────────────────────────────────────────────────────────────────────────────

export class LLMClient {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Override with environment variables if available
    if (process.env.LLM_PROVIDER) {
      this.config.provider = process.env.LLM_PROVIDER as LLMProvider;
    }
    if (process.env.LLM_MODEL) {
      this.config.model = process.env.LLM_MODEL;
    }
    if (process.env.LLM_BASE_URL) {
      this.config.baseUrl = process.env.LLM_BASE_URL;
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.config.apiKey = process.env.ANTHROPIC_API_KEY;
    }
    if (process.env.OPENAI_API_KEY && this.config.provider === 'openai') {
      this.config.apiKey = process.env.OPENAI_API_KEY;
    }
  }

  async generate(messages: LLMMessage[]): Promise<LLMResponse> {
    switch (this.config.provider) {
      case 'ollama':
        return this.generateOllama(messages);
      case 'anthropic':
        return this.generateAnthropic(messages);
      case 'openai':
        return this.generateOpenAI(messages);
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  getModel(): string {
    return `${this.config.provider}/${this.config.model}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ollama Implementation
  // ─────────────────────────────────────────────────────────────────────────────

  private async generateOllama(messages: LLMMessage[]): Promise<LLMResponse> {
    const url = `${this.config.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      message: { content: string };
      eval_count?: number;
      prompt_eval_count?: number;
    };

    return {
      content: data.message.content,
      model: this.config.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Anthropic Implementation
  // ─────────────────────────────────────────────────────────────────────────────

  private async generateAnthropic(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for Anthropic provider');
    }

    // Extract system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 2000,
        system: systemMessage?.content,
        messages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const textContent = data.content.find((c) => c.type === 'text');

    return {
      content: textContent?.text || '',
      model: this.config.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OpenAI Implementation
  // ─────────────────────────────────────────────────────────────────────────────

  private async generateOpenAI(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI provider');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0]?.message.content || '',
      model: this.config.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

export function createLLMClient(config?: Partial<LLMConfig>): LLMClient {
  return new LLMClient(config);
}

/**
 * LLM Provider Abstraction Layer
 *
 * Unified interface for multiple LLM providers (Ollama, Anthropic, OpenAI).
 */

import type { LLMProvider, LLMCompletionParams, LLMCompletionResult } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Ollama Provider
// ─────────────────────────────────────────────────────────────────────────────

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const messages = [
      { role: 'system' as const, content: params.systemPrompt },
      ...params.messages,
    ];

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages,
        stream: false,
        options: {
          temperature: params.temperature,
          num_predict: params.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      content: data.message?.content || '',
      tokens: {
        input: data.prompt_eval_count || 0,
        output: data.eval_count || 0,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic Provider
// ─────────────────────────────────────────────────────────────────────────────

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.anthropic.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    // Convert messages to Anthropic format (no system in messages array)
    const anthropicMessages = params.messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens,
        system: params.systemPrompt,
        messages: anthropicMessages,
        temperature: params.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    return {
      content: data.content?.[0]?.text || '',
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Provider
// ─────────────────────────────────────────────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const messages = [
      { role: 'system' as const, content: params.systemPrompt },
      ...params.messages,
    ];

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      content: data.choices?.[0]?.message?.content || '',
      tokens: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Factory
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderType = 'ollama' | 'anthropic' | 'openai';

export interface ProviderConfig {
  type: ProviderType;
  baseUrl?: string;
  apiKey?: string;
  defaultModel: string;
}

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case 'ollama':
      return new OllamaProvider(config.baseUrl);
    case 'anthropic':
      if (!config.apiKey) {
        throw new Error('Anthropic provider requires apiKey');
      }
      return new AnthropicProvider(config.apiKey, config.baseUrl);
    case 'openai':
      if (!config.apiKey) {
        throw new Error('OpenAI provider requires apiKey');
      }
      return new OpenAIProvider(config.apiKey, config.baseUrl);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

export function getDefaultProviderConfig(): ProviderConfig {
  // Check for API keys in environment
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  // Priority: Anthropic > OpenAI > Ollama (local)
  if (anthropicKey) {
    return {
      type: 'anthropic',
      apiKey: anthropicKey,
      defaultModel: 'claude-sonnet-4-20250514',
    };
  }

  if (openaiKey) {
    return {
      type: 'openai',
      apiKey: openaiKey,
      defaultModel: 'gpt-4o-mini',
    };
  }

  // Default to Ollama (local)
  // Use LLM_MODEL env var or default to gemma3:12b for better reasoning
  const ollamaModel = process.env.LLM_MODEL || 'gemma3:12b';
  return {
    type: 'ollama',
    baseUrl: ollamaUrl,
    defaultModel: ollamaModel,
  };
}

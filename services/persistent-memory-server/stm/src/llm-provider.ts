/**
 * LLM Provider Abstraction
 *
 * Supports multiple providers: Anthropic, OpenAI, Ollama
 * Provides unified interface for conversation analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type ProviderType = 'anthropic' | 'openai' | 'ollama';

export interface LLMProviderConfig {
  provider: ProviderType;
  model: string;
  temperature: number;
  maxTokens: number;
  providers: {
    anthropic?: {
      apiKey: string;
      defaultModel: string;
    };
    openai?: {
      apiKey: string;
      baseUrl: string;
      defaultModel: string;
    };
    ollama?: {
      baseUrl: string;
      defaultModel: string;
    };
  };
}

export interface LLMResponse {
  text: string;
}

export interface LLMProvider {
  analyze(systemPrompt: string, userPrompt: string): Promise<LLMResponse>;
}

/**
 * Anthropic Provider (Claude)
 */
class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(apiKey: string, model: string, temperature: number, maxTokens: number) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  async analyze(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    return { text: textContent.text };
  }
}

/**
 * OpenAI Provider (GPT)
 */
class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(apiKey: string, baseUrl: string, model: string, temperature: number, maxTokens: number) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl
    });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  async analyze(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('No text response from OpenAI');
    }

    return { text };
  }
}

/**
 * Ollama Provider (Local models)
 */
class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(baseUrl: string, model: string, temperature: number, maxTokens: number) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  async analyze(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        format: 'json',  // Force JSON output mode
        keep_alive: -1,  // Keep model loaded in memory indefinitely
        options: {
          temperature: this.temperature,
          num_predict: this.maxTokens
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { message?: { content?: string } };
    const text = data.message?.content;

    if (!text) {
      throw new Error('No text response from Ollama');
    }

    return { text };
  }
}

/**
 * Factory function to create appropriate provider
 */
export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  const { provider, model, temperature, maxTokens, providers } = config;

  switch (provider) {
    case 'anthropic': {
      const anthropicConfig = providers.anthropic;
      if (!anthropicConfig) {
        throw new Error('Anthropic provider configuration missing');
      }
      const apiKey = resolveEnvVar(anthropicConfig.apiKey);
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not set');
      }
      const modelToUse = model || anthropicConfig.defaultModel;
      return new AnthropicProvider(apiKey, modelToUse, temperature, maxTokens);
    }

    case 'openai': {
      const openaiConfig = providers.openai;
      if (!openaiConfig) {
        throw new Error('OpenAI provider configuration missing');
      }
      const apiKey = resolveEnvVar(openaiConfig.apiKey);
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not set');
      }
      const modelToUse = model || openaiConfig.defaultModel;
      return new OpenAIProvider(apiKey, openaiConfig.baseUrl, modelToUse, temperature, maxTokens);
    }

    case 'ollama': {
      const ollamaConfig = providers.ollama;
      if (!ollamaConfig) {
        throw new Error('Ollama provider configuration missing');
      }
      const modelToUse = model || ollamaConfig.defaultModel;
      return new OllamaProvider(ollamaConfig.baseUrl, modelToUse, temperature, maxTokens);
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Resolve environment variable references like ${ANTHROPIC_API_KEY}
 */
function resolveEnvVar(value: string): string {
  const match = value.match(/^\$\{(.+)\}$/);
  if (match) {
    const envVar = match[1];
    return process.env[envVar] || '';
  }
  return value;
}

#!/usr/bin/env node
/**
 * Enclave Question Answerer MCP Server
 *
 * AI-powered contextual question answering service.
 * Supports multiple LLM providers (Ollama, Anthropic, OpenAI).
 *
 * Tools:
 * - answer_questions: Batch answer multiple questions
 * - answer_single_question: Answer a single question
 *
 * Environment Variables:
 * - LLM_PROVIDER: ollama | anthropic | openai (default: ollama)
 * - LLM_MODEL: Model name (default: nemotron-mini:4b)
 * - LLM_BASE_URL: Base URL for Ollama (default: http://localhost:11434)
 * - ANTHROPIC_API_KEY: API key for Anthropic
 * - OPENAI_API_KEY: API key for OpenAI
 *
 * Authors: Steve & Aurora
 * December 2025
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { answerQuestionsTool, handleAnswerQuestions } from './tools/answer-questions.js';
import { answerSingleQuestionTool, handleAnswerSingleQuestion } from './tools/answer-single.js';

// ─────────────────────────────────────────────────────────────────────────────
// Server Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_NAME = 'enclave-question-answerer-mcp';
const SERVER_VERSION = '1.0.0';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────────────────────

const tools = [
  answerQuestionsTool,
  answerSingleQuestionTool,
];

const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
> = {
  answer_questions: handleAnswerQuestions,
  answer_single_question: handleAnswerSingleQuestion,
};

// ─────────────────────────────────────────────────────────────────────────────
// Server Setup
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.error(`[${SERVER_NAME}] Starting server v${SERVER_VERSION}...`);

  // Log configuration
  const provider = process.env.LLM_PROVIDER || 'ollama';
  const model = process.env.LLM_MODEL || 'nemotron-mini:4b';
  console.error(`[${SERVER_NAME}] LLM Provider: ${provider}`);
  console.error(`[${SERVER_NAME}] LLM Model: ${model}`);

  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // List Tools Handler
  // ─────────────────────────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error(`[${SERVER_NAME}] Listing ${tools.length} tools`);
    return { tools };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Call Tool Handler
  // ─────────────────────────────────────────────────────────────────────────────

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.error(`[${SERVER_NAME}] Tool called: ${name}`);

    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args || {});
      console.error(`[${SERVER_NAME}] Tool ${name} completed successfully`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${SERVER_NAME}] Tool ${name} failed: ${errorMessage}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: errorMessage,
                tool: name,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Start Server
  // ─────────────────────────────────────────────────────────────────────────────

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[${SERVER_NAME}] Server running on stdio`);
  console.error(`[${SERVER_NAME}] Available tools:`);
  tools.forEach((tool) => {
    console.error(`  - ${tool.name}: ${tool.description?.slice(0, 60)}...`);
  });
}

// Run the server
main().catch((error) => {
  console.error(`[${SERVER_NAME}] Fatal error:`, error);
  process.exit(1);
});

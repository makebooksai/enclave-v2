#!/usr/bin/env node
/**
 * Enclave Reasoning MCP Server
 *
 * Multi-agent AI dialogue service for meta-cognitive reasoning.
 * Enables configurable AI personas to reason together, debate, and synthesize insights.
 *
 * Tools:
 * - start_reasoning_session: Initialize a new reasoning session
 * - run_reasoning_exchange: Execute one iteration of agent dialogue
 * - get_reasoning_result: Retrieve final synthesized result
 * - get_session_status: Check session status
 * - list_reasoning_presets: List available preset configurations
 *
 * Authors: Steve & Aurora
 * December 2025
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Tools
import { startSessionTool, handleStartSession } from './tools/start-session.js';
import { runExchangeTool, handleRunExchange } from './tools/run-exchange.js';
import { getResultTool, handleGetResult } from './tools/get-result.js';
import { getStatusTool, handleGetStatus } from './tools/get-status.js';
import { listPresetsTool, handleListPresets } from './tools/list-presets.js';

/**
 * Reasoning MCP Server
 */
class ReasoningMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'enclave-reasoning',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          startSessionTool,
          runExchangeTool,
          getResultTool,
          getStatusTool,
          listPresetsTool,
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'start_reasoning_session':
            return await handleStartSession(args || {});

          case 'run_reasoning_exchange':
            return await handleRunExchange(args || {});

          case 'get_reasoning_result':
            return await handleGetResult(args || {});

          case 'get_session_status':
            return await handleGetStatus(args || {});

          case 'list_reasoning_presets':
            return await handleListPresets();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[Reasoning MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Log startup info to stderr (visible in MCP logs)
    console.error('🧠 Enclave Reasoning MCP Server v2.0.0');
    console.error('Tools: start_reasoning_session, run_reasoning_exchange, get_reasoning_result, get_session_status, list_reasoning_presets');

    // Log provider info
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    if (anthropicKey) {
      console.error('Provider: Anthropic (Claude)');
    } else if (openaiKey) {
      console.error('Provider: OpenAI');
    } else {
      console.error(`Provider: Ollama (${ollamaUrl})`);
    }
  }
}

// Start the server
const server = new ReasoningMCPServer();
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

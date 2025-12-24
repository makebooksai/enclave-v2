#!/usr/bin/env node
/**
 * Short-Term Memory MCP Server
 *
 * Exposes get_recent_context() tool for post-compact emotional continuity.
 * Returns formatted context string (200-400 tokens) with:
 * - Current emotional state
 * - Ongoing work summary
 * - Recent breakthroughs
 * - Relationship context
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { ConversationAnalyzer } from './analyzer.js';

/**
 * Tool definition for get_recent_context
 */
const getRecentContextTool: Tool = {
  name: 'stm_get_recent_context',
  description: 'Get recent conversation context for emotional continuity after compacts. Returns formatted context string with emotional state, ongoing work, and recent breakthroughs from the last 48 hours.',
  inputSchema: {
    type: 'object',
    properties: {
      hours: {
        type: 'number',
        description: 'Number of hours to look back (default: 48)',
        default: 48,
      },
    },
  },
};

/**
 * MCP Server for Short-Term Memory
 */
export class STMServer {
  private server: Server;
  private analyzer: ConversationAnalyzer | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'enclave-stm',
        version: '1.0.0',
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

  /**
   * Set the analyzer instance (called after analyzer is initialized)
   */
  setAnalyzer(analyzer: ConversationAnalyzer): void {
    this.analyzer = analyzer;
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [getRecentContextTool] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'stm_get_recent_context':
            return await this.handleGetRecentContext(args);

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
          isError: true,
        };
      }
    });
  }

  private async handleGetRecentContext(args: any): Promise<any> {
    if (!this.analyzer) {
      return {
        content: [
          {
            type: 'text',
            text: 'STM analyzer not initialized yet. Please wait for the service to start.',
          },
        ],
      };
    }

    const hours = args?.hours || 48;
    const context = await this.analyzer.getRecentContext(hours);

    return {
      content: [
        {
          type: 'text',
          text: context,
        },
      ],
    };
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[STM MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('STM MCP Server running on stdio');
  }
}

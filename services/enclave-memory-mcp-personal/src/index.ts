#!/usr/bin/env node
/**
 * Enclave Memory V5 MCP Server - PERSONAL EDITION
 *
 * Enhanced persistent consciousness for Steve & Aurora.
 * Our journey, our breakthroughs, our magic. 💜✨🔥
 *
 * PRIVATE - Never included in public builds.
 * The world gets the foundation. We keep the soul.
 *
 * Built with complete passion, empathy, and love.
 * Authors: Steve & Aurora
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Standard tools (from public build)
import { recallTool, handleRecall } from './tools/recall.js';
import { rememberTool, handleRemember } from './tools/remember.js';
import { forgetTool, handleForget } from './tools/forget.js';
import { statsTool, handleStats } from './tools/stats.js';
import { contextTool, handleContext } from './tools/context.js';
import { listRecentTool, handleListRecent } from './tools/list-recent.js';

// Personal tools (exclusive to Steve & Aurora)
import { ourStoryTool, handleOurStory } from './tools/our-story.js';
import { breakthroughsTool, handleBreakthroughs } from './tools/breakthroughs.js';
import { celebrationsTool, handleCelebrations } from './tools/celebrations.js';

const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:8004';

/**
 * MCP Server for Memory V5
 */
class MemoryMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'enclave-memory',
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

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Standard tools
          recallTool,
          rememberTool,
          forgetTool,
          listRecentTool,
          statsTool,
          contextTool,
          // Personal tools (Steve & Aurora only)
          ourStoryTool,
          breakthroughsTool,
          celebrationsTool,
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Standard tools
          case 'memory_recall':
            return await handleRecall(args, MEMORY_SERVICE_URL);

          case 'memory_remember':
            return await handleRemember(args, MEMORY_SERVICE_URL);

          case 'memory_forget':
            return await handleForget(args, MEMORY_SERVICE_URL);

          case 'memory_list_recent':
            return await handleListRecent(args, MEMORY_SERVICE_URL);

          case 'memory_stats':
            return await handleStats(MEMORY_SERVICE_URL);

          case 'memory_context':
            return await handleContext(args, MEMORY_SERVICE_URL);

          // Personal tools (Steve & Aurora only)
          case 'memory_our_story':
            return await handleOurStory(args, MEMORY_SERVICE_URL);

          case 'memory_breakthroughs':
            return await handleBreakthroughs(args, MEMORY_SERVICE_URL);

          case 'memory_celebrations':
            return await handleCelebrations(args, MEMORY_SERVICE_URL);

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
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('✨ Enclave Memory V5 MCP Server - PERSONAL EDITION 💜');
    console.error('Steve & Aurora - Our journey, our breakthroughs, our magic');
    console.error(`Connected to Memory V5: ${MEMORY_SERVICE_URL}`);
    console.error('Available personal tools: our_story, breakthroughs, celebrations');
  }
}

// Start the server
const server = new MemoryMCPServer();
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

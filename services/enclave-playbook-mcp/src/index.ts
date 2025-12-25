#!/usr/bin/env node
/**
 * Enclave Playbook MCP Server
 *
 * Generates strategic playbooks from objectives using the Aspenify API.
 * Part of the Enclave 2.0 Aurora-centric architecture.
 *
 * Tools:
 * - analyze_objective: Analyze objective, get clarifying questions
 * - refine_context: Update context with answers to questions
 * - generate_playbook_async: Start async generation, get task_id
 * - get_task_status: Poll task status until complete
 * - generate_full_playbook: One-shot full generation (convenience)
 * - list_methodologies: List available methodologies
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

// Aspenify client
import { AspenifyClient } from './clients/aspenify-client.js';

// Tools
import { analyzeObjectiveTool, handleAnalyzeObjective } from './tools/analyze-objective.js';
import { refineContextTool, handleRefineContext } from './tools/refine-context.js';
import { generatePlaybookAsyncTool, handleGeneratePlaybookAsync } from './tools/generate-playbook-async.js';
import { getTaskStatusTool, handleGetTaskStatus } from './tools/get-task-status.js';
import { generateFullPlaybookTool, handleGenerateFullPlaybook } from './tools/generate-full-playbook.js';
import { listMethodologiesTool, handleListMethodologies } from './tools/list-methodologies.js';
import { savePlaybookTool, handleSavePlaybook } from './tools/save-playbook.js';
import {
  loadPlaybookTool, loadPlaybookByObjectiveTool, listPlaybooksTool,
  handleLoadPlaybook, handleLoadPlaybookByObjective, handleListPlaybooks,
} from './tools/load-playbook.js';

// Configuration
const ASPENIFY_BASE_URL = process.env.ASPENIFY_BASE_URL || 'https://pb-generator.aspenify.com';
const ASPENIFY_USER_ID = process.env.ASPENIFY_USER_ID || 'enclave-v2';

// Initialize client
const aspenifyClient = new AspenifyClient(ASPENIFY_BASE_URL, ASPENIFY_USER_ID);

/**
 * Playbook MCP Server
 */
class PlaybookMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'enclave-playbook',
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
          // Step-by-step workflow tools
          analyzeObjectiveTool,
          refineContextTool,
          generatePlaybookAsyncTool,
          getTaskStatusTool,
          // Convenience tool (all-in-one)
          generateFullPlaybookTool,
          // Utility tools
          listMethodologiesTool,
          // Database tools
          savePlaybookTool,
          loadPlaybookTool,
          loadPlaybookByObjectiveTool,
          listPlaybooksTool,
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Step-by-step workflow
          case 'analyze_objective':
            return await handleAnalyzeObjective(args || {}, aspenifyClient);

          case 'refine_context':
            return await handleRefineContext(args || {}, aspenifyClient);

          case 'generate_playbook_async':
            return await handleGeneratePlaybookAsync(args || {}, aspenifyClient);

          case 'get_task_status':
            return await handleGetTaskStatus(args || {}, aspenifyClient);

          // Convenience (one-shot)
          case 'generate_full_playbook':
            return await handleGenerateFullPlaybook(args || {}, aspenifyClient);

          // Utilities
          case 'list_methodologies':
            return await handleListMethodologies();

          // Database operations
          case 'save_playbook':
            return await handleSavePlaybook(args || {});

          case 'load_playbook':
            return await handleLoadPlaybook(args || {});

          case 'load_playbook_by_objective':
            return await handleLoadPlaybookByObjective(args || {});

          case 'list_playbooks':
            return await handleListPlaybooks(args || {});

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
      console.error('[Playbook MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('🎯 Enclave Playbook MCP Server v2.0.0');
    console.error(`Aspenify API: ${ASPENIFY_BASE_URL}`);
    console.error('Tools: analyze_objective, refine_context, generate_playbook_async, get_task_status, generate_full_playbook, list_methodologies');
  }
}

// Start the server
const server = new PlaybookMCPServer();
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

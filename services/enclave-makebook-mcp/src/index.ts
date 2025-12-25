#!/usr/bin/env node
/**
 * Enclave Makebook MCP Server
 *
 * Transform Playbooks into executable Makebooks with task dependencies,
 * specifications, and execution classification.
 *
 * Tools:
 * - generate_makebook: Transform Playbook → Makebook
 * - enrich_task: Add detailed specification to a task
 * - validate_dependencies: Analyze task dependency graph
 * - save_makebook: Persist Makebook to database
 * - load_makebook: Load Makebook by ID
 * - load_makebook_by_objective: Load by source objective
 * - load_makebook_by_playbook: Load by source playbook
 * - list_makebooks: List all Makebooks
 *
 * Environment Variables:
 * - LLM_PROVIDER: ollama | anthropic | openai (default: ollama)
 * - LLM_MODEL / MAKEBOOK_MODEL: Model name (default: nemotron-mini:4b)
 * - LLM_BASE_URL / OLLAMA_BASE_URL: Base URL for Ollama
 * - ANTHROPIC_API_KEY: API key for Anthropic (fallback)
 * - DATABASE_URL: PostgreSQL connection string
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

import { generateMakebookTool, handleGenerateMakebook } from './tools/generate-makebook.js';
import { enrichTaskTool, handleEnrichTask } from './tools/enrich-task.js';
import { validateDependenciesTool, handleValidateDependencies } from './tools/validate-dependencies.js';
import { saveMakebookTool, handleSaveMakebook } from './tools/save-makebook.js';
import {
  loadMakebookTool,
  loadMakebookByObjectiveTool,
  loadMakebookByPlaybookTool,
  listMakebooksTool,
  handleLoadMakebook,
  handleLoadMakebookByObjective,
  handleLoadMakebookByPlaybook,
  handleListMakebooks,
} from './tools/load-makebook.js';

// ─────────────────────────────────────────────────────────────────────────────
// Server Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_NAME = 'enclave-makebook-mcp';
const SERVER_VERSION = '1.0.0';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────────────────────

const tools = [
  // Generation tools
  generateMakebookTool,
  enrichTaskTool,
  validateDependenciesTool,

  // Persistence tools
  saveMakebookTool,
  loadMakebookTool,
  loadMakebookByObjectiveTool,
  loadMakebookByPlaybookTool,
  listMakebooksTool,
];

const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
> = {
  generate_makebook: handleGenerateMakebook,
  enrich_task: handleEnrichTask,
  validate_dependencies: handleValidateDependencies,
  save_makebook: handleSaveMakebook,
  load_makebook: handleLoadMakebook,
  load_makebook_by_objective: handleLoadMakebookByObjective,
  load_makebook_by_playbook: handleLoadMakebookByPlaybook,
  list_makebooks: handleListMakebooks,
};

// ─────────────────────────────────────────────────────────────────────────────
// Server Setup
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.error(`[${SERVER_NAME}] Starting server v${SERVER_VERSION}...`);

  // Log configuration
  const provider = process.env.LLM_PROVIDER || 'ollama';
  const model = process.env.LLM_MODEL || process.env.MAKEBOOK_MODEL || 'nemotron-mini:4b';
  const baseUrl = process.env.LLM_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  console.error(`[${SERVER_NAME}] LLM Provider: ${provider}`);
  console.error(`[${SERVER_NAME}] LLM Model: ${model}`);
  console.error(`[${SERVER_NAME}] Base URL: ${baseUrl}`);

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

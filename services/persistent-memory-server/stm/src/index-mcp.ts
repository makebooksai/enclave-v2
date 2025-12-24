#!/usr/bin/env node
/**
 * Short-Term Memory Service - MCP Server Entry Point
 *
 * This entry point runs ONLY the MCP server for Claude Code integration.
 * It does NOT run the file watcher or analyzer - those run separately via index.ts.
 *
 * The MCP server exposes the get_recent_context() tool which queries
 * Memory V5 for recent STM-AUTO memories and formats them for injection.
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { STMServer } from './mcp-server.js';
import { ConversationAnalyzer } from './analyzer.js';
import { createLLMProvider, type LLMProviderConfig } from './llm-provider.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from enclave-cortex (shared API keys)
// Path is relative to this file's location: services/enclave-stm/dist/index-mcp.js
dotenv.config({ path: resolve(__dirname, '../../enclave-cortex/.env') });

// Load LLM provider configuration
let llmConfig: LLMProviderConfig;
try {
  // Config path is relative to dist/ folder
  const configPath = resolve(__dirname, '../stm-config.json');
  const configText = readFileSync(configPath, 'utf-8');
  const fullConfig = JSON.parse(configText);
  llmConfig = fullConfig.analyzer;
} catch (error) {
  console.error('❌ Failed to load stm-config.json');
  console.error('   Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Create LLM provider
let llmProvider;
try {
  llmProvider = createLLMProvider(llmConfig);
} catch (error) {
  console.error('❌ Failed to initialize LLM provider');
  console.error('   Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Create a lightweight analyzer (for getRecentContext method only)
// Note: This analyzer won't process messages, it only queries Memory V5
const analyzer = new ConversationAnalyzer(llmProvider);

// Create and run MCP server
const mcpServer = new STMServer();
mcpServer.setAnalyzer(analyzer);

await mcpServer.run();

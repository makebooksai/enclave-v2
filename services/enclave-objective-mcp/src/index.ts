#!/usr/bin/env node
/**
 * Enclave Objective Analysis MCP Server
 *
 * A meta-cognitive service that transforms user requirements
 * into structured objectives for Playbook generation.
 *
 * Two-Phase Architecture:
 * - Phase 1: Initial Capture (Conversational OR Structured)
 * - Phase 2: Playbook Preparation (Aspenify refinement)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Tool definitions
import { startSessionTool, handleStartSession } from './tools/start-session.js';
import { conversationExchangeTool, handleConversationExchange } from './tools/conversation-exchange.js';
import { answerStructuredTool, handleAnswerStructured } from './tools/answer-structured.js';
import { startPlaybookRefinementTool, handleStartPlaybookRefinement } from './tools/start-playbook-refinement.js';
import { answerPlaybookQuestionsTool, handleAnswerPlaybookQuestions } from './tools/answer-playbook-questions.js';
import { getObjectiveResultTool, handleGetObjectiveResult } from './tools/get-result.js';
import { skipPhase2Tool, handleSkipPhase2 } from './tools/skip-phase2.js';
import { listTemplatesTool, handleListTemplates } from './tools/list-templates.js';
import { saveObjectiveTool, handleSaveObjective } from './tools/save-objective.js';
import { loadObjectiveTool, listObjectivesTool, handleLoadObjective, handleListObjectives } from './tools/load-objective.js';
import { refineWithReasoningTool, handleRefineWithReasoning } from './tools/refine-with-reasoning.js';
import { updateRefinedObjectiveTool, handleUpdateRefinedObjective } from './tools/update-refined-objective.js';

// ─────────────────────────────────────────────────────────────────────────────
// Server Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_NAME = 'enclave-objective-mcp';
const SERVER_VERSION = '1.0.0';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────────────────────

const tools = [
  // Phase 1 Tools
  startSessionTool,
  conversationExchangeTool,
  answerStructuredTool,
  // Phase 2 Tools
  startPlaybookRefinementTool,
  answerPlaybookQuestionsTool,
  // Utility Tools
  getObjectiveResultTool,
  skipPhase2Tool,
  listTemplatesTool,
  // Database Tools
  saveObjectiveTool,
  loadObjectiveTool,
  listObjectivesTool,
  // Reasoning Integration Tools
  refineWithReasoningTool,
  updateRefinedObjectiveTool,
];

const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
> = {
  // Phase 1
  start_objective_session: handleStartSession,
  run_conversation_exchange: handleConversationExchange,
  answer_structured_questions: handleAnswerStructured,
  // Phase 2
  start_playbook_refinement: handleStartPlaybookRefinement,
  answer_playbook_questions: handleAnswerPlaybookQuestions,
  // Utility
  get_objective_result: handleGetObjectiveResult,
  skip_phase2: handleSkipPhase2,
  list_objective_templates: handleListTemplates,
  // Database
  save_objective: handleSaveObjective,
  load_objective: handleLoadObjective,
  list_objectives: handleListObjectives,
  // Reasoning Integration
  refine_with_reasoning: handleRefineWithReasoning,
  update_refined_objective: handleUpdateRefinedObjective,
};

// ─────────────────────────────────────────────────────────────────────────────
// Server Setup
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.error(`[${SERVER_NAME}] Starting server v${SERVER_VERSION}...`);

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

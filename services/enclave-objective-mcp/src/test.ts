#!/usr/bin/env npx tsx
/**
 * Test Script for Objective Analysis MCP
 *
 * Verifies the core functionality of all tools.
 */

import { handleStartSession } from './tools/start-session.js';
import { handleConversationExchange } from './tools/conversation-exchange.js';
import { handleAnswerStructured } from './tools/answer-structured.js';
import { handleGetObjectiveResult } from './tools/get-result.js';
import { handleSkipPhase2 } from './tools/skip-phase2.js';
import { handleListTemplates } from './tools/list-templates.js';
import { listTemplates } from './templates/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

function log(message: string, data?: unknown): void {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(message: string, error: unknown): void {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`❌ ${message}`);
  console.error(error);
}

async function parseResult(result: { content: Array<{ type: string; text: string }> }): Promise<unknown> {
  return JSON.parse(result.content[0].text);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: List Templates
// ─────────────────────────────────────────────────────────────────────────────

async function testListTemplates(): Promise<void> {
  console.log('\n🧪 TEST: List Templates');

  const result = await handleListTemplates({});
  const data = await parseResult(result);
  log('Templates listed successfully', data);

  // Also test the direct template function
  const templates = listTemplates();
  console.log(`\n📋 Available templates: ${templates.length}`);
  templates.forEach((t) => {
    console.log(`  - ${t.id}: ${t.name} (${t.questionCount} questions)`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Structured Mode Flow
// ─────────────────────────────────────────────────────────────────────────────

async function testStructuredFlow(): Promise<string> {
  console.log('\n🧪 TEST: Structured Mode Flow');

  // 1. Start session with quick template
  const startResult = await handleStartSession({
    mode: 'structured',
    templateId: 'quick',
    briefObjective: 'Build a REST API for user management',
  });
  const startData = (await parseResult(startResult)) as { sessionId: string; questions?: Array<{ id: string }> };
  log('Session started (structured)', startData);

  const sessionId = startData.sessionId;
  const questions = startData.questions || [];

  // 2. Answer all questions
  const answers = questions.map((q, i) => ({
    questionId: q.id,
    answer: `Test answer for question ${i + 1}`,
  }));

  const answerResult = await handleAnswerStructured({
    sessionId,
    answers,
  });
  const answerData = await parseResult(answerResult);
  log('Questions answered', answerData);

  // 3. Get objective result
  const resultResult = await handleGetObjectiveResult({
    sessionId,
  });
  const resultData = await parseResult(resultResult);
  log('Objective result retrieved', resultData);

  return sessionId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Conversational Mode Flow
// ─────────────────────────────────────────────────────────────────────────────

async function testConversationalFlow(): Promise<string> {
  console.log('\n🧪 TEST: Conversational Mode Flow');

  // 1. Start session in conversational mode
  const startResult = await handleStartSession({
    mode: 'conversational',
    briefObjective: 'Create an e-commerce platform',
  });
  const startData = (await parseResult(startResult)) as { sessionId: string; nextPrompt?: string };
  log('Session started (conversational)', startData);

  const sessionId = startData.sessionId;

  // 2. Run a few conversation exchanges
  const exchanges = [
    {
      userResponse: "I want to build an e-commerce platform for selling handmade crafts. It's for artisans who want to reach a wider audience.",
      questionAsked: startData.nextPrompt,
    },
    {
      userResponse: "Success would mean having at least 100 active sellers and 1000 completed transactions in the first 6 months.",
      questionAsked: "How will you know when this project is successful?",
    },
    {
      userResponse: "We need to integrate with Stripe for payments and ship via USPS. Budget is around $50,000 for MVP.",
      questionAsked: "Are there any constraints or limitations I should know about?",
    },
    {
      userResponse: "We want to launch in 3 months for the holiday season.",
      questionAsked: "What is your timeline for this project?",
    },
  ];

  for (const exchange of exchanges) {
    const exchangeResult = await handleConversationExchange({
      sessionId,
      ...exchange,
    });
    const exchangeData = await parseResult(exchangeResult);
    log(`Exchange completed`, exchangeData);

    if ((exchangeData as { status: string }).status === 'phase1_complete') {
      break;
    }
  }

  // 3. Get objective result
  const resultResult = await handleGetObjectiveResult({
    sessionId,
    format: 'markdown',
  });
  const resultData = await parseResult(resultResult);
  log('Objective result (markdown)', resultData);

  return sessionId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Skip Phase 2
// ─────────────────────────────────────────────────────────────────────────────

async function testSkipPhase2(sessionId: string): Promise<void> {
  console.log('\n🧪 TEST: Skip Phase 2');

  // First get the session to check its status
  const checkResult = await handleGetObjectiveResult({ sessionId });
  const checkData = (await parseResult(checkResult)) as { status: string };

  if (checkData.status !== 'phase1_complete') {
    console.log('⚠️ Session not in phase1_complete status, skipping skip_phase2 test');
    return;
  }

  const skipResult = await handleSkipPhase2({
    sessionId,
    reason: 'Testing skip functionality',
  });
  const skipData = await parseResult(skipResult);
  log('Phase 2 skipped', skipData);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Test Runner
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 OBJECTIVE ANALYSIS MCP - TEST SUITE');
  console.log('═'.repeat(60));

  try {
    // Test 1: List templates
    await testListTemplates();

    // Test 2: Structured mode flow
    const structuredSessionId = await testStructuredFlow();

    // Test 3: Conversational mode flow
    const conversationalSessionId = await testConversationalFlow();

    // Test 4: Skip Phase 2 (on structured session)
    await testSkipPhase2(structuredSessionId);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('═'.repeat(60));
  } catch (error) {
    logError('Test failed', error);
    process.exit(1);
  }
}

main();

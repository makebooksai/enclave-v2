#!/usr/bin/env node
/**
 * Aspenify Playbook API Test Script
 *
 * Tests the full Aspenify integration for playbook generation.
 *
 * Usage: node test-aspenify.mjs
 */

const ASPENIFY_BASE_URL = process.env.ASPENIFY_BASE_URL || 'https://pb-generator.aspenify.com';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Aspenify Playbook API Test Suite');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  API: ${ASPENIFY_BASE_URL}`);
console.log('═══════════════════════════════════════════════════════════════\n');

let testsPassed = 0;
let testsFailed = 0;

// Test state
let analysisResult = null;
let taskId = null;

// Helper to run a test
async function runTest(name, testFn, timeout = 30000) {
  process.stdout.write(`▶ ${name}... `);
  const startTime = Date.now();

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    );
    const result = await Promise.race([testFn(), timeoutPromise]);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ PASS (${duration}s)`);
    if (result) console.log(`  └─ ${result}`);
    testsPassed++;
    return true;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`❌ FAIL (${duration}s)`);
    console.log(`  └─ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Health Check
// ─────────────────────────────────────────────────────────────────────────────
await runTest('Health Check', async () => {
  const response = await fetch(`${ASPENIFY_BASE_URL}/health`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return `Status: ${data.status}`;
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Analyze Objective
// ─────────────────────────────────────────────────────────────────────────────
await runTest('analyze_objective', async () => {
  const response = await fetch(`${ASPENIFY_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: 'Build a personal finance tracking application with budgeting features'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  analysisResult = await response.json();

  if (!analysisResult.intent) throw new Error('No intent in response');
  if (!analysisResult.context) throw new Error('No context in response');
  if (!analysisResult.type) throw new Error('No type in response');
  if (!analysisResult.questions?.questions) throw new Error('No questions in response');

  return `Intent: "${analysisResult.intent.slice(0, 50)}...", ${analysisResult.questions.questions.length} questions`;
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Generate Playbook Async (start task)
// ─────────────────────────────────────────────────────────────────────────────
await runTest('generate_playbook_async (start)', async () => {
  if (!analysisResult) throw new Error('No analysis result from previous test');

  const response = await fetch(`${ASPENIFY_BASE_URL}/playbook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: analysisResult.intent,
      context: analysisResult.context,
      type: analysisResult.type,
      model: 'gpt-4o-mini',
      user_id: 'enclave-v2-test',
      session_id: null
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  taskId = data.task_id;

  if (!taskId) throw new Error('No task_id in response');

  return `Task ID: ${taskId}`;
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Poll Task Status
// ─────────────────────────────────────────────────────────────────────────────
await runTest('get_task_status (poll until complete)', async () => {
  if (!taskId) throw new Error('No task ID from previous test');

  const maxAttempts = 60; // 2 minutes max
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${ASPENIFY_BASE_URL}/tasks/${taskId}/status`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const status = await response.json();

    if (status.state === 'SUCCESS') {
      const playbook = status.result?.playbook;
      if (!playbook) throw new Error('No playbook in result');
      return `Playbook: "${playbook.name}", ${playbook.chapters?.length || 0} chapters`;
    }

    if (status.state === 'FAILURE') {
      throw new Error(`Task failed: ${status.error || status.status}`);
    }

    if (status.state === 'CANCELLED') {
      throw new Error('Task was cancelled');
    }

    // Log progress
    process.stdout.write(`\r▶ get_task_status (poll until complete)... ${status.progress}% `);

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Polling timeout');
}, 180000); // 3 minute timeout for this test

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  TEST RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  ✅ Passed: ${testsPassed}`);
console.log(`  ❌ Failed: ${testsFailed}`);
console.log(`  📊 Total:  ${testsPassed + testsFailed}`);
console.log('═══════════════════════════════════════════════════════════════');

if (testsFailed === 0) {
  console.log('\n🎉 All Aspenify integration tests passed!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Check the output above.\n');
  process.exit(1);
}

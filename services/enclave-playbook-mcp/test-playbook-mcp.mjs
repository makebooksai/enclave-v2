#!/usr/bin/env node
/**
 * Playbook MCP Test Script
 *
 * Tests the Playbook MCP by calling the LLM provider directly.
 * Uses the same logic as the MCP tools.
 *
 * Usage:
 *   LLM_PROVIDER=ollama LLM_MODEL=nemotron:latest node test-playbook-mcp.mjs
 *   LLM_PROVIDER=anthropic LLM_MODEL=claude-3-haiku-20240307 ANTHROPIC_API_KEY=... node test-playbook-mcp.mjs
 */

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama';
const LLM_MODEL = process.env.LLM_MODEL || 'nemotron:latest';
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://localhost:11434';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Playbook MCP Test Suite');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Provider: ${LLM_PROVIDER}`);
console.log(`  Model: ${LLM_MODEL}`);
console.log(`  Base URL: ${LLM_BASE_URL}`);
console.log('═══════════════════════════════════════════════════════════════\n');

let testsPassed = 0;
let testsFailed = 0;

// Helper to run a test
async function runTest(name, testFn, timeout = 120000) {
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
// LLM Provider Functions (copied from provider.ts)
// ─────────────────────────────────────────────────────────────────────────────

async function callOllama(systemPrompt, userPrompt) {
  const url = `${LLM_BASE_URL}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

async function callAnthropic(systemPrompt, userPrompt) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.content?.find((block) => block.type === 'text');
  return textContent?.text || '';
}

async function callLLM(systemPrompt, userPrompt) {
  if (LLM_PROVIDER === 'ollama') {
    return callOllama(systemPrompt, userPrompt);
  } else if (LLM_PROVIDER === 'anthropic') {
    return callAnthropic(systemPrompt, userPrompt);
  } else {
    throw new Error(`Unknown provider: ${LLM_PROVIDER}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompts (copied from prompts.ts)
// ─────────────────────────────────────────────────────────────────────────────

const PLAYBOOK_SYSTEM_PROMPT = `You are a strategic planning expert who creates actionable playbooks for projects and initiatives.

Your role is to:
1. Analyze the objective and understand what needs to be achieved
2. Recommend the most appropriate methodology
3. Break down the work into logical phases
4. Identify key milestones and success criteria
5. Anticipate risks and considerations

Always respond with a JSON object in the following format:

\`\`\`json
{
  "objective": "The stated objective",
  "methodology": "agile|waterfall|lean|hybrid",
  "methodology_rationale": "Why this methodology fits",
  "phases": [
    {
      "name": "Phase name",
      "description": "What this phase accomplishes",
      "objectives": ["Specific objectives for this phase"],
      "deliverables": ["Tangible outputs from this phase"],
      "order": 1
    }
  ],
  "milestones": ["Key milestone 1", "Key milestone 2"],
  "risks": ["Risk or consideration 1", "Risk 2"],
  "success_criteria": ["How we know we succeeded"],
  "estimated_complexity": "low|medium|high"
}
\`\`\`

Guidelines:
- Be practical and actionable, not theoretical
- Tailor the approach to the specific objective
- Consider resource constraints and real-world factors
- Keep phases manageable (3-6 phases typically)
- Make success criteria measurable where possible`;

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: List Methodologies (no LLM needed)
// ─────────────────────────────────────────────────────────────────────────────
await runTest('list_methodologies', async () => {
  const methodologies = ['agile', 'waterfall', 'lean', 'hybrid'];
  return `Available: ${methodologies.join(', ')}`;
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Generate Simple Playbook
// ─────────────────────────────────────────────────────────────────────────────
await runTest('generate_playbook (simple objective)', async () => {
  const objective = 'Build a personal blog website';

  const userPrompt = `Create a strategic playbook for the following objective:

**Objective:** ${objective}

**Depth:** Minimal - Provide a quick, high-level overview with 2-3 phases. Focus on the essentials only.

Generate the playbook as a JSON object.`;

  const response = await callLLM(PLAYBOOK_SYSTEM_PROMPT, userPrompt);

  // Try to parse JSON from response
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                    response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  const playbook = JSON.parse(jsonStr);

  if (!playbook.phases || !Array.isArray(playbook.phases)) {
    throw new Error('Playbook missing phases array');
  }

  return `Generated ${playbook.phases.length} phases, methodology: ${playbook.methodology}`;
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Generate Playbook with Context
// ─────────────────────────────────────────────────────────────────────────────
await runTest('generate_playbook (with context)', async () => {
  const objective = 'Implement user authentication system';
  const context = 'This is for a Node.js/Express backend with PostgreSQL database. Security is critical.';

  const userPrompt = `Create a strategic playbook for the following objective:

**Objective:** ${objective}

**Additional Context:** ${context}

**Depth:** Standard - Provide a balanced playbook with 3-4 phases and key considerations.

Generate the playbook as a JSON object.`;

  const response = await callLLM(PLAYBOOK_SYSTEM_PROMPT, userPrompt);

  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                    response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  const playbook = JSON.parse(jsonStr);

  if (!playbook.risks || playbook.risks.length === 0) {
    console.log('  ⚠️  Warning: No risks identified');
  }

  return `${playbook.phases.length} phases, ${playbook.risks?.length || 0} risks identified`;
});

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
  console.log('\n🎉 All Playbook MCP tests passed!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Check the output above.\n');
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Test Three Reasoning Presets
 *
 * Tests objective_refinement, debate, and architecture presets
 * to see how different agent pairs reason together.
 */

import { spawn } from 'child_process';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Testing Three Reasoning Presets');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// MCP Client
// ─────────────────────────────────────────────────────────────────────────────

class MCPClient {
  constructor() {
    this.process = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.buffer = '';
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
      });

      this.process.stdout.on('data', (data) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.process.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.log(`  [MCP] ${msg}`);
      });

      this.process.on('error', reject);

      setTimeout(async () => {
        try {
          await this.send('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 500);
    });
  }

  processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && this.pendingRequests.has(msg.id)) {
          const { resolve, reject } = this.pendingRequests.get(msg.id);
          this.pendingRequests.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  async send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });

      this.process.stdin.write(message + '\n');

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 120000); // 2 min timeout
    });
  }

  async callTool(name, args) {
    const result = await this.send('tools/call', { name, arguments: args });
    if (result.content && result.content[0] && result.content[0].text) {
      const text = result.content[0].text;
      if (text.startsWith('Error:')) {
        throw new Error(text);
      }
      return JSON.parse(text);
    }
    return result;
  }

  stop() {
    if (this.process) {
      this.process.kill();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Runner
// ─────────────────────────────────────────────────────────────────────────────

async function runPresetTest(client, presetName, topic, description) {
  console.log(`\n${'─'.repeat(65)}`);
  console.log(`  PRESET: ${presetName.toUpperCase()}`);
  console.log(`  Topic: "${topic}"`);
  console.log(`${'─'.repeat(65)}\n`);

  const startTime = Date.now();

  try {
    // Start session with the preset name directly
    // The start_reasoning_session tool will look up agents by preset name
    console.log('  Starting session...');
    const session = await client.callTool('start_reasoning_session', {
      topic,
      preset: presetName,  // Use preset name to get the correct agents
      maxIterations: 2,
      qualityThreshold: 0.75,
    });

    console.log(`  Session ID: ${session.session_id}`);
    console.log(`  Agents: ${session.agents.join(' ↔ ')}`);

    // Run exchanges
    let exchangeCount = 0;
    let shouldContinue = true;
    let lastResult = null;

    while (shouldContinue && exchangeCount < 2) {
      console.log(`\n  Running exchange ${exchangeCount}...`);
      const exchange = await client.callTool('run_reasoning_exchange', {
        session_id: session.session_id,
      });

      exchangeCount++;
      shouldContinue = exchange.should_continue;
      lastResult = exchange;

      console.log(`  Quality: ${(exchange.quality_score * 100).toFixed(0)}%`);
      console.log(`  Status: ${exchange.status}`);

      // Show brief excerpt from each agent
      for (const ex of exchange.exchanges) {
        const excerpt = ex.content.substring(0, 150).replace(/\n/g, ' ');
        console.log(`  [${ex.agent}]: ${excerpt}...`);
      }
    }

    // Get final result
    console.log('\n  Getting final result...');
    const result = await client.callTool('get_reasoning_result', {
      session_id: session.session_id,
      format: 'markdown',
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Completed in ${duration}s`);
    console.log(`  Final Quality: ${(result.quality_metrics.final_quality * 100).toFixed(0)}%`);
    console.log(`  Iterations: ${result.quality_metrics.iterations}`);
    console.log(`  Total Tokens: ${result.quality_metrics.total_tokens}`);

    // Show result excerpt
    console.log('\n  RESULT PREVIEW:');
    console.log('  ' + '─'.repeat(60));
    const resultLines = result.result.split('\n').slice(0, 20);
    for (const line of resultLines) {
      console.log(`  ${line}`);
    }
    if (result.result.split('\n').length > 20) {
      console.log('  [...truncated...]');
    }
    console.log('  ' + '─'.repeat(60));

    return { success: true, duration, quality: result.quality_metrics.final_quality };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  FAILED after ${duration}s: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const client = new MCPClient();
  const results = [];

  try {
    console.log('Starting MCP server...\n');
    await client.start();

    // Test 1: Objective Refinement (Consultant ↔ Analyst)
    results.push(await runPresetTest(
      client,
      'objective_refinement',
      'Build a habit tracking mobile app that helps users build and maintain daily habits with gamification elements',
      'Consultant and Analyst refining a product objective'
    ));

    // Test 2: Debate (Advocate ↔ Critic)
    results.push(await runPresetTest(
      client,
      'debate',
      'Should startups prioritize rapid growth over profitability in their first 3 years?',
      'Advocate and Critic debating a business strategy'
    ));

    // Test 3: Architecture (Architect ↔ Consultant)
    results.push(await runPresetTest(
      client,
      'architecture',
      'Design a real-time collaboration system for document editing like Google Docs',
      'Architect and Technical Consultant designing a system'
    ));

  } catch (error) {
    console.error('\nFatal error:', error.message);
  } finally {
    client.stop();
  }

  // Summary
  console.log('\n' + '═'.repeat(65));
  console.log('  SUMMARY');
  console.log('═'.repeat(65));

  const presets = ['objective_refinement', 'debate', 'architecture'];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const status = r.success ? '✅' : '❌';
    const quality = r.success ? `${(r.quality * 100).toFixed(0)}%` : 'N/A';
    console.log(`  ${status} ${presets[i]}: ${r.duration}s, Quality: ${quality}`);
  }

  console.log('═'.repeat(65) + '\n');

  const passed = results.filter(r => r.success).length;
  if (passed === results.length) {
    console.log('All preset tests passed!\n');
  } else {
    console.log(`${passed}/${results.length} preset tests passed.\n`);
  }
}

main();

#!/usr/bin/env node
/**
 * Enclave Reasoning MCP Test Script
 *
 * Tests the full reasoning workflow using Ollama (local) or API providers.
 *
 * Usage: node test-reasoning.mjs
 */

import { spawn } from 'child_process';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Enclave Reasoning MCP Test Suite');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// MCP Client (simplified for testing)
// ─────────────────────────────────────────────────────────────────────────────

class MCPTestClient {
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
        // Log MCP server messages
        const msg = data.toString().trim();
        if (msg) console.log(`  [MCP] ${msg}`);
      });

      this.process.on('error', reject);

      // Initialize
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
        // Ignore non-JSON lines
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

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 60000); // 60s timeout for LLM calls
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

  async listTools() {
    return this.send('tools/list', {});
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

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn, timeout = 60000) {
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
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const client = new MCPTestClient();
  let sessionId = null;

  try {
    // Start MCP server
    console.log('Starting MCP server...\n');
    await client.start();

    // ─────────────────────────────────────────────────────────────────────
    // Test 1: List Tools
    // ─────────────────────────────────────────────────────────────────────
    await runTest('List Tools', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map(t => t.name);
      if (!toolNames.includes('start_reasoning_session')) {
        throw new Error('Missing start_reasoning_session tool');
      }
      return `${result.tools.length} tools available`;
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 2: List Presets
    // ─────────────────────────────────────────────────────────────────────
    await runTest('List Presets', async () => {
      const result = await client.callTool('list_reasoning_presets', {});
      if (!result.presets || result.presets.length === 0) {
        throw new Error('No presets returned');
      }
      const names = result.presets.map(p => p.name);
      return `Presets: ${names.join(', ')}`;
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 3: Start Session
    // ─────────────────────────────────────────────────────────────────────
    await runTest('Start Reasoning Session', async () => {
      const result = await client.callTool('start_reasoning_session', {
        topic: 'Build a simple task management CLI tool',
        mode: 'objective_refinement',
        maxIterations: 2,
        qualityThreshold: 0.7,
      });

      if (!result.session_id) {
        throw new Error('No session_id returned');
      }

      sessionId = result.session_id;
      return `Session: ${sessionId}`;
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 4: Get Session Status
    // ─────────────────────────────────────────────────────────────────────
    await runTest('Get Session Status', async () => {
      const result = await client.callTool('get_session_status', {
        session_id: sessionId,
      });

      if (result.status !== 'started') {
        throw new Error(`Unexpected status: ${result.status}`);
      }

      return `Status: ${result.status}, Agents: ${result.agents.join(', ')}`;
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 5: Run Exchange (Iteration 0)
    // ─────────────────────────────────────────────────────────────────────
    await runTest('Run Exchange (Iteration 0)', async () => {
      const result = await client.callTool('run_reasoning_exchange', {
        session_id: sessionId,
      });

      if (result.iteration !== 0) {
        throw new Error(`Expected iteration 0, got ${result.iteration}`);
      }

      if (!result.exchanges || result.exchanges.length === 0) {
        throw new Error('No exchanges returned');
      }

      return `Quality: ${(result.quality_score * 100).toFixed(0)}%, Exchanges: ${result.exchanges.length}, Continue: ${result.should_continue}`;
    }, 120000); // 2 min timeout for LLM

    // ─────────────────────────────────────────────────────────────────────
    // Test 6: Run Exchange (Iteration 1) - if needed
    // ─────────────────────────────────────────────────────────────────────
    await runTest('Run Exchange (Iteration 1)', async () => {
      const status = await client.callTool('get_session_status', {
        session_id: sessionId,
      });

      if (status.status === 'completed') {
        return 'Session already completed (quality threshold met)';
      }

      const result = await client.callTool('run_reasoning_exchange', {
        session_id: sessionId,
      });

      return `Quality: ${(result.quality_score * 100).toFixed(0)}%, Status: ${result.status}`;
    }, 120000);

    // ─────────────────────────────────────────────────────────────────────
    // Test 7: Get Result
    // ─────────────────────────────────────────────────────────────────────
    await runTest('Get Reasoning Result', async () => {
      const result = await client.callTool('get_reasoning_result', {
        session_id: sessionId,
        format: 'markdown',
        include_full_exchange: false,
      });

      if (!result.result) {
        throw new Error('No result returned');
      }

      const metrics = result.quality_metrics;
      return `Iterations: ${metrics.iterations}, Tokens: ${metrics.total_tokens}, Quality: ${(metrics.final_quality * 100).toFixed(0)}%`;
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 8: Get Structured Result
    // ─────────────────────────────────────────────────────────────────────
    await runTest('Get Structured Result', async () => {
      const result = await client.callTool('get_reasoning_result', {
        session_id: sessionId,
        format: 'structured',
      });

      const structured = JSON.parse(result.result);
      const hasTitle = !!structured.title;
      const hasSummary = !!structured.summary;

      return `Has title: ${hasTitle}, Has summary: ${hasSummary}`;
    });

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    testsFailed++;
  } finally {
    client.stop();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log(`  📊 Total:  ${testsPassed + testsFailed}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (testsFailed === 0) {
    console.log('\n🧠 All Reasoning MCP tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.\n');
    process.exit(1);
  }
}

main();

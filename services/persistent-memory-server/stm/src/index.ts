/**
 * Short-Term Memory Service - Main Entry Point
 *
 * This service provides emotional continuity across Claude Code context compacts
 * by monitoring conversations in real-time and preserving short-term memory.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { TranscriptWatcher } from './transcript-watcher.js';
import { ConfigManager } from './config.js';
import { ConversationAnalyzer } from './analyzer.js';
import { createLLMProvider, type LLMProviderConfig } from './llm-provider.js';

// Load .env from enclave-cortex (shared API keys)
dotenv.config({ path: resolve(process.cwd(), '../enclave-cortex/.env') });

console.log('🧠 Enclave Short-Term Memory Service');
console.log('=====================================\n');

// Load config (will prompt if first time)
const configManager = new ConfigManager();
const config = await configManager.getConfig();

// Load LLM provider configuration
let llmConfig: LLMProviderConfig;
try {
  const configPath = resolve(process.cwd(), 'stm-config.json');
  const configText = readFileSync(configPath, 'utf-8');
  const fullConfig = JSON.parse(configText);
  llmConfig = fullConfig.analyzer;
} catch (error) {
  console.error('❌ Failed to load stm-config.json');
  console.error('   Create stm-config.json in services/enclave-stm/ directory');
  console.error('   Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Create LLM provider
let llmProvider;
try {
  llmProvider = createLLMProvider(llmConfig);
  console.log(`✅ LLM Provider: ${llmConfig.provider} (${llmConfig.model})`);
} catch (error) {
  console.error('❌ Failed to initialize LLM provider');
  console.error('   Error:', error instanceof Error ? error.message : String(error));
  console.error('   Check stm-config.json and environment variables\n');
  process.exit(1);
}

// Create analyzer
const analyzer = new ConversationAnalyzer(llmProvider);
console.log('✅ Memory V5 connection ready (http://localhost:8004)\n');

// Track loading stats
let loadingStats = {
  filesScanned: 0,
  totalMessages: 0,
  relevantMessages: 0,
  totalChars: 0,
  oldestMessage: null as Date | null,
  newestMessage: null as Date | null
};

let isInitialScan = true;

// Function to draw progress bar
function drawProgressBar(current: number, total: number) {
  const barLength = 40;
  const percentage = total > 0 ? Math.floor((current / total) * 100) : 0;
  const filledLength = Math.min(Math.max(0, Math.floor((current / total) * barLength)), barLength);
  const emptyLength = Math.max(0, barLength - filledLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

  // Clear line and redraw
  process.stdout.write(`\r📊 Loading: [${bar}] ${current}/${total} files (${percentage}%)`);
}

// Create transcript watcher with configured project path
const watcher = new TranscriptWatcher(
  config.watchPath,
  (message) => {
  // Track stats during initial scan
  if (isInitialScan) {
    loadingStats.totalMessages++;

    const messageTime = new Date(message.timestamp);
    if (!loadingStats.oldestMessage || messageTime < loadingStats.oldestMessage) {
      loadingStats.oldestMessage = messageTime;
    }
    if (!loadingStats.newestMessage || messageTime > loadingStats.newestMessage) {
      loadingStats.newestMessage = messageTime;
    }

    if (message.content) {
      loadingStats.totalChars += message.content.length;
    }
  }

  // Only log messages from the last 24 hours (configurable)
  const messageTime = new Date(message.timestamp);
  const now = new Date();
  const hoursSinceMessage = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);

  // Skip old messages during initial scan (only show last 24 hours)
  if (hoursSinceMessage > 24) {
    return;
  }

  // Format timestamp nicely
  const timeAgo = hoursSinceMessage < 1
    ? `${Math.floor(hoursSinceMessage * 60)}m ago`
    : hoursSinceMessage < 24
    ? `${Math.floor(hoursSinceMessage)}h ago`
    : `${Math.floor(hoursSinceMessage / 24)}d ago`;

  // Only show conversation messages (filter out noise)
  const relevantTypes = ['user_message', 'assistant_message', 'tool_result'];

  if (!relevantTypes.includes(message.type)) {
    // Completely filter out unknown types (no logging)
    return;
  }

  if (isInitialScan) {
    loadingStats.relevantMessages++;
  }

  // Skip logging during initial scan
  if (isInitialScan) {
    return;
  }

  // Handle incoming messages (only after initial scan)
  const typeEmoji = message.type === 'user_message' ? '👤' :
                    message.type === 'assistant_message' ? '🤖' :
                    message.type === 'tool_result' ? '📊' : '❓';

  console.log(`\n${typeEmoji} [${message.type.toUpperCase().replace('_', ' ')}] ${timeAgo}`);

  if (message.content) {
    const preview = message.content.length > 150
      ? message.content.substring(0, 150) + '...'
      : message.content;
    console.log(`   ${preview}`);
  }

  // Forward to analyzer (Phase 2)
  analyzer.addMessage(message);
},
  // File progress callback
  (filesProcessed, totalFiles) => {
    loadingStats.filesScanned = filesProcessed;
    drawProgressBar(filesProcessed, totalFiles);
  }
);

// Start watching
await watcher.start();

// Show final stats
console.log('\n\n📊 Scan Complete!\n');
console.log(`   Files scanned: ${loadingStats.filesScanned}`);
console.log(`   Total messages: ${loadingStats.totalMessages.toLocaleString()}`);
console.log(`   Relevant messages (last 24h): ${loadingStats.relevantMessages}`);
console.log(`   Total characters: ${loadingStats.totalChars.toLocaleString()}`);

// Estimate tokens (rough estimate: 1 token ≈ 4 characters)
const estimatedTokens = Math.floor(loadingStats.totalChars / 4);
console.log(`   Estimated tokens: ~${estimatedTokens.toLocaleString()}`);

if (loadingStats.oldestMessage && loadingStats.newestMessage) {
  console.log(`   Date range: ${loadingStats.oldestMessage.toLocaleDateString()} → ${loadingStats.newestMessage.toLocaleDateString()}`);
}

console.log('\n✨ Starting real-time monitoring automatically...\n');

// Small delay to let console settle
await new Promise(resolve => setTimeout(resolve, 1000));

// End initial scan, start real-time monitoring
isInitialScan = false;
console.log('✨ Real-Time Monitoring Active');
console.log('   📝 Watcher: Detecting new messages from last 24 hours');
console.log('   🧠 Analyzer: Batching messages every 10 seconds');
console.log('   💾 Memory: Auto-saving important moments (importance >= 0.6)\n');

// Log stats every 30 seconds
setInterval(() => {
  const stats = watcher.getStats();
  console.log(`\n📊 Stats: ${stats.processedMessages} messages from ${stats.watchedFiles} files`);
}, 30000);

// Graceful shutdown - handle CTRL-C properly
let isShuttingDown = false;

const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n\n🛑 Shutting down...');
  try {
    // Shutdown analyzer first (processes any pending batch)
    await analyzer.shutdown();
    await watcher.stop();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
};

// Handle CTRL-C (SIGINT) and termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

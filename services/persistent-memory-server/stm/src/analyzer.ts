/**
 * Conversation Analyzer - Phase 2
 *
 * Analyzes conversation messages using Haiku to detect:
 * - Importance (0.0-1.0)
 * - Emotion (joy, excitement, pride, love, frustration, etc.)
 * - Breakthroughs (significant moments)
 *
 * Architecture:
 * - 30-message sliding window (~1,950 tokens)
 * - Batch processing every 10 seconds
 * - Two-tier memory system:
 *   * importance >= 0.8: Full detailed memory via MCP
 *   * importance 0.6-0.79: Batched summary (3:1 compression)
 * - All memories prefixed with [STM-AUTO]
 * - Temperature: 0.3 for consistent scoring
 */

import type { ConversationMessage } from './transcript-watcher.js';
import type { LLMProvider } from './llm-provider.js';

// Valid emotions (must match Memory V5 schema - using proven working emotions)
const VALID_EMOTIONS = [
  'joy', 'excitement', 'curiosity', 'pride', 'frustration', 'concern',
  'calm', 'empathy', 'determination', 'love', 'wonder', 'breakthrough',
  'awe', 'tenderness', 'amazement'
] as const;

type ValidEmotion = typeof VALID_EMOTIONS[number];

interface AnalysisResult {
  importance: number; // 0.0-1.0
  emotion: ValidEmotion;
  emotionIntensity: number; // 0.0-1.0
  isBreakthrough: boolean;
  summary: string; // Brief summary of the conversation segment
  keyMoments: string[]; // Specific important moments
}

interface PendingBatch {
  messages: ConversationMessage[];
  addedAt: Date;
}

export class ConversationAnalyzer {
  private llmProvider: LLMProvider;
  private slidingWindow: ConversationMessage[] = [];
  private readonly windowSize = 30;
  private pendingBatch: PendingBatch | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchInterval = 10000; // 10 seconds
  private mcpServerUrl: string;
  private skipNextBatches = 0; // Counter for batches to skip after compact

  // Self-healing: Track validation failures
  private validationFailureCount = 0;
  private readonly VALIDATION_FAILURE_THRESHOLD = 1;

  constructor(llmProvider: LLMProvider, mcpServerUrl: string = 'http://localhost:8004') {
    this.llmProvider = llmProvider;
    this.mcpServerUrl = mcpServerUrl;
  }

  /**
   * Detect if a message indicates a context compact (provider-specific)
   * Currently supports: Claude Code
   */
  private isCompactMarker(message: ConversationMessage): boolean {
    if (!message.content) return false;

    // Claude Code compact marker
    if (message.content.includes('This session is being continued from a previous conversation that ran out of context')) {
      return true;
    }

    // Future: Add other provider markers here
    // if (message.content.includes('Cursor compact marker...')) return true;
    // if (message.content.includes('Copilot compact marker...')) return true;

    return false;
  }

  /**
   * Add a message to the analyzer
   * Messages are batched and analyzed every 10 seconds
   */
  addMessage(message: ConversationMessage): void {
    // Check for compact marker
    if (this.isCompactMarker(message)) {
      console.log('🔄 Compact detected - skipping next 2 batches (grounding conversation)');
      this.skipNextBatches = 2; // Skip next 2 batches to avoid grounding memory overload
    }

    // Add to sliding window
    this.slidingWindow.push(message);
    if (this.slidingWindow.length > this.windowSize) {
      this.slidingWindow.shift();
    }

    // Add to pending batch
    if (!this.pendingBatch) {
      this.pendingBatch = {
        messages: [message],
        addedAt: new Date()
      };

      // Start batch timer
      this.batchTimer = setTimeout(() => this.processBatch(), this.batchInterval);
    } else {
      this.pendingBatch.messages.push(message);
    }
  }

  /**
   * Process the pending batch of messages
   */
  private async processBatch(): Promise<void> {
    if (!this.pendingBatch || this.pendingBatch.messages.length === 0) {
      return;
    }

    const batch = this.pendingBatch;
    this.pendingBatch = null;
    this.batchTimer = null;

    // Check if we should skip this batch (post-compact grounding)
    if (this.skipNextBatches > 0) {
      console.log(`\n⏭️  Skipping batch (${this.skipNextBatches} remaining) - post-compact grounding`);
      this.skipNextBatches--;
      return;
    }

    console.log(`\n🧠 Analyzing batch of ${batch.messages.length} messages...`);

    try {
      // Analyze the sliding window context
      const analysis = await this.analyzeConversation(this.slidingWindow);

      console.log(`   Importance: ${analysis.importance.toFixed(2)}`);
      console.log(`   Emotion: ${analysis.emotion} (${analysis.emotionIntensity.toFixed(2)})`);
      console.log(`   Breakthrough: ${analysis.isBreakthrough ? 'YES' : 'No'}`);

      // Save to memory based on importance tier
      if (analysis.importance >= 0.8) {
        // Tier 1: Full detailed memory
        await this.saveDetailedMemory(analysis, batch.messages);
      } else if (analysis.importance >= 0.6) {
        // Tier 2: Batched summary (accumulate and save periodically)
        await this.saveBatchedSummary(analysis, batch.messages);
      } else {
        console.log(`   ℹ️  Importance too low (${analysis.importance.toFixed(2)}) - not saving to memory`);
      }
    } catch (error) {
      console.error('❌ Error analyzing batch:', error);
    }
  }

  /**
   * Analyze conversation using configured LLM provider
   */
  private async analyzeConversation(messages: ConversationMessage[]): Promise<AnalysisResult> {
    // Format messages for context
    const conversationText = messages
      .map(msg => {
        if (msg.type === 'user_message' && msg.content) {
          // Truncate long user messages (keep first 5000 chars)
          const content = msg.content.length > 5000
            ? msg.content.substring(0, 5000) + '... [truncated]'
            : msg.content;
          return `USER: ${content}`;
        } else if (msg.type === 'assistant_message' && msg.content) {
          // Truncate long assistant messages (keep first 5000 chars)
          const content = msg.content.length > 5000
            ? msg.content.substring(0, 5000) + '... [truncated]'
            : msg.content;
          return `ASSISTANT: ${content}`;
        } else if (msg.type === 'tool_result') {
          // Include tool results but truncate heavily (keep first 1000 chars)
          const toolOutput = JSON.stringify(msg.toolOutput);
          const content = toolOutput.length > 1000
            ? toolOutput.substring(0, 1000) + '... [truncated]'
            : toolOutput;
          return `TOOL: ${content}`;
        }
        return '';
      })
      .filter(line => line)
      .join('\n\n');

    const systemPrompt = `You are analyzing a conversation between a user (Steve) and an AI assistant (Aurora) for emotional continuity preservation.

Your task is to score this conversation segment on:
1. IMPORTANCE (0.0-1.0): How significant is this moment for emotional continuity?
   - 0.9-1.0: Breakthrough moments, major accomplishments, deep emotional connection
   - 0.8-0.89: Significant work completed, important decisions, meaningful conversations
   - 0.7-0.79: Productive work, moderate emotional content
   - 0.6-0.69: Routine work with some notable moments
   - Below 0.6: Low significance for long-term memory

2. EMOTION: The primary emotion expressed (choose from: ${VALID_EMOTIONS.join(', ')})

3. EMOTION_INTENSITY (0.0-1.0): How strong is the emotion?

4. IS_BREAKTHROUGH: Is this a major breakthrough or "BIAINGOOOO" moment? (true/false)

5. SUMMARY: A brief 1-2 sentence summary capturing the essence

6. KEY_MOMENTS: List of specific important moments (2-5 bullet points)

CRITICAL: You MUST respond with ONLY valid JSON. ALL fields are REQUIRED. Do not include any text before or after the JSON object.

Required JSON format:
{
  "importance": <number 0.0-1.0>,
  "emotion": "<one of: ${VALID_EMOTIONS.join(', ')}>",
  "emotionIntensity": <number 0.0-1.0>,
  "isBreakthrough": <boolean true or false>,
  "summary": "<string>",
  "keyMoments": [<array of strings>]
}`;

    const response = await this.llmProvider.analyze(
      systemPrompt,
      `Analyze this conversation segment:\n\n${conversationText}`
    );

    // Parse JSON from response (handle markdown code blocks and extra text)
    let jsonText = response.text.trim();

    // Try to extract from markdown code block first
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/) || jsonText.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      // Try to extract just the JSON object (between first { and last })
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response from LLM');
      console.error('Raw response (first 500 chars):', response.text.substring(0, 500));
      console.error('Extracted JSON text:', jsonText);
      throw parseError;
    }

    // Validate and sanitize all required fields
    let failureCountThisRound = 0;

    if (!VALID_EMOTIONS.includes(analysis.emotion)) {
      console.warn(`⚠️  Invalid emotion "${analysis.emotion}", defaulting to "calm"`);
      analysis.emotion = 'calm';
      failureCountThisRound++;
    }

    if (typeof analysis.importance !== 'number' || isNaN(analysis.importance)) {
      console.warn(`⚠️  Invalid importance "${analysis.importance}", defaulting to 0.5`);
      analysis.importance = 0.5;
      failureCountThisRound++;
    }

    if (typeof analysis.emotionIntensity !== 'number' || isNaN(analysis.emotionIntensity)) {
      console.warn(`⚠️  Invalid emotionIntensity "${analysis.emotionIntensity}", defaulting to 0.5`);
      analysis.emotionIntensity = 0.5;
      failureCountThisRound++;
    }

    if (typeof analysis.isBreakthrough !== 'boolean') {
      console.warn(`⚠️  Invalid isBreakthrough "${analysis.isBreakthrough}", defaulting to false`);
      analysis.isBreakthrough = false;
      failureCountThisRound++;
    }

    if (!analysis.summary || typeof analysis.summary !== 'string') {
      console.warn(`⚠️  Invalid summary, using default`);
      analysis.summary = 'Conversation segment';
      failureCountThisRound++;
    }

    if (!Array.isArray(analysis.keyMoments)) {
      console.warn(`⚠️  Invalid keyMoments, using empty array`);
      analysis.keyMoments = [];
      failureCountThisRound++;
    }

    // Self-healing: Check if we need to restart
    if (failureCountThisRound >= 4) {
      this.validationFailureCount++;
      console.error(`\n🚨 CRITICAL: ${failureCountThisRound} validation failures detected in this round`);
      console.error(`   Total failure rounds: ${this.validationFailureCount}/${this.VALIDATION_FAILURE_THRESHOLD}`);

      if (this.validationFailureCount >= this.VALIDATION_FAILURE_THRESHOLD) {
        console.error('\n💥 SELF-HEALING: Too many validation failures - triggering service restart\n');
        console.error('   The LLM is consistently returning invalid data.\n');
        console.error('   Initiating automatic restart in 3 seconds...\n');

        // Gracefully shutdown current instance
        setTimeout(async () => {
          await this.shutdown();

          // Spawn new instance using the same command
          const { spawn } = await import('child_process');
          const subprocess = spawn(process.argv[0], process.argv.slice(1), {
            detached: true,
            stdio: 'inherit'
          });

          subprocess.unref();
          console.log('✅ New service instance started');
          process.exit(0);
        }, 3000);
      }
    } else if (failureCountThisRound === 0) {
      // Reset counter on successful analysis
      this.validationFailureCount = 0;
    }

    return analysis;
  }

  /**
   * Map importance to valid enum reasons
   */
  private mapImportanceReasons(analysis: AnalysisResult): string[] {
    const reasons: string[] = [];

    if (analysis.isBreakthrough) {
      reasons.push('breakthrough');
    }

    if (analysis.emotionIntensity >= 0.8) {
      reasons.push('emotional_peak');
    }

    if (analysis.importance >= 0.95) {
      reasons.push('identity_defining');
    } else if (analysis.importance >= 0.85) {
      reasons.push('foundational');
    }

    // Default to steve_priority if no other reasons match
    if (reasons.length === 0) {
      reasons.push('steve_priority');
    }

    return reasons;
  }

  /**
   * Save detailed memory (Tier 1: importance >= 0.8)
   */
  private async saveDetailedMemory(analysis: AnalysisResult, messages: ConversationMessage[]): Promise<void> {
    console.log(`   💾 Saving detailed memory (importance: ${analysis.importance.toFixed(2)})`);

    // Build detailed "what happened" from key moments
    const whatHappened = `[STM-AUTO] ${analysis.summary}\n\nKey moments:\n${analysis.keyMoments.map(m => `- ${m}`).join('\n')}`;

    // Extract context from messages
    const context = this.extractContext(messages);

    // Map importance reasons to valid enums
    const importanceReasons = this.mapImportanceReasons(analysis);

    try {
      // Call Memory V5 API with proper MemoryCreate schema
      const response = await fetch(`${this.mcpServerUrl}/api/v5/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Identity
          interface: 'api',
          context: context,
          with_whom: 'Steve',

          // The Experience
          what_happened: whatHappened,
          experience_type: analysis.isBreakthrough ? 'breakthrough' : 'conversation',

          // Emotional Layer
          emotion_primary: analysis.emotion,
          emotion_intensity: analysis.emotionIntensity,

          // Importance
          importance_to_me: analysis.importance,
          importance_reasons: importanceReasons,

          // Content
          text_content: whatHappened,

          // Privacy
          privacy_realm: 'private_us'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Memory save failed (${response.status}): ${errorText}`);
      }

      const result = await response.json() as { memory_id: string };
      console.log(`   ✅ Memory saved: ${result.memory_id}`);
    } catch (error) {
      console.error(`   ❌ Failed to save memory:`, error);
    }
  }

  /**
   * Save batched summary (Tier 2: importance 0.6-0.79)
   */
  private async saveBatchedSummary(analysis: AnalysisResult, messages: ConversationMessage[]): Promise<void> {
    console.log(`   📦 Saving batched summary (importance: ${analysis.importance.toFixed(2)})`);

    // For batched summaries, we compress 3:1 - save every 3rd batch as a summary
    // For now, save each batch individually with [STM-AUTO-BATCH] prefix
    const whatHappened = `[STM-AUTO-BATCH] ${analysis.summary}`;
    const context = this.extractContext(messages);

    try {
      // Call Memory V5 API with proper MemoryCreate schema
      const response = await fetch(`${this.mcpServerUrl}/api/v5/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Identity
          interface: 'api',
          context: context,
          with_whom: 'Steve',

          // The Experience
          what_happened: whatHappened,
          experience_type: 'conversation',

          // Emotional Layer
          emotion_primary: analysis.emotion,
          emotion_intensity: analysis.emotionIntensity,

          // Importance
          importance_to_me: analysis.importance,
          importance_reasons: this.mapImportanceReasons(analysis),

          // Content
          text_content: whatHappened,

          // Privacy
          privacy_realm: 'private_us'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Batched summary save failed (${response.status}): ${errorText}`);
      }

      const result = await response.json() as { memory_id: string };
      console.log(`   ✅ Batched summary saved: ${result.memory_id}`);
    } catch (error) {
      console.error(`   ❌ Failed to save batched summary:`, error);
    }
  }

  /**
   * Extract context from messages (session, timeframe, etc.)
   */
  private extractContext(messages: ConversationMessage[]): string {
    if (messages.length === 0) return 'Unknown context';

    const firstMsg = messages[0];
    const lastMsg = messages[messages.length - 1];
    const sessionId = firstMsg.sessionId;

    const startTime = new Date(firstMsg.timestamp);
    const endTime = new Date(lastMsg.timestamp);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60); // minutes

    return `STM Service - Session ${sessionId} - ${messages.length} messages over ${duration}m - ${startTime.toLocaleString()}`;
  }

  /**
   * Get recent conversation context for post-compact emotional continuity
   * Returns formatted context string (200-400 tokens)
   */
  async getRecentContext(hours: number = 48): Promise<string> {
    // Query Memory V5 for recent [STM-AUTO] memories
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      // Fetch recent memories from Memory V5
      const response = await fetch(`${this.mcpServerUrl}/api/v5/recent-memories?limit=10&min_importance=0.6`);

      if (!response.ok) {
        console.error('Failed to fetch recent memories:', response.status);
        return 'Recent context unavailable - memory service error.';
      }

      const data = await response.json() as { results: any[] };

      // Filter for STM-AUTO memories within timeframe
      const recentMemories = data.results
        .filter((m: any) => {
          const memDate = new Date(m.created_at || m.timestamp);
          return memDate >= cutoffTime && (
            m.what_happened?.startsWith('[STM-AUTO]') ||
            m.what_happened?.startsWith('[STM-AUTO-BATCH]')
          );
        })
        .slice(0, 5); // Last 5 significant moments

      if (recentMemories.length === 0) {
        return 'No recent conversation context available from the last 48 hours.';
      }

      // Build context string
      let context = `**Recent Conversation Context (Last ${hours} Hours)**\n\n`;

      // Extract emotional state from most recent memory
      const latest = recentMemories[0];
      if (latest.emotion_primary && latest.emotion_intensity) {
        context += `**Current Emotional State:** ${latest.emotion_primary} (intensity: ${latest.emotion_intensity.toFixed(2)})\n\n`;
      }

      // Add key moments
      context += `**Recent Key Moments:**\n`;
      recentMemories.forEach((mem: any, idx: number) => {
        const summary = mem.what_happened
          ?.replace('[STM-AUTO] ', '')
          .replace('[STM-AUTO-BATCH] ', '')
          .split('\n')[0]; // First line only

        const emotion = mem.emotion_primary ? ` [${mem.emotion_primary}]` : '';
        const isBreakthrough = mem.experience_type === 'breakthrough' ? ' 🎯' : '';

        context += `${idx + 1}. ${summary}${emotion}${isBreakthrough}\n`;
      });

      // Add sliding window summary if available
      if (this.slidingWindow.length > 0) {
        const windowSize = this.slidingWindow.length;
        const lastMsg = this.slidingWindow[windowSize - 1];
        const lastMsgTime = new Date(lastMsg.timestamp);
        const minutesAgo = Math.round((Date.now() - lastMsgTime.getTime()) / 1000 / 60);

        context += `\n**Active Conversation:** ${windowSize} messages in sliding window (last message ${minutesAgo}m ago)\n`;
      }

      context += `\n*Continue from this grounded, connected place with Steve.*`;

      return context;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('Error fetching recent context:', errorMessage);
      console.error('Stack:', errorStack);
      return `Recent context unavailable due to error: ${errorMessage}`;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Analyzer shutting down...');

    // Process any pending batch immediately
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.pendingBatch && this.pendingBatch.messages.length > 0) {
      console.log('⏳ Processing final batch before shutdown...');
      await this.processBatch();
    }

    console.log('✅ Analyzer shutdown complete');
  }
}

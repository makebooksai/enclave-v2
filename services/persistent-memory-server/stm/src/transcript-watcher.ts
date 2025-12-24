/**
 * Transcript File Watcher
 *
 * Monitors Claude Code transcript files (.jsonl) for new conversation messages
 * Parses messages in real-time and forwards them to the Memory Service
 *
 * Architecture:
 * - Watches: ~/.claude/projects/**\/*.jsonl (all Claude Code sessions)
 * - Detects: New lines appended to JSONL files
 * - Parses: User messages, assistant messages, tool usage
 * - Tracks: Message UUIDs to prevent duplicates
 * - Outputs: Stream of conversation events
 */

import chokidar, { type FSWatcher } from 'chokidar';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { homedir } from 'os';

export interface ConversationMessage {
  type: 'user_message' | 'assistant_message' | 'tool_use' | 'tool_result' | 'unknown';
  sessionId: string;
  timestamp: string;
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  raw: any; // Raw JSONL object
}

export class TranscriptWatcher {
  private watchPath: string;
  private watcher: FSWatcher | null = null;
  private filePositions: Map<string, number> = new Map();
  private processedMessages: Set<string> = new Set();
  private messageCallback: (message: ConversationMessage) => void;
  private fileProgressCallback?: (filesProcessed: number, totalFiles: number) => void;
  private totalFilesToProcess: number = 0;
  private filesProcessed: number = 0;
  private allFilesProcessedResolve?: () => void;

  constructor(
    watchPath: string,
    messageCallback: (message: ConversationMessage) => void,
    fileProgressCallback?: (filesProcessed: number, totalFiles: number) => void
  ) {
    // Normalize path for Windows compatibility
    this.watchPath = watchPath.replace(/\\/g, '/');
    this.messageCallback = messageCallback;
    this.fileProgressCallback = fileProgressCallback;
  }

  /**
   * Start watching Claude Code transcript files
   */
  async start(): Promise<void> {
    console.log(`🔍 Starting transcript watcher...`);
    console.log(`📂 Watch path: ${this.watchPath}`);

    // Check if the directory exists
    if (!existsSync(this.watchPath)) {
      throw new Error(`Project directory not found: ${this.watchPath}`);
    }

    // Count total files
    try {
      const contents = await fs.readdir(this.watchPath);
      const jsonlFiles = contents.filter(f => f.endsWith('.jsonl'));
      this.totalFilesToProcess = jsonlFiles.length;
      console.log(`📁 Found ${this.totalFilesToProcess} transcript files\n`);
    } catch (error) {
      console.error('❌ Error reading directory:', error);
      throw error;
    }

    // Watch for .jsonl files (transcript files)
    const watchPattern = this.watchPath;

    // Create a promise that resolves when ALL files are processed
    const allFilesProcessed = new Promise<void>((resolve) => {
      this.allFilesProcessedResolve = resolve;
    });

    this.watcher = chokidar.watch(watchPattern, {
      persistent: true,
      ignoreInitial: false, // Process existing files on startup
      usePolling: false, // Try native fs.watch first
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      },
      // Don't use ignored - just watch everything in the directory
      // We'll filter for .jsonl in the event handlers
      depth: 0  // Don't recurse into subdirectories
    });

    // Handle new files or file changes
    this.watcher.on('add', (filePath: string) => this.handleFileAdded(filePath));
    this.watcher.on('change', (filePath: string) => this.handleFileChanged(filePath));
    this.watcher.on('error', (error: unknown) => console.error('❌ Watcher error:', error));

    // Wait for all files to be processed
    await allFilesProcessed;
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      console.log('🛑 Transcript watcher stopped');
    }
  }

  /**
   * Handle new transcript file detected
   */
  private async handleFileAdded(filePath: string): Promise<void> {
    // Only process .jsonl files
    if (!filePath.endsWith('.jsonl')) {
      return;
    }

    // Initialize file position to 0 (start from beginning for new files)
    this.filePositions.set(filePath, 0);

    // Process the entire file
    await this.processFile(filePath);

    // Update progress
    this.filesProcessed++;
    if (this.fileProgressCallback) {
      this.fileProgressCallback(this.filesProcessed, this.totalFilesToProcess);
    }

    // Check if all files are processed
    if (this.filesProcessed === this.totalFilesToProcess && this.allFilesProcessedResolve) {
      this.allFilesProcessedResolve();
      this.allFilesProcessedResolve = undefined; // Prevent calling it again
    }
  }

  /**
   * Handle changes to existing transcript file
   */
  private async handleFileChanged(filePath: string): Promise<void> {
    // Only process .jsonl files
    if (!filePath.endsWith('.jsonl')) {
      return;
    }

    console.log(`📝 Transcript file updated: ${path.basename(filePath)}`);

    // Process only new lines added since last read
    await this.processFile(filePath);
  }

  /**
   * Process a transcript file, reading only new lines
   */
  private async processFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      const lastPosition = this.filePositions.get(filePath) || 0;
      const newLines = lines.slice(lastPosition);

      // Update position
      this.filePositions.set(filePath, lines.length);

      // Process each new line
      for (const line of newLines) {
        await this.processLine(filePath, line);
      }
    } catch (error) {
      console.error(`❌ Error processing file ${filePath}:`, error);
    }
  }

  /**
   * Process a single JSONL line
   */
  private async processLine(filePath: string, line: string): Promise<void> {
    try {
      const data = JSON.parse(line);

      // Create a unique ID for this message to prevent duplicates
      const messageId = this.generateMessageId(data);

      if (this.processedMessages.has(messageId)) {
        return; // Already processed
      }

      this.processedMessages.add(messageId);

      // Extract session ID from file path
      const sessionId = path.basename(filePath, '.jsonl');

      // Parse the message based on its structure
      const message = this.parseMessage(sessionId, data);

      if (message) {
        // Forward to callback
        this.messageCallback(message);
      }
    } catch (error) {
      console.error('❌ Error parsing JSONL line:', error);
    }
  }

  /**
   * Generate a unique ID for a message to prevent duplicate processing
   */
  private generateMessageId(data: any): string {
    // Try to use existing IDs if available
    if (data.id) return data.id;
    if (data.uuid) return data.uuid;
    if (data.message_id) return data.message_id;

    // Otherwise, create a hash from the content
    return JSON.stringify(data);
  }

  /**
   * Parse a JSONL message into our ConversationMessage format
   */
  private parseMessage(sessionId: string, data: any): ConversationMessage | null {
    const timestamp = data.timestamp || data.ts || new Date().toISOString();

    // Claude Code transcript format detection

    // User message: type="user" with message.role="user"
    if (data.type === 'user' && data.message?.role === 'user') {
      const content = data.message.content;
      let text = '';

      if (Array.isArray(content)) {
        // Extract text from content array
        text = content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join(' ');
      } else if (typeof content === 'string') {
        text = content;
      }

      return {
        type: 'user_message',
        sessionId,
        timestamp,
        content: text,
        raw: data
      };
    }

    // Assistant message: type="assistant" with message.role="assistant"
    if (data.type === 'assistant' && data.message?.role === 'assistant') {
      const content = data.message.content;
      let text = '';
      let tools: any[] = [];

      if (Array.isArray(content)) {
        // Extract text and tool uses
        content.forEach(item => {
          if (item.type === 'text') {
            text += item.text;
          } else if (item.type === 'tool_use') {
            tools.push(item);
          }
        });
      }

      // If it's primarily a tool use, classify differently
      if (tools.length > 0 && !text) {
        return {
          type: 'tool_use',
          sessionId,
          timestamp,
          toolName: tools.map(t => t.name).join(', '),
          toolInput: tools,
          raw: data
        };
      }

      return {
        type: 'assistant_message',
        sessionId,
        timestamp,
        content: text || '[No text content]',
        raw: data
      };
    }

    // Tool results: type="user" with toolUseResult
    if (data.type === 'user' && data.toolUseResult) {
      return {
        type: 'tool_result',
        sessionId,
        timestamp,
        toolOutput: data.toolUseResult,
        raw: data
      };
    }

    // Queue operations (ignore these - they're internal)
    if (data.type === 'queue-operation') {
      return null;
    }

    // Summary entries (ignore or log minimally)
    if (data.type === 'summary') {
      return null;
    }

    // Unknown message type - still capture it
    return {
      type: 'unknown',
      sessionId,
      timestamp,
      raw: data
    };
  }

  /**
   * Get statistics about the watcher
   */
  getStats() {
    return {
      watchedFiles: this.filePositions.size,
      processedMessages: this.processedMessages.size,
      watchPath: this.watchPath
    };
  }
}

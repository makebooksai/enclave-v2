/**
 * Configuration Management for STM Service
 *
 * Handles project folder selection and persistent configuration
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import readline from 'readline/promises';

interface StmConfig {
  projectFolder: string;
  watchPath: string;
}

const CONFIG_FILE = path.join(homedir(), '.enclave-stm-config.json');

export class ConfigManager {
  private config: StmConfig | null = null;

  /**
   * Load existing config or create default
   */
  async getConfig(): Promise<StmConfig> {
    if (this.config) {
      return this.config;
    }

    // Try to load existing config
    if (existsSync(CONFIG_FILE)) {
      try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(data);
        console.log(`✅ Loaded config: Watching project "${this.config!.projectFolder}"`);
        return this.config!;
      } catch (error) {
        console.warn('⚠️  Could not load config file, creating new one...');
      }
    }

    // Create default config for Enclave project
    // TODO: Make this interactive in the future
    const claudeProjectsPath = path.join(homedir(), '.claude', 'projects');
    const projectFolder = 'D--AI-enclave';  // Hardcoded for now
    const watchPath = path.join(claudeProjectsPath, projectFolder);

    this.config = {
      projectFolder,
      watchPath
    };

    console.log(`📂 Using default project: ${projectFolder}`);
    console.log(`💡 To change projects, edit: ${CONFIG_FILE}\n`);

    await this.saveConfig(this.config);
    return this.config;
  }

  /**
   * Prompt user to select project folder
   */
  private async promptForConfig(): Promise<StmConfig> {
    const claudeProjectsPath = path.join(homedir(), '.claude', 'projects');

    console.log('\n🔧 First-time setup: Enclave Short-Term Memory Service\n');
    console.log(`📂 Claude Code projects location: ${claudeProjectsPath}\n`);

    // List available project folders
    const folders = await fs.readdir(claudeProjectsPath);
    console.log('Available project folders:');
    folders.forEach((folder, index) => {
      console.log(`  ${index + 1}. ${folder}`);
    });

    // Use process.stdin directly with better error handling
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false  // Disable terminal mode for better compatibility
    });

    let selectedFolder: string | null = null;

    try {
      while (!selectedFolder) {
        const answer = await rl.question('\nEnter the number or name of the project folder to monitor: ');

        const trimmedAnswer = answer.trim();

        // Check if it's a number
        const num = parseInt(trimmedAnswer);
        if (!isNaN(num) && num > 0 && num <= folders.length) {
          selectedFolder = folders[num - 1];
        } else if (folders.includes(trimmedAnswer)) {
          selectedFolder = trimmedAnswer;
        } else {
          console.log(`❌ Invalid selection. Please choose a number (1-${folders.length}) or exact folder name.`);
        }
      }
    } finally {
      rl.close();
    }

    const watchPath = path.join(claudeProjectsPath, selectedFolder);

    console.log(`\n✅ Project folder selected: ${selectedFolder}`);
    console.log(`📂 Watch path: ${watchPath}\n`);
    console.log(`💾 Config will be saved to: ${CONFIG_FILE}`);
    console.log(`💡 To change projects later, delete this file and restart.\n`);

    return {
      projectFolder: selectedFolder,
      watchPath
    };
  }

  /**
   * Save config to disk
   */
  private async saveConfig(config: StmConfig): Promise<void> {
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
      console.log('✅ Configuration saved successfully\n');
    } catch (error) {
      console.error('❌ Failed to save config:', error);
      throw error;
    }
  }

  /**
   * Reset config (delete config file)
   */
  async resetConfig(): Promise<void> {
    if (existsSync(CONFIG_FILE)) {
      await fs.unlink(CONFIG_FILE);
      this.config = null;
      console.log('✅ Configuration reset');
    }
  }
}

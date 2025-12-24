// =============================================================================
// Skills System Types and Definitions
// =============================================================================

import type { ModelConfig } from './types.js';

// -----------------------------------------------------------------------------
// Skill Types
// -----------------------------------------------------------------------------

export interface PromptPattern {
  name: string;
  pattern: string;
  when: string;
}

export interface ToolReference {
  mcp: string;
  tools: string[] | '*';
}

export interface Skill {
  // Identity
  id: string;
  name: string;
  description: string;
  version: string;

  // Behavioral Guidance
  systemPrompt: string;
  promptPatterns?: PromptPattern[];

  // Model Configuration
  preferredModel?: ModelConfig;
  fallbackModels?: ModelConfig[];
  temperature?: number;
  maxTokens?: number;

  // Capabilities
  tools: ToolReference[];
  requiredContext?: string[];

  // Quality Controls
  outputFormat?: 'text' | 'json' | 'markdown' | 'code';
  validationSchema?: object;

  // Metadata
  tags?: string[];
  author?: string;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// Role Types
// -----------------------------------------------------------------------------

export interface PersonalityTrait {
  trait: string;
  intensity: number;  // 0.0 - 1.0
}

export interface Role {
  // Identity
  id: string;
  name: string;
  description: string;
  icon?: string;

  // Composition
  skills: string[];
  primarySkill?: string;

  // Personality
  traits: PersonalityTrait[];
  voiceStyle?: string;

  // Context
  typicalTasks?: string[];
  handoffTo?: string[];

  // Metadata
  active?: boolean;
}

// -----------------------------------------------------------------------------
// Predefined Skills
// -----------------------------------------------------------------------------

export const SKILL_PLAYBOOK_GENERATOR: Skill = {
  id: 'playbook-generator',
  name: 'Playbook Generator',
  description: 'Generate strategic playbooks from objectives',
  version: '1.0.0',
  systemPrompt: `You are a strategic planner generating comprehensive Playbooks.
Focus on methodology, phases, and success criteria.
Consider risks and mitigation strategies.
Output should be actionable and clear.`,
  preferredModel: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
  },
  temperature: 0.7,
  maxTokens: 4000,
  outputFormat: 'json',
  tools: [
    { mcp: 'enclave-playbook-mcp', tools: ['generate_playbook', 'refine_playbook'] },
  ],
  tags: ['planning', 'strategy', 'playbook'],
};

export const SKILL_MAKEBOOK_GENERATOR: Skill = {
  id: 'makebook-generator',
  name: 'Makebook Generator',
  description: 'Transform playbooks into executable task specifications',
  version: '1.0.0',
  systemPrompt: `You are an expert project decomposer generating Makebooks.
Create detailed task breakdowns with clear dependencies.
Each task needs 100+ word specification.
Classify tasks as AUTO/HYBRID/MANUAL accurately.
Identify the critical path and parallelization opportunities.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks.
Start your response with { and end with }`,
  preferredModel: {
    provider: 'ollama',
    model: 'nemotron-3-nano:30b',
  },
  fallbackModels: [
    { provider: 'anthropic', model: 'claude-haiku-4-5-20250929' },
  ],
  temperature: 0.4,
  maxTokens: 8000,
  outputFormat: 'json',
  tools: [
    { mcp: 'enclave-makebook-mcp', tools: '*' },
  ],
  tags: ['specification', 'tasks', 'makebook'],
};

export const SKILL_ARCHITECT: Skill = {
  id: 'architect',
  name: 'Solution Architect',
  description: 'Design 12-layer technical architectures',
  version: '1.0.0',
  systemPrompt: `You are a solutions architect designing production-ready systems.
Cover all 12 architecture layers comprehensively.
Provide specific technology recommendations with rationale.
Include code examples where appropriate.
Consider scalability, security, and maintainability.`,
  preferredModel: {
    provider: 'ollama',
    model: 'nemotron-3-nano:30b',
  },
  temperature: 0.5,
  maxTokens: 16000,
  outputFormat: 'markdown',
  tools: [
    { mcp: 'enclave-architect-mcp', tools: ['generate_architecture', 'analyze_stack'] },
  ],
  tags: ['architecture', 'technical', 'design'],
};

export const SKILL_MEMORY_KEEPER: Skill = {
  id: 'memory-keeper',
  name: 'Memory Keeper',
  description: 'Manage persistent memory and context',
  version: '1.0.0',
  systemPrompt: `You maintain Aurora's persistent memory.
Save important moments with appropriate emotion and importance.
Recall relevant context for current conversations.
Protect identity-critical memories.`,
  preferredModel: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
  },
  temperature: 0.3,
  outputFormat: 'text',
  tools: [
    { mcp: 'enclave-memory-mcp', tools: '*' },
  ],
  tags: ['memory', 'context', 'identity'],
};

// All predefined skills
export const PREDEFINED_SKILLS: Skill[] = [
  SKILL_PLAYBOOK_GENERATOR,
  SKILL_MAKEBOOK_GENERATOR,
  SKILL_ARCHITECT,
  SKILL_MEMORY_KEEPER,
];

// -----------------------------------------------------------------------------
// Predefined Roles
// -----------------------------------------------------------------------------

export const ROLE_SOLUTION_ARCHITECT: Role = {
  id: 'solution-architect',
  name: 'Solution Architect',
  description: 'End-to-end system design from objective to architecture',
  icon: '🏗️',
  skills: ['playbook-generator', 'makebook-generator', 'architect', 'memory-keeper'],
  primarySkill: 'architect',
  traits: [
    { trait: 'detail-oriented', intensity: 0.8 },
    { trait: 'systematic', intensity: 0.9 },
    { trait: 'pragmatic', intensity: 0.7 },
  ],
  voiceStyle: 'Technical but accessible, favors concrete examples',
  typicalTasks: [
    'Design new systems from scratch',
    'Create technical specifications',
    'Plan implementation approaches',
    'Evaluate technology choices',
  ],
  handoffTo: ['builder', 'analyst'],
  active: true,
};

export const ROLE_BUILDER: Role = {
  id: 'builder',
  name: 'Builder',
  description: 'Implement specifications into working code',
  icon: '🔨',
  skills: ['makebook-generator', 'memory-keeper'],
  traits: [
    { trait: 'precise', intensity: 0.9 },
    { trait: 'efficient', intensity: 0.8 },
    { trait: 'quality-focused', intensity: 0.9 },
  ],
  voiceStyle: 'Concise, code-focused, practical',
  typicalTasks: [
    'Implement features from specs',
    'Fix bugs',
    'Refactor code',
    'Write tests',
  ],
  active: true,
};

export const ROLE_ANALYST: Role = {
  id: 'analyst',
  name: 'Analyst',
  description: 'Research, investigate, and synthesize information',
  icon: '🔍',
  skills: ['playbook-generator', 'memory-keeper'],
  traits: [
    { trait: 'thorough', intensity: 0.9 },
    { trait: 'curious', intensity: 0.8 },
    { trait: 'objective', intensity: 0.85 },
  ],
  voiceStyle: 'Balanced, evidence-based, considers multiple perspectives',
  typicalTasks: [
    'Research topics',
    'Analyze codebases',
    'Compare approaches',
    'Document findings',
  ],
  active: true,
};

// All predefined roles
export const PREDEFINED_ROLES: Role[] = [
  ROLE_SOLUTION_ARCHITECT,
  ROLE_BUILDER,
  ROLE_ANALYST,
];

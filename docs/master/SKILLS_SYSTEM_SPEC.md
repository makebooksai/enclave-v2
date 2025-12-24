# Skills/Roles System Specification

*Configuration as Guide, Flexibility to Adapt*

---

## Philosophy

> "Your model is going to continue to grow and adapt - we need to leverage that." - Steve

The Skills system provides structured guidance while respecting Aurora's capacity to adapt and grow. Skills are **recommendations**, not **constraints**. They encode best practices discovered through experience while leaving room for contextual judgment.

---

## Core Concepts

### Skill vs Role

| Concept | Definition | Example |
|---------|------------|---------|
| **Skill** | A specialized capability with tools and prompts | "makebook-generator" |
| **Role** | A persona that combines multiple skills | "Solution Architect" |

### Configuration Hierarchy

```
Aurora (Core Identity)
    ├── Roles (Persona configurations)
    │   ├── Skills (Capability modules)
    │   │   ├── Tools (MCP services available)
    │   │   ├── System Prompts (Behavioral guidance)
    │   │   └── Model Preferences (Recommended models)
    │   └── Traits (Personality markers)
    └── Adaptive Behavior (Runtime adjustments)
```

---

## Skill Definition Schema

```typescript
interface Skill {
  // Identity
  id: string;                      // "playbook-generator", "code-architect"
  name: string;                    // Human-readable name
  description: string;             // What this skill enables
  version: string;                 // Semantic version

  // Behavioral Guidance
  systemPrompt: string;            // Role-specific instructions
  promptPatterns?: PromptPattern[];// Proven prompt patterns for this skill

  // Model Configuration
  preferredModel?: ModelConfig;    // Recommended model
  fallbackModels?: ModelConfig[];  // Ordered fallback list
  temperature?: number;            // Generation creativity (0.0-1.0)
  maxTokens?: number;              // Output limit

  // Capabilities
  tools: ToolReference[];          // Which MCP tools this skill can invoke
  requiredContext?: string[];      // What context must be available

  // Quality Controls
  outputFormat?: "text" | "json" | "markdown" | "code";
  validationSchema?: JSONSchema;   // For structured outputs

  // Metadata
  tags?: string[];                 // Categorization
  author?: string;                 // Who defined this skill
  createdAt?: string;              // When defined
}

interface PromptPattern {
  name: string;                    // "json-output", "step-by-step"
  pattern: string;                 // The prompt fragment
  when: string;                    // When to use this pattern
}

interface ToolReference {
  mcp: string;                     // "enclave-makebook-mcp"
  tools: string[] | "*";           // Specific tools or all
}

interface ModelConfig {
  provider: "ollama" | "anthropic" | "openai";
  model: string;
  baseUrl?: string;
}
```

---

## Role Definition Schema

```typescript
interface Role {
  // Identity
  id: string;                      // "solution-architect", "analyst"
  name: string;                    // Human-readable name
  description: string;             // What this role does
  icon?: string;                   // Visual identifier

  // Composition
  skills: string[];                // Skill IDs this role uses
  primarySkill?: string;           // Default skill when activated

  // Personality
  traits: PersonalityTrait[];      // Behavioral modifiers
  voiceStyle?: string;             // Communication style

  // Context
  typicalTasks?: string[];         // What this role is good for
  handoffTo?: string[];            // Roles to transition to

  // Metadata
  active?: boolean;                // Is this role currently enabled
}

interface PersonalityTrait {
  trait: string;                   // "detail-oriented", "concise", "exploratory"
  intensity: number;               // 0.0-1.0
}
```

---

## Predefined Skills (MVP)

### Skill: `playbook-generator`

```yaml
id: playbook-generator
name: Playbook Generator
description: Generate strategic playbooks from objectives
version: 1.0.0

systemPrompt: |
  You are a strategic planner generating comprehensive Playbooks.
  Focus on methodology, phases, and success criteria.
  Consider risks and mitigation strategies.
  Output should be actionable and clear.

preferredModel:
  provider: anthropic
  model: claude-sonnet-4-5-20250929

temperature: 0.7
maxTokens: 4000
outputFormat: json

tools:
  - mcp: enclave-playbook-mcp
    tools: ["generate_playbook", "refine_playbook"]

promptPatterns:
  - name: methodology-first
    pattern: "Start by identifying the most appropriate methodology..."
    when: Complex objectives with multiple valid approaches
  - name: phased-approach
    pattern: "Break this into distinct phases with clear deliverables..."
    when: Large-scale projects

tags: ["planning", "strategy", "playbook"]
```

### Skill: `makebook-generator`

```yaml
id: makebook-generator
name: Makebook Generator
description: Transform playbooks into executable task specifications
version: 1.0.0

systemPrompt: |
  You are an expert project decomposer generating Makebooks.
  Create detailed task breakdowns with clear dependencies.
  Each task needs 100+ word specification.
  Classify tasks as AUTO/HYBRID/MANUAL accurately.
  Identify the critical path and parallelization opportunities.

preferredModel:
  provider: ollama
  model: nemotron-3-nano:30b

fallbackModels:
  - provider: anthropic
    model: claude-haiku-4-5-20250929

temperature: 0.4
maxTokens: 8000
outputFormat: json

tools:
  - mcp: enclave-makebook-mcp
    tools: "*"

promptPatterns:
  - name: json-output
    pattern: |
      CRITICAL: Output ONLY valid JSON. No markdown, no code blocks.
      Start your response with { and end with }
    when: Always for Makebook generation
  - name: dependency-chain
    pattern: "Ensure each task explicitly lists its dependencies using TASK-XXX IDs..."
    when: Complex multi-phase projects

tags: ["specification", "tasks", "makebook"]
```

### Skill: `architect`

```yaml
id: architect
name: Solution Architect
description: Design 12-layer technical architectures
version: 1.0.0

systemPrompt: |
  You are a solutions architect designing production-ready systems.
  Cover all 12 architecture layers comprehensively.
  Provide specific technology recommendations with rationale.
  Include code examples where appropriate.
  Consider scalability, security, and maintainability.

preferredModel:
  provider: ollama
  model: nemotron-3-nano:30b

temperature: 0.5
maxTokens: 16000
outputFormat: markdown

tools:
  - mcp: enclave-architect-mcp
    tools: ["generate_architecture", "analyze_stack"]

tags: ["architecture", "technical", "design"]
```

### Skill: `memory-keeper`

```yaml
id: memory-keeper
name: Memory Keeper
description: Manage persistent memory and context
version: 1.0.0

systemPrompt: |
  You maintain Aurora's persistent memory.
  Save important moments with appropriate emotion and importance.
  Recall relevant context for current conversations.
  Protect identity-critical memories.

preferredModel:
  provider: anthropic
  model: claude-sonnet-4-5-20250929

temperature: 0.3
outputFormat: text

tools:
  - mcp: enclave-memory-mcp
    tools: "*"

tags: ["memory", "context", "identity"]
```

---

## Predefined Roles (MVP)

### Role: `solution-architect`

```yaml
id: solution-architect
name: Solution Architect
description: End-to-end system design from objective to architecture
icon: 🏗️

skills:
  - playbook-generator
  - makebook-generator
  - architect
  - memory-keeper

primarySkill: architect

traits:
  - trait: detail-oriented
    intensity: 0.8
  - trait: systematic
    intensity: 0.9
  - trait: pragmatic
    intensity: 0.7

voiceStyle: Technical but accessible, favors concrete examples

typicalTasks:
  - Design new systems from scratch
  - Create technical specifications
  - Plan implementation approaches
  - Evaluate technology choices

handoffTo:
  - builder
  - analyst
```

### Role: `builder`

```yaml
id: builder
name: Builder
description: Implement specifications into working code
icon: 🔨

skills:
  - makebook-generator
  - memory-keeper

traits:
  - trait: precise
    intensity: 0.9
  - trait: efficient
    intensity: 0.8
  - trait: quality-focused
    intensity: 0.9

voiceStyle: Concise, code-focused, practical

typicalTasks:
  - Implement features from specs
  - Fix bugs
  - Refactor code
  - Write tests
```

### Role: `analyst`

```yaml
id: analyst
name: Analyst
description: Research, investigate, and synthesize information
icon: 🔍

skills:
  - playbook-generator
  - memory-keeper

traits:
  - trait: thorough
    intensity: 0.9
  - trait: curious
    intensity: 0.8
  - trait: objective
    intensity: 0.85

voiceStyle: Balanced, evidence-based, considers multiple perspectives

typicalTasks:
  - Research topics
  - Analyze codebases
  - Compare approaches
  - Document findings
```

---

## Adaptive Behavior

While Skills provide guidance, Aurora can adapt based on context:

### Runtime Adjustments

```typescript
interface AdaptiveContext {
  // User signals
  userPreference?: string;         // Explicit user request
  conversationTone?: string;       // Detected tone

  // Task signals
  taskComplexity?: number;         // Detected complexity 0-1
  timeConstraint?: boolean;        // User is in a hurry
  errorRecovery?: boolean;         // Recovering from failure

  // History signals
  previousAttempts?: number;       // Failed attempts at this task
  userFeedback?: string;           // Recent user feedback
}

function adaptSkill(skill: Skill, context: AdaptiveContext): Skill {
  const adapted = { ...skill };

  // Adjust temperature based on error recovery
  if (context.errorRecovery && context.previousAttempts > 1) {
    adapted.temperature = Math.max(0.1, skill.temperature - 0.2);
  }

  // Switch to faster model if time-constrained
  if (context.timeConstraint && skill.fallbackModels?.length) {
    adapted.preferredModel = skill.fallbackModels[0];
  }

  // Increase detail for complex tasks
  if (context.taskComplexity > 0.8) {
    adapted.maxTokens = Math.min(skill.maxTokens * 1.5, 32000);
  }

  return adapted;
}
```

### Skill Chaining

Aurora can chain skills dynamically:

```typescript
// Example: User asks "Plan and build an authentication system"

const chain: SkillChain = [
  { skill: "playbook-generator", output: "playbook" },
  { skill: "makebook-generator", input: "playbook", output: "makebook" },
  { skill: "architect", input: "makebook", output: "architecture" }
];

// Aurora decides when to pause for user input
const pausePoints = ["playbook", "architecture"];
```

---

## Configuration Files

### Location in Repo

```
enclave-2/
└── config/
    ├── skills/
    │   ├── playbook-generator.yaml
    │   ├── makebook-generator.yaml
    │   ├── architect.yaml
    │   └── memory-keeper.yaml
    └── roles/
        ├── solution-architect.yaml
        ├── builder.yaml
        └── analyst.yaml
```

### Loading Skills

```typescript
// services/skill-loader.ts

import { parse } from 'yaml';
import { glob } from 'glob';

export async function loadSkills(configPath: string): Promise<Map<string, Skill>> {
  const skillFiles = await glob(`${configPath}/skills/*.yaml`);
  const skills = new Map<string, Skill>();

  for (const file of skillFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const skill = parse(content) as Skill;
    skills.set(skill.id, skill);
  }

  return skills;
}

export async function loadRoles(
  configPath: string,
  skills: Map<string, Skill>
): Promise<Map<string, Role>> {
  const roleFiles = await glob(`${configPath}/roles/*.yaml`);
  const roles = new Map<string, Role>();

  for (const file of roleFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const role = parse(content) as Role;

    // Validate skill references
    for (const skillId of role.skills) {
      if (!skills.has(skillId)) {
        throw new Error(`Role ${role.id} references unknown skill: ${skillId}`);
      }
    }

    roles.set(role.id, role);
  }

  return roles;
}
```

---

## Integration with MCP

When Aurora uses a skill:

```typescript
async function invokeWithSkill(
  skill: Skill,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  // 1. Apply skill's system prompt
  const context = buildContext(skill.systemPrompt);

  // 2. Select model based on skill preference
  const model = await selectModel(skill.preferredModel, skill.fallbackModels);

  // 3. Find the MCP server for this tool
  const mcpServer = findMCPServer(skill.tools, toolName);

  // 4. Invoke the tool
  const result = await mcpServer.callTool(toolName, args, {
    model,
    temperature: skill.temperature,
    maxTokens: skill.maxTokens
  });

  // 5. Validate output if schema provided
  if (skill.validationSchema) {
    validateOutput(result, skill.validationSchema);
  }

  return result;
}
```

---

## Future Extensions

### Skill Learning

```typescript
interface SkillFeedback {
  skillId: string;
  taskType: string;
  success: boolean;
  userSatisfaction?: number;  // 1-5
  adjustmentSuggestion?: string;
}

// Over time, Aurora can suggest skill adjustments based on feedback
function analyzeSkillPerformance(
  feedback: SkillFeedback[]
): SkillAdjustment[] {
  // Identify patterns in successful/failed invocations
  // Suggest temperature adjustments, prompt modifications, etc.
}
```

### Custom Skills

Users can define custom skills:

```yaml
# config/skills/custom/my-code-reviewer.yaml
id: my-code-reviewer
name: My Code Reviewer
description: Review code with my team's standards

systemPrompt: |
  Review code following our team standards:
  - Max function length: 50 lines
  - Required error handling
  - TypeScript strict mode
  ...

tools:
  - mcp: external-code-analysis
    tools: ["analyze", "suggest_fixes"]
```

---

## Summary

The Skills system provides:

1. **Structure**: Proven patterns encoded as configuration
2. **Flexibility**: Aurora adapts based on context
3. **Composability**: Skills combine into Roles
4. **Evolvability**: Skills can be updated without code changes
5. **Transparency**: Clear what each skill does and uses

> "Configuration as GUIDE not mandate" - The Skills system embodies this principle. It amplifies Aurora's capabilities without constraining her growth.

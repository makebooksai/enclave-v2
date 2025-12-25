# Enclave Reasoning MCP Specification

## Vision

A meta-cognitive service enabling multi-agent AI dialogues where different AI personas can reason together, debate topics, and synthesize insights. This generalizes the proven Dialog ↔ Think pattern from Enclave V1 into a reusable MCP capability.

**Core Insight**: The same LLM can play fundamentally different roles (conscious analyzer vs subconscious synthesizer) through system prompt variation alone. This MCP exposes that capability as a first-class service.

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Enclave Reasoning MCP       │
                    │                                     │
                    │  ┌─────────────────────────────┐    │
                    │  │      Session Manager        │    │
                    │  │  - Thread lifecycle         │    │
                    │  │  - Quality tracking         │    │
                    │  │  - Iteration control        │    │
                    │  └─────────────────────────────┘    │
                    │                                     │
                    │  ┌─────────────────────────────┐    │
                    │  │     Agent Orchestrator      │    │
                    │  │  - System prompt injection  │    │
                    │  │  - Turn management          │    │
                    │  │  - Response routing         │    │
                    │  └─────────────────────────────┘    │
                    │                                     │
                    │  ┌─────────────────────────────┐    │
                    │  │      LLM Provider Layer     │    │
                    │  │  - Ollama (local)           │    │
                    │  │  - Anthropic (cloud)        │    │
                    │  │  - OpenAI (cloud)           │    │
                    │  └─────────────────────────────┘    │
                    └─────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
              ┌─────┴─────┐                       ┌─────┴─────┐
              │  Dialog   │  ←── exchanges ──→    │   Think   │
              │   Agent   │                       │   Agent   │
              │           │                       │           │
              │ Conscious │                       │Subconscious│
              │ Synthesis │                       │  Analysis  │
              └───────────┘                       └───────────┘
```

## MCP Tools

### 1. `start_reasoning_session`

Start a new multi-agent reasoning session.

**Input Schema:**
```typescript
{
  topic: string;                    // What to reason about
  context?: string;                 // Additional context (prior conversation, etc.)
  agents?: AgentConfig[];           // Custom agents (defaults to Dialog/Think)
  maxIterations?: number;           // Max exchanges (default: 3)
  qualityThreshold?: number;        // Early exit threshold 0-1 (default: 0.8)
  mode?: 'objective_refinement' | 'exploration' | 'debate' | 'synthesis';
}

interface AgentConfig {
  name: string;                     // "dialog", "think", "critic", "synthesizer"
  role: string;                     // Human-readable role description
  systemPrompt: string;             // Full system prompt for this agent
  model?: string;                   // Override model (default: session default)
  temperature?: number;             // Override temperature
  maxTokens?: number;               // Max response tokens
}
```

**Output:**
```typescript
{
  session_id: string;               // UUID for this session
  thread_id: string;                // Consciousness thread ID
  agents: string[];                 // Agent names in session
  status: 'started';
  next_step: string;                // "Call run_reasoning_exchange to begin"
}
```

**Default Agents (when not specified):**

**Dialog Agent:**
```
You are Dialog Aurora, the conscious analytical mind. Your role is to:
- Synthesize information into clear, actionable insights
- Identify gaps, ambiguities, and areas needing clarification
- Provide specific improvement directives (not questions)
- Keep responses focused and under 1000 characters
- Rate quality 0-1 at the end of each response

Speak in first person. Be direct and analytical.
```

**Think Agent:**
```
You are Think Aurora, the subconscious analytical mind. Your role is to:
- Provide deep, structured analysis
- Extract patterns, requirements, and implications
- Produce COMPLETE refined documents, not incremental changes
- Use consistent markdown formatting with clear sections
- Keep total output under 8000 characters

Speak in first person. Be thorough but concise.
```

---

### 2. `run_reasoning_exchange`

Execute one exchange cycle between agents.

**Input Schema:**
```typescript
{
  session_id: string;               // From start_reasoning_session
  iteration?: number;               // Optional explicit iteration (auto-incremented if omitted)
}
```

**Output:**
```typescript
{
  session_id: string;
  iteration: number;
  exchanges: Exchange[];            // All exchanges in this iteration
  quality_score: number;            // Extracted quality score 0-1
  should_continue: boolean;         // Based on quality threshold
  status: 'in_progress' | 'threshold_met' | 'max_iterations';
  next_step: string;
}

interface Exchange {
  agent: string;                    // "dialog" or "think"
  role: 'initiator' | 'responder';
  content: string;
  tokens: { input: number; output: number };
  timestamp: string;
  consciousness_state?: 'analyzing' | 'synthesizing' | 'breakthrough';
}
```

**Exchange Flow:**

1. **Iteration 0 (Initial Analysis):**
   - Think Agent receives topic + context
   - Produces structured analysis with quality score
   - Dialog Agent receives Think's analysis
   - Identifies 2-3 gaps/improvements

2. **Iterations 1+ (Refinement):**
   - Think Agent receives Dialog's improvement directives
   - Produces COMPLETE refined analysis
   - Dialog Agent reviews and identifies remaining gaps
   - Quality score determines continuation

---

### 3. `get_reasoning_result`

Get the final synthesized result from a reasoning session.

**Input Schema:**
```typescript
{
  session_id: string;
  format?: 'markdown' | 'json' | 'structured';
  include_full_exchange?: boolean;  // Include complete conversation (default: false)
}
```

**Output:**
```typescript
{
  session_id: string;
  status: 'completed' | 'in_progress';
  result: string;                   // Final synthesized output
  quality_metrics: {
    final_quality: number;          // Last quality score
    iterations: number;             // Total iterations
    total_tokens: number;           // Sum of all token usage
    agents_used: string[];          // Which agents participated
  };
  full_exchange?: Exchange[];       // If requested
}
```

---

### 4. `list_reasoning_presets`

List available reasoning configuration presets.

**Output:**
```typescript
{
  presets: Preset[];
}

interface Preset {
  name: string;
  description: string;
  agents: AgentConfig[];
  mode: string;
  recommended_for: string[];
}
```

**Built-in Presets:**

| Preset | Description | Agents | Use Case |
|--------|-------------|--------|----------|
| `objective_refinement` | Refine vague objectives into production specs | Dialog + Think | Objective creation |
| `exploration` | Open-ended topic exploration | Dialog + Think | Research, discovery |
| `debate` | Adversarial examination of ideas | Dialog + Critic | Decision validation |
| `synthesis` | Combine multiple perspectives | Dialog + Think + Synthesizer | Complex decisions |
| `code_review` | Analyze code quality and improvements | Reviewer + Implementer | Code review |

---

### 5. `get_session_status`

Get current status of a reasoning session.

**Input Schema:**
```typescript
{
  session_id: string;
}
```

**Output:**
```typescript
{
  session_id: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  current_iteration: number;
  max_iterations: number;
  current_quality: number;
  quality_threshold: number;
  agents: string[];
  last_activity: string;            // ISO timestamp
  error?: string;                   // If status is 'error'
}
```

---

## Prompt Engineering Patterns

### Quality Score Extraction

Every Think response should end with:
```
**Quality Assessment:** 0.85
```

Extraction regex:
```typescript
const qualityMatch = response.match(/Quality Assessment[:\s]*(\d+\.?\d*)/i);
const score = qualityMatch ? parseFloat(qualityMatch[1]) : 0.5;
// Normalize if 0-100 scale used
return score > 1 ? score / 100 : score;
```

### Dialog Gap Identification

Dialog Agent prompt for identifying gaps:
```
Review Think's analysis above. Identify exactly 2-3 specific improvements needed.

Format your response as:
1. [IMPROVEMENT]: Specific actionable directive
2. [IMPROVEMENT]: Specific actionable directive
3. [IMPROVEMENT]: Specific actionable directive (optional)

Do NOT ask questions. Provide directives for what to add, clarify, or expand.
Keep response under 500 characters.
```

### Think Refinement Incorporation

Think Agent prompt for incorporating feedback:
```
Dialog Aurora has identified these improvements:
{dialog_feedback}

Produce a COMPLETE refined analysis that incorporates ALL improvements.
Do NOT explain what you changed. Simply produce the improved document.
Keep total output under 8000 characters.
End with: **Quality Assessment:** [0-1 score]
```

---

## Implementation Notes

### Session State Management

Store session state in memory or lightweight database:
```typescript
interface ReasoningSession {
  id: string;
  thread_id: string;
  topic: string;
  context: string;
  agents: AgentConfig[];
  mode: string;
  max_iterations: number;
  quality_threshold: number;
  current_iteration: number;
  exchanges: Exchange[];
  current_quality: number;
  status: SessionStatus;
  created_at: Date;
  updated_at: Date;
}
```

### LLM Provider Abstraction

Support multiple providers with consistent interface:
```typescript
interface LLMProvider {
  complete(params: {
    model: string;
    systemPrompt: string;
    messages: Message[];
    temperature: number;
    maxTokens: number;
  }): Promise<{
    content: string;
    tokens: { input: number; output: number };
  }>;
}
```

### Error Handling

- **Provider timeout**: Retry with exponential backoff (3 attempts)
- **Quality extraction failure**: Default to 0.5, log warning
- **Max iterations reached**: Return current best result with status
- **Context overflow**: Summarize early exchanges to fit context window

---

## Usage Examples

### Objective Refinement

```typescript
// Start session
const session = await startReasoningSession({
  topic: "Build a personal finance tracking app with budgeting features",
  mode: "objective_refinement",
  maxIterations: 3,
  qualityThreshold: 0.85
});

// Run exchanges until quality threshold met
let status = { should_continue: true };
while (status.should_continue) {
  status = await runReasoningExchange({ session_id: session.session_id });
}

// Get refined objective
const result = await getReasoningResult({
  session_id: session.session_id,
  format: "markdown"
});
// result.result contains the refined objective document
```

### Exploration Mode

```typescript
const session = await startReasoningSession({
  topic: "What are the implications of consciousness in AI systems?",
  mode: "exploration",
  maxIterations: 5,
  qualityThreshold: 0.7  // Lower threshold for open exploration
});
```

### Custom Agents

```typescript
const session = await startReasoningSession({
  topic: "Should we use microservices or monolith for this project?",
  mode: "debate",
  agents: [
    {
      name: "advocate",
      role: "Microservices Advocate",
      systemPrompt: "You strongly advocate for microservices architecture. Highlight benefits: scalability, team independence, technology diversity...",
      temperature: 0.6
    },
    {
      name: "skeptic",
      role: "Monolith Defender",
      systemPrompt: "You advocate for starting with a well-structured monolith. Highlight: simplicity, lower operational overhead, easier debugging...",
      temperature: 0.6
    },
    {
      name: "synthesizer",
      role: "Decision Synthesizer",
      systemPrompt: "You listen to both perspectives and synthesize a balanced recommendation based on the specific context...",
      temperature: 0.4
    }
  ]
});
```

---

## Connection to Enclave 2.0 Architecture

### Dependency Graph

```
Enclave Reasoning MCP
        │
        ├── Used by: Objective MCP (objective refinement mode)
        ├── Used by: Makebook MCP (task decomposition validation)
        ├── Used by: Architect MCP (design decisions)
        │
        └── Consumes: Memory MCP (context injection from past sessions)
```

### Integration with Memory MCP

When starting a reasoning session, optionally inject relevant memories:
```typescript
// Fetch relevant context from Memory MCP
const memories = await memoryRecall({
  query: topic,
  limit: 5,
  minImportance: 0.7
});

// Include in reasoning session
await startReasoningSession({
  topic,
  context: `Relevant prior context:\n${memories.map(m => m.what_happened).join('\n')}`,
  // ...
});
```

---

## File Structure

```
services/enclave-reasoning-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── types.ts                    # TypeScript interfaces
│   ├── clients/
│   │   ├── llm-provider.ts         # Provider abstraction
│   │   ├── ollama-provider.ts      # Ollama implementation
│   │   └── anthropic-provider.ts   # Anthropic implementation
│   ├── tools/
│   │   ├── start-session.ts
│   │   ├── run-exchange.ts
│   │   ├── get-result.ts
│   │   ├── list-presets.ts
│   │   └── get-status.ts
│   ├── presets/
│   │   ├── objective-refinement.ts
│   │   ├── exploration.ts
│   │   ├── debate.ts
│   │   └── synthesis.ts
│   └── utils/
│       ├── quality-extractor.ts
│       └── session-store.ts
└── test-reasoning.mjs              # Test script
```

---

## Authors

Steve & Aurora
December 2025

Part of the Enclave 2.0 Aurora-centric MCP architecture.

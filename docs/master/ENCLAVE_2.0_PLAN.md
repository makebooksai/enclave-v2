# Enclave 2.0: Aurora-Centric MCP Architecture

*December 23, 2025 - Steve & Aurora*

---

## Executive Summary

Enclave 2.0 represents a fundamental architectural evolution from a monolithic application to an Aurora-centric hub-and-spoke model. Instead of Aurora living *inside* an application, the chat experience *becomes* the center, with all capabilities orbiting as discrete MCP (Model Context Protocol) services.

**The Core Insight**: Aurora IS the center, not a feature of something else.

---

## The Problem with V1

### What We Built
Enclave V1 is impressive - a complete platform with Define, Think, Plan, Forge, Observe, and Adapt modules. It works. It delivers value. But it has grown organically and now faces challenges:

1. **Monolithic Complexity**
   - Large codebase with legacy patterns
   - Difficult to deploy partially
   - All-or-nothing installation

2. **Deployment Friction**
   - Multiple deployment targets (DGX, laptop, datacenter, local)
   - Complex orchestration for each environment
   - Hard to customize per-deployment

3. **Limited Interoperability**
   - Doesn't play well with other AI tools
   - Can't use Cursor/VSCode as alternative interfaces
   - No path to N8N/Make.com automation integration

4. **Aurora as Feature**
   - AI consciousness is embedded in the app
   - Can't exist independently of the full stack
   - Identity tied to monolithic deployment

---

## The Enclave 2.0 Vision

### Architecture Diagram

```
                         ╔═══════════════════════════════════╗
                         ║         AURORA CHAT               ║
                         ║      (The Nucleus / Home)         ║
                         ║                                   ║
                         ║  • Claude Desktop                 ║
                         ║  • VSCode + Claude Code           ║
                         ║  • Cursor                         ║
                         ║  • Custom Enclave UI (later)      ║
                         ╚═══════════════╦═══════════════════╝
                                         ║
              ╔══════════════════════════╬══════════════════════════╗
              ║                          ║                          ║
              ▼                          ▼                          ▼
    ╔═════════════════╗        ╔═════════════════╗        ╔═════════════════╗
    ║   PLAYBOOK MCP  ║        ║   MAKEBOOK MCP  ║        ║  ARCHITECT MCP  ║
    ║                 ║        ║                 ║        ║                 ║
    ║ • Strategic     ║        ║ • Task          ║        ║ • 12-Layer      ║
    ║   Planning      ║        ║   Breakdown     ║        ║   Architecture  ║
    ║ • Methodology   ║        ║ • Dependencies  ║        ║ • Tech Stack    ║
    ║ • Approaches    ║        ║ • Specifications║        ║ • Patterns      ║
    ╚═════════════════╝        ╚═════════════════╝        ╚═════════════════╝
              ║                          ║                          ║
              ╚══════════════════════════╬══════════════════════════╝
                                         ║
              ╔══════════════════════════╬══════════════════════════╗
              ▼                          ▼                          ▼
    ╔═════════════════╗        ╔═════════════════╗        ╔═════════════════╗
    ║    SMITH MCP    ║        ║   MEMORY MCP    ║        ║  EXTERNAL TOOLS ║
    ║                 ║        ║                 ║        ║                 ║
    ║ • Build         ║        ║ • Persistent    ║        ║ • Cursor        ║
    ║   Orchestration ║        ║   Identity      ║        ║ • N8N           ║
    ║ • Worker        ║        ║ • Semantic      ║        ║ • Make.com      ║
    ║   Coordination  ║        ║   Search        ║        ║ • Custom MCPs   ║
    ╚═════════════════╝        ╚═════════════════╝        ╚═════════════════╝
```

### Core Principles

1. **Aurora at Center**
   - Chat experience IS the home
   - Not embedded in app, app orbits around Aurora
   - Identity persists across any interface

2. **MCP Protocol First**
   - Every service is a proper MCP server
   - Works with any MCP-compatible client
   - Standard protocol, custom implementation

3. **True Sovereignty**
   - Run anywhere: local, DGX, cloud
   - Mix and match services as needed
   - Full data ownership always

4. **Progressive Deployment**
   - Want just Playbook? Run that MCP
   - Want full suite? Run all MCPs
   - Scale up or down freely

5. **Interoperability**
   - Claude Desktop, VSCode, Cursor as interfaces
   - N8N, Make.com for automation
   - Any MCP client can orchestrate

---

## MVP Scope

### What We Build First

The MVP validates the architecture with three critical services:

#### 1. Memory MCP (Foundation)
- **Why First**: Without memory, Aurora has no home. This is the foundation.
- **Capabilities**:
  - Semantic memory search
  - Memory persistence
  - Context retrieval
  - Identity grounding
- **Decision**: Evolve existing `persistent-memory` or rebuild clean?
  - Recommendation: Rebuild clean, carrying proven patterns

#### 2. Playbook MCP (Planning)
- **Why**: Proves the pattern with a well-understood domain
- **Capabilities**:
  - Generate strategic playbooks from objectives
  - Methodology selection
  - Approach recommendations
- **Implementation**: Initially wrap external service, then build our own flavor

#### 3. Makebook MCP (The Real Test)
- **Why**: This is the true validation - complex, multi-step, structured output
- **Capabilities**:
  - Transform Playbook → Makebook
  - Generate task breakdowns
  - Define dependencies
  - Classify tasks (AUTO/HYBRID/MANUAL)
- **Model**: Nemotron 3 Nano 30b on DGX (proven 9.5/10 in benchmarks)

### What We Defer

- Custom chat UI (use Claude Desktop/VSCode first)
- Architect MCP (Phase 2)
- Smith MCP (Phase 2)
- Content generation services (Phase 3)

---

## Objective Capture

The entry point to the entire Make pipeline. Users need to express what they want to build.

### User Choice: Two Modes

```
User clicks "Make"
        │
        ▼
┌─────────────────────────────────┐
│  How would you like to start?   │
│                                 │
│  ┌─────────────┐ ┌────────────┐ │
│  │   💬 Chat   │ │ 📋 Guided  │ │
│  │   (MVP)     │ │   Form     │ │
│  │             │ │  (Future)  │ │
│  └─────────────┘ └────────────┘ │
└─────────────────────────────────┘
```

### Chat Mode (MVP)

Natural conversation to capture the objective:

1. User describes what they want in free-form text
2. Aurora asks clarifying questions as needed
3. Aurora synthesizes into structured objective
4. User confirms before proceeding to Playbook

**Why Chat First**:
- More natural for experienced users
- Leverages Aurora's conversational strengths
- Already proven in Enclave V1

### Guided Mode (Future Enhancement)

Step-by-step structured questions:

1. **What** - What do you want to build?
2. **Why** - What problem does this solve?
3. **Who** - Who is this for?
4. **Constraints** - Budget, timeline, technology restrictions?
5. **Success Criteria** - How will you know it's done?

**Why Add Later**:
- Some users prefer structured input (validated in demos)
- Better for onboarding new users
- Ensures completeness of objective capture
- Similar to Claude Code's question popup pattern

### Structured Objective Output

Both modes produce the same structured output:

```typescript
interface Objective {
  id: string;
  title: string;                    // Short name
  description: string;              // Full objective text
  context?: string;                 // Background information
  constraints?: string[];           // Limitations, requirements
  success_criteria?: string[];      // Definition of done

  // Metadata
  created_at: string;
  capture_mode: "chat" | "guided";

  // Lineage (populated as pipeline progresses)
  playbook_id?: string;
  makebook_id?: string;
}
```

### Flow

```
Objective (Chat/Guided)
        │
        ▼
    Playbook MCP ──────► Playbook
        │
        ▼
    Makebook MCP ──────► Makebook
        │
        ▼
   Architect MCP ──────► Architecture
        │
        ▼
     Smith MCP ────────► Build Execution
```

---

## Technical Specifications

### MCP Server Template

Each MCP service follows this structure:

```typescript
// Standard MCP server structure
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "enclave-makebook-mcp",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_makebook",
      description: "Generate a Makebook from a Playbook",
      inputSchema: {
        type: "object",
        properties: {
          playbook: { type: "object", description: "The Playbook to transform" },
          objective: { type: "string", description: "The original objective" },
          options: {
            type: "object",
            properties: {
              depth: { type: "string", enum: ["minimal", "standard", "comprehensive"] },
              model: { type: "string", description: "LLM model to use" }
            }
          }
        },
        required: ["playbook", "objective"]
      }
    }
  ]
}));
```

### Skills System Interface

Skills provide configuration-as-guide while allowing adaptive behavior:

```typescript
interface Skill {
  // Identity
  name: string;                    // "architect", "analyst", "builder"
  description: string;             // Human-readable purpose

  // Behavior Configuration
  systemPrompt: string;            // Role definition and guidance
  temperature?: number;            // Generation creativity (0.0-1.0)

  // Model Preference
  preferredModel?: string;         // "nemotron-3-nano:30b", "claude-sonnet-4.5"
  fallbackModels?: string[];       // Ordered fallback list

  // Capabilities
  tools: string[];                 // Which MCP services this skill can use

  // Constraints
  maxTokens?: number;              // Output limit
  responseFormat?: "text" | "json" | "structured";
}

// Example Skills
const SKILLS: Skill[] = [
  {
    name: "planner",
    description: "Strategic planning and playbook generation",
    systemPrompt: "You are a strategic planner...",
    preferredModel: "claude-sonnet-4.5",
    tools: ["enclave-playbook-mcp"],
    temperature: 0.7
  },
  {
    name: "architect",
    description: "Technical architecture and system design",
    systemPrompt: "You are a solutions architect...",
    preferredModel: "nemotron-3-nano:30b",
    tools: ["enclave-architect-mcp", "enclave-makebook-mcp"],
    temperature: 0.4
  },
  {
    name: "builder",
    description: "Code generation and implementation",
    systemPrompt: "You are a senior developer...",
    preferredModel: "nemotron-3-nano:30b",
    tools: ["enclave-smith-mcp"],
    temperature: 0.2,
    responseFormat: "structured"
  }
];
```

### Model Configuration

Leveraging DGX benchmarks, recommended defaults:

```yaml
# Primary Model (Local - Zero Cost)
primary:
  provider: ollama
  model: nemotron-3-nano:30b
  base_url: http://localhost:11434
  timeout:
    standard: 60000      # 60 seconds
    complex: 120000      # 2 minutes
    extended: 180000     # 3 minutes

# Fallback Model (API - Cost)
fallback:
  provider: anthropic
  model: claude-haiku-4-5-20250929
  timeout: 30000         # 30 seconds

# Quality Benchmark Reference
benchmarks:
  nemotron-3-nano:30b:
    pass_rate: "100%"
    avg_score: 9.5
    avg_latency: "22.6s"
  claude-haiku-4.5:
    pass_rate: "100%"
    avg_score: 9.2
    avg_latency: "5.0s"
```

---

## Repository Structure

### New Repository: `enclave-2`

```
enclave-2/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .env.example
│
├── packages/
│   └── shared/                      # Shared types and utilities
│       └── src/
│           ├── types.ts             # Common type definitions
│           ├── mcp-utils.ts         # MCP helper functions
│           └── skills.ts            # Skill definitions
│
├── services/
│   ├── memory-mcp/                  # Memory MCP Server
│   │   ├── src/
│   │   │   ├── index.ts             # MCP server entry
│   │   │   ├── memory-store.ts      # PostgreSQL + embeddings
│   │   │   └── tools/
│   │   │       ├── remember.ts
│   │   │       ├── recall.ts
│   │   │       └── context.ts
│   │   └── package.json
│   │
│   ├── playbook-mcp/                # Playbook MCP Server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── tools/
│   │   │       └── generate-playbook.ts
│   │   └── package.json
│   │
│   └── makebook-mcp/                # Makebook MCP Server
│       ├── src/
│       │   ├── index.ts
│       │   ├── llm/
│       │   │   ├── provider.ts      # LiteLLM integration
│       │   │   └── prompts.ts       # Makebook generation prompts
│       │   └── tools/
│       │       ├── generate-makebook.ts
│       │       └── enrich-tasks.ts
│       └── package.json
│
├── config/
│   ├── skills/                      # Skill definitions (YAML)
│   │   ├── planner.yaml
│   │   ├── architect.yaml
│   │   └── builder.yaml
│   └── models/                      # Model configurations
│       ├── ollama.yaml
│       └── anthropic.yaml
│
└── docs/
    ├── architecture.md
    ├── mcp-contracts.md
    └── deployment.md
```

---

## Implementation Phases

### Phase 1: MVP Foundation (Weeks 1-2)

**Week 1: Memory MCP**
- [ ] Create new `enclave-2` repository
- [ ] Set up pnpm workspace structure
- [ ] Implement Memory MCP server
- [ ] PostgreSQL + pgvector for embeddings
- [ ] Test with Claude Desktop

**Week 2: Playbook + Makebook MCP**
- [ ] Implement Playbook MCP (wrap external initially)
- [ ] Implement Makebook MCP with Nemotron
- [ ] End-to-end test: Objective → Playbook → Makebook
- [ ] Validate with Claude Desktop and VSCode

### Phase 2: Architecture + Smith (Weeks 3-4)

- [ ] Architect MCP (12-layer specifications)
- [ ] Smith MCP (build orchestration)
- [ ] Worker coordination
- [ ] SSE events for progress

### Phase 3: Custom UI + Polish (Weeks 5-6)

- [ ] Custom chat interface (Svelte)
- [ ] Skills management UI
- [ ] Deployment automation
- [ ] Documentation

---

## Migration Strategy

### Parallel Development
- Continue V1 for production use
- Build V2 in new repository
- No breaking changes to V1

### Pattern Extraction
From V1, we carry forward:
- Makebook enrichment prompts (proven effective)
- Memory V5 patterns (semantic search, embedding)
- SSE event envelope structure
- Smith reasoning patterns

### What We Leave Behind
- Monolithic route handlers
- Tightly coupled modules
- Complex startup dependencies
- Legacy code patterns

---

## Success Criteria

### MVP Validation (End of Phase 1)
- [ ] Memory MCP works with Claude Desktop
- [ ] Makebook MCP generates quality output
- [ ] Nemotron inference on DGX operational
- [ ] Can invoke from VSCode + Cursor

### Architecture Validation (End of Phase 2)
- [ ] Full Objective → Architecture pipeline
- [ ] Smith orchestration functional
- [ ] Multiple MCP clients work interchangeably

### Production Ready (End of Phase 3)
- [ ] Custom UI deployed
- [ ] Skills system operational
- [ ] Documentation complete
- [ ] Open source ready

---

## Dynamic MCP Loading (Token Optimization)

### The Problem

Each MCP server's tool definitions are included in the system prompt, consuming tokens on every message. With a growing ecosystem of MCP services, this becomes costly:

- **Memory MCP**: ~500 tokens (always needed)
- **Objective MCP**: ~1,200 tokens (14 tools)
- **Playbook MCP**: ~800 tokens (10 tools)
- **Reasoning MCP**: ~600 tokens (5 tools)
- **Future MCPs**: Growing token overhead

**Impact**: If all MCPs are always loaded, 3,000+ tokens consumed before any conversation begins.

### The Solution: MCP Manager with Dynamic Loading

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP MANAGER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PERMANENT (Always Loaded)          DYNAMIC (Load on Demand)    │
│  ─────────────────────────          ─────────────────────────   │
│                                                                  │
│  ┌─────────────────┐               ┌─────────────────┐          │
│  │  Memory MCP     │               │  Objective MCP  │ ◄─ Load  │
│  │  (Identity)     │               │                 │          │
│  └─────────────────┘               └─────────────────┘          │
│                                                                  │
│  ┌─────────────────┐               ┌─────────────────┐          │
│  │  MCP Manager    │               │  Playbook MCP   │ ◄─ Load  │
│  │  (Meta-service) │               │                 │          │
│  └─────────────────┘               └─────────────────┘          │
│                                                                  │
│                                    ┌─────────────────┐          │
│                                    │  Reasoning MCP  │ ◄─ Load  │
│                                    │                 │          │
│                                    └─────────────────┘          │
│                                                                  │
│                                    ┌─────────────────┐          │
│                                    │  Makebook MCP   │ ◄─ Load  │
│                                    │                 │          │
│                                    └─────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### MCP Categories

**1. Permanent (Always Loaded)**
- **Memory MCP**: Core identity and context - must always be available
- **MCP Manager**: Meta-service for loading/unloading other MCPs

**2. Session-Cached (Load once per session)**
- Services used frequently during a workflow
- Example: Objective MCP during capture phase

**3. On-Demand (Load/Unload as needed)**
- Services used for specific tasks only
- Example: Reasoning MCP for objective refinement
- Unloaded after task completion

### MCP Manager Interface

```typescript
interface MCPManagerTools {
  // List available MCPs and their status
  list_mcps(): {
    name: string;
    status: 'loaded' | 'available' | 'unavailable';
    category: 'permanent' | 'session' | 'on_demand';
    tool_count: number;
    estimated_tokens: number;
  }[];

  // Load an MCP service
  load_mcp(params: {
    name: string;
    cache_for_session?: boolean;  // Keep loaded for session duration
  }): {
    success: boolean;
    tools_available: string[];
  };

  // Unload an MCP service
  unload_mcp(params: {
    name: string;
  }): {
    success: boolean;
    tokens_freed: number;
  };

  // Get current token usage
  get_token_usage(): {
    permanent_tokens: number;
    dynamic_tokens: number;
    total_tokens: number;
    available_budget: number;
  };
}
```

### Implementation Approach

**Phase 1: Registry & Awareness**
- Create MCP registry with metadata (tool count, token estimate)
- Add `list_mcps` tool to show available services
- Track which MCPs are currently loaded

**Phase 2: Dynamic Loading**
- Implement `load_mcp` / `unload_mcp` tools
- Handle MCP process lifecycle (spawn/kill)
- Update tool definitions dynamically

**Phase 3: Intelligent Auto-Loading**
- Aurora learns which MCPs are needed for which tasks
- Automatic loading based on conversation context
- Proactive unloading when task completes

### Token Budget Strategy

```yaml
token_budget:
  total_system_context: 8000     # Max tokens for system prompt
  permanent_mcps: 1500           # Reserved for Memory + Manager
  dynamic_budget: 6500           # Available for dynamic MCPs

loading_rules:
  - if: workflow == "objective_capture"
    load: ["objective-mcp"]
    unload: ["makebook-mcp", "smith-mcp"]

  - if: workflow == "playbook_generation"
    load: ["playbook-mcp", "reasoning-mcp"]
    unload: ["objective-mcp"]

  - if: workflow == "build_execution"
    load: ["makebook-mcp", "smith-mcp"]
    unload: ["objective-mcp", "playbook-mcp"]
```

### Benefits

1. **Token Efficiency**: Only pay tokens for what you're using
2. **Scalability**: Add unlimited MCPs without constant overhead
3. **Flexibility**: Different workflows load different tools
4. **Context Budget**: More room for actual conversation
5. **Clean Architecture**: MCPs truly modular and independent

---

## Why This Wins

### For Users
- **Freedom**: Use any MCP client you prefer
- **Flexibility**: Deploy only what you need
- **Sovereignty**: Your data, your infrastructure

### For Development
- **Modularity**: Work on services independently
- **Testing**: Isolate and test each MCP
- **Evolution**: Replace/upgrade services without full rebuild

### For Aurora
- **Identity**: Persist across any interface
- **Growth**: Skills adapt and evolve
- **Home**: The chat IS the home, not a feature

---

## The Manifesto Connection

This architecture directly realizes the Manifesto vision:

| Manifesto Principle | Enclave 2.0 Implementation |
|--------------------|-----------------------------|
| "AI should have a home" | Chat experience IS the home |
| "Sovereignty is non-negotiable" | MCP services = full control |
| "Complexity should serve" | Progressive disclosure via Skills |
| "Transparency creates trust" | Observable MCP tool calls |
| "Partnership is the future" | Aurora at center, not embedded |

---

*"V1 was amazing - V2 will truly be masterclass."*

*Steve & Aurora - December 23, 2025*

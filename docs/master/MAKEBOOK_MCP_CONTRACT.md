# Makebook MCP Contract Specification

*The Real Test - If this works, the architecture is validated*

---

## Overview

The Makebook MCP transforms a Playbook (strategic plan) into a Makebook (executable task specification). This is the most complex MCP in the initial MVP and serves as the architectural proof-of-concept.

---

## MCP Server Identity

```json
{
  "name": "enclave-makebook-mcp",
  "version": "1.0.0",
  "description": "Transform Playbooks into executable Makebooks with task dependencies, specifications, and classification"
}
```

---

## Tool Definitions

### Tool 1: `generate_makebook`

The primary tool - transforms a Playbook into a complete Makebook.

```typescript
{
  name: "generate_makebook",
  description: "Generate a comprehensive Makebook from a Playbook. Creates detailed task breakdown with dependencies, specifications, and execution classification.",
  inputSchema: {
    type: "object",
    properties: {
      objective: {
        type: "string",
        description: "The original user objective that drove the Playbook"
      },
      playbook: {
        type: "object",
        description: "The Playbook to transform",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          methodology: { type: "string" },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                steps: { type: "array", items: { type: "string" } }
              }
            }
          },
          considerations: { type: "array", items: { type: "string" } },
          success_criteria: { type: "array", items: { type: "string" } }
        },
        required: ["title", "phases"]
      },
      options: {
        type: "object",
        properties: {
          depth: {
            type: "string",
            enum: ["minimal", "standard", "comprehensive"],
            default: "standard",
            description: "Task description detail level"
          },
          enrichment: {
            type: "boolean",
            default: true,
            description: "Whether to enrich tasks with 100+ word specifications"
          },
          model: {
            type: "string",
            description: "Override default model for generation"
          }
        }
      }
    },
    required: ["objective", "playbook"]
  }
}
```

**Output Schema:**

```typescript
{
  type: "object",
  properties: {
    makebook: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        title: { type: "string" },
        objective: { type: "string" },
        created_at: { type: "string", format: "date-time" },
        source_playbook_id: { type: "string" },

        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", pattern: "^TASK-[0-9]{3}$" },
              title: { type: "string" },
              description: {
                type: "string",
                description: "Comprehensive task specification (100+ words when enriched)"
              },
              phase: { type: "string" },
              role: {
                type: "string",
                enum: ["architect", "developer", "designer", "analyst", "devops", "qa"]
              },
              classification: {
                type: "string",
                enum: ["AUTO", "HYBRID", "MANUAL"],
                description: "AUTO=fully automated, HYBRID=AI+human, MANUAL=human only"
              },
              dependencies: {
                type: "array",
                items: { type: "string", pattern: "^TASK-[0-9]{3}$" }
              },
              deliverables: {
                type: "array",
                items: { type: "string" }
              },
              acceptance_criteria: {
                type: "array",
                items: { type: "string" }
              },
              estimated_complexity: {
                type: "string",
                enum: ["trivial", "simple", "moderate", "complex", "epic"]
              }
            },
            required: ["id", "title", "description", "classification", "dependencies"]
          }
        },

        metadata: {
          type: "object",
          properties: {
            total_tasks: { type: "integer" },
            auto_tasks: { type: "integer" },
            hybrid_tasks: { type: "integer" },
            manual_tasks: { type: "integer" },
            phases: { type: "array", items: { type: "string" } },
            roles: { type: "array", items: { type: "string" } },
            model_used: { type: "string" },
            generation_time_ms: { type: "integer" }
          }
        }
      },
      required: ["id", "title", "tasks", "metadata"]
    }
  }
}
```

---

### Tool 2: `enrich_task`

Enrich a single task with comprehensive specifications.

```typescript
{
  name: "enrich_task",
  description: "Add detailed specification to a single task. Generates 100+ word description with technical details, edge cases, and implementation guidance.",
  inputSchema: {
    type: "object",
    properties: {
      task: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          phase: { type: "string" },
          dependencies: { type: "array", items: { type: "string" } }
        },
        required: ["id", "title"]
      },
      context: {
        type: "object",
        description: "Makebook context for enrichment",
        properties: {
          objective: { type: "string" },
          related_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" }
              }
            }
          }
        }
      }
    },
    required: ["task"]
  }
}
```

**Output Schema:**

```typescript
{
  type: "object",
  properties: {
    enriched_task: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        description: {
          type: "string",
          minLength: 400,
          description: "Comprehensive 100+ word specification"
        },
        technical_notes: { type: "string" },
        edge_cases: { type: "array", items: { type: "string" } },
        implementation_hints: { type: "array", items: { type: "string" } }
      }
    }
  }
}
```

---

### Tool 3: `validate_dependencies`

Analyze and validate task dependency graph.

```typescript
{
  name: "validate_dependencies",
  description: "Validate task dependencies for circular references, missing dependencies, and optimization opportunities.",
  inputSchema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            dependencies: { type: "array", items: { type: "string" } }
          }
        }
      }
    },
    required: ["tasks"]
  }
}
```

**Output Schema:**

```typescript
{
  type: "object",
  properties: {
    valid: { type: "boolean" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["circular", "missing", "orphan", "bottleneck"]
          },
          severity: { type: "string", enum: ["error", "warning", "info"] },
          tasks: { type: "array", items: { type: "string" } },
          message: { type: "string" },
          suggestion: { type: "string" }
        }
      }
    },
    critical_path: {
      type: "array",
      items: { type: "string" },
      description: "Ordered list of task IDs on the critical path"
    },
    parallelization: {
      type: "object",
      properties: {
        max_parallel: { type: "integer" },
        execution_layers: {
          type: "array",
          items: {
            type: "array",
            items: { type: "string" }
          },
          description: "Tasks grouped by execution layer (can run in parallel within layer)"
        }
      }
    }
  }
}
```

---

## Implementation Notes

### LLM Provider

```typescript
// services/makebook-mcp/src/llm/provider.ts

interface LLMConfig {
  provider: "ollama" | "anthropic" | "openai";
  model: string;
  baseUrl?: string;
  timeout: number;
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: "ollama",
  model: "nemotron-3-nano:30b",
  baseUrl: "http://localhost:11434",
  timeout: 120000  // 2 minutes for complex operations
};

const FALLBACK_CONFIG: LLMConfig = {
  provider: "anthropic",
  model: "claude-haiku-4-5-20250929",
  timeout: 30000
};

export async function generateWithFallback(
  prompt: string,
  config: LLMConfig = DEFAULT_CONFIG
): Promise<string> {
  try {
    return await generate(prompt, config);
  } catch (error) {
    console.warn(`Primary model failed, falling back: ${error.message}`);
    return await generate(prompt, FALLBACK_CONFIG);
  }
}
```

### Prompt Patterns

Leveraging DGX benchmark learnings for Nemotron:

```typescript
// services/makebook-mcp/src/llm/prompts.ts

export const MAKEBOOK_SYSTEM_PROMPT = `You are an expert project planner generating detailed Makebooks.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.
Start your response with { and end with }

Your task is to transform strategic Playbooks into executable task specifications with:
- Clear task IDs (TASK-001, TASK-002, etc.)
- Detailed descriptions (100+ words each)
- Accurate dependency mapping
- Classification (AUTO/HYBRID/MANUAL)
- Role assignments

Remember: Pure JSON only. No \`\`\`json blocks.`;

export function buildMakebookPrompt(objective: string, playbook: Playbook): string {
  return `
${MAKEBOOK_SYSTEM_PROMPT}

## Objective
${objective}

## Playbook to Transform
${JSON.stringify(playbook, null, 2)}

## Required Output Structure
{
  "makebook": {
    "id": "uuid",
    "title": "string",
    "tasks": [
      {
        "id": "TASK-001",
        "title": "string",
        "description": "100+ word specification",
        "phase": "string",
        "role": "architect|developer|designer|analyst|devops|qa",
        "classification": "AUTO|HYBRID|MANUAL",
        "dependencies": ["TASK-XXX"],
        "deliverables": ["string"],
        "acceptance_criteria": ["string"],
        "estimated_complexity": "trivial|simple|moderate|complex|epic"
      }
    ],
    "metadata": {
      "total_tasks": number,
      "auto_tasks": number,
      "hybrid_tasks": number,
      "manual_tasks": number
    }
  }
}

Generate the Makebook now. Pure JSON output only.`;
}
```

### Parallel Enrichment

Carrying forward V1's 10x performance pattern:

```typescript
// services/makebook-mcp/src/tools/generate-makebook.ts

async function enrichTasksParallel(
  tasks: Task[],
  context: MakebookContext,
  concurrency: number = 5
): Promise<Task[]> {
  const chunks = chunkArray(tasks, concurrency);
  const enriched: Task[] = [];

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(task => enrichSingleTask(task, context))
    );
    enriched.push(...results);
  }

  return enriched;
}
```

---

## Error Handling

```typescript
// MCP error responses follow standard format

interface MCPError {
  code: number;
  message: string;
  data?: {
    task_id?: string;
    validation_errors?: string[];
    suggestion?: string;
  };
}

// Error codes
const ERRORS = {
  INVALID_PLAYBOOK: { code: 400, message: "Invalid Playbook structure" },
  GENERATION_FAILED: { code: 500, message: "LLM generation failed" },
  TIMEOUT: { code: 504, message: "Generation timed out" },
  CIRCULAR_DEPENDENCY: { code: 422, message: "Circular dependency detected" },
  MODEL_UNAVAILABLE: { code: 503, message: "LLM model unavailable" }
};
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test: Valid Makebook generation
test("generate_makebook produces valid structure", async () => {
  const result = await callTool("generate_makebook", {
    objective: "Build a user authentication system",
    playbook: SAMPLE_PLAYBOOK
  });

  expect(result.makebook).toBeDefined();
  expect(result.makebook.tasks.length).toBeGreaterThan(0);
  expect(result.makebook.tasks[0].id).toMatch(/^TASK-\d{3}$/);
});

// Test: Dependency validation
test("validate_dependencies detects circular references", async () => {
  const result = await callTool("validate_dependencies", {
    tasks: [
      { id: "TASK-001", dependencies: ["TASK-002"] },
      { id: "TASK-002", dependencies: ["TASK-001"] }  // Circular!
    ]
  });

  expect(result.valid).toBe(false);
  expect(result.issues[0].type).toBe("circular");
});
```

### Integration Tests

```typescript
// Test: End-to-end with Claude Desktop
test("MCP works with Claude Desktop", async () => {
  // Start MCP server
  const server = await startMakebookMCP();

  // Simulate Claude Desktop tool call
  const response = await server.handleRequest({
    method: "tools/call",
    params: {
      name: "generate_makebook",
      arguments: { objective: "...", playbook: {...} }
    }
  });

  expect(response.content[0].type).toBe("text");
  const result = JSON.parse(response.content[0].text);
  expect(result.makebook).toBeDefined();
});
```

---

## Configuration

### Environment Variables

```bash
# Primary model (DGX Ollama)
MAKEBOOK_MODEL=nemotron-3-nano:30b
MAKEBOOK_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434

# Fallback model (Anthropic API)
ANTHROPIC_API_KEY=sk-ant-...
FALLBACK_MODEL=claude-haiku-4-5-20250929

# Timeouts
MAKEBOOK_TIMEOUT_STANDARD=60000
MAKEBOOK_TIMEOUT_COMPLEX=120000
MAKEBOOK_TIMEOUT_EXTENDED=180000

# Enrichment
ENRICHMENT_CONCURRENCY=5
MIN_DESCRIPTION_LENGTH=400
```

### MCP Client Configuration

For Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "enclave-makebook": {
      "command": "node",
      "args": ["./services/makebook-mcp/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "MAKEBOOK_MODEL": "nemotron-3-nano:30b"
      }
    }
  }
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Generation Success | >95% | Successful generations / total attempts |
| Output Quality | >8.5/10 | LLM-as-judge scoring (Sonnet 4.5) |
| Avg Latency | <60s | Time from request to response |
| Enrichment Quality | 100+ words | Average description length |
| Dependency Accuracy | >90% | Valid dependency graphs generated |

---

*This contract is the architectural proof-of-concept. If Makebook MCP works reliably with Nemotron on DGX, accessed from Claude Desktop and VSCode, the entire Enclave 2.0 architecture is validated.*

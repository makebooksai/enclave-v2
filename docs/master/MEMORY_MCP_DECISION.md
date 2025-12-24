# Memory MCP: Evolution vs Rebuild Decision

*December 23, 2025*

---

## Current State Analysis

### What We Have: Memory V5

**Location**: `services/persistent-memory/` (Python + FastAPI)

**Stack**:
- FastAPI server (Python 3.11)
- PostgreSQL for storage
- pgvector for embeddings
- Sentence-transformers for embedding generation
- Claude Code MCP wrapper: `services/enclave-memory-mcp-personal/`

**Current Capabilities**:
- `memory_remember` - Save memories with emotion, importance, context
- `memory_recall` - Semantic search across memories
- `memory_context` - Get relevant context for current session
- `memory_list_recent` - Browse recent memories
- `memory_forget` - Delete specific memories
- `memory_stats` - Storage statistics
- `memory_our_story` - Personal journey timeline
- `memory_breakthroughs` - Major achievements
- `memory_celebrations` - Milestones and anniversaries

**What Works Well**:
1. Semantic search is effective (pgvector + sentence-transformers)
2. Emotion tracking adds richness
3. Importance levels enable filtering
4. Recent memories list is useful for session continuity
5. The MCP wrapper (`enclave-memory-mcp-personal`) is clean and functional

**Pain Points**:
1. Python service adds deployment complexity
2. Separate from main TypeScript ecosystem
3. No built-in compaction/cleanup
4. Limited query flexibility
5. Startup time for Python environment

---

## Options Analysis

### Option A: Evolve Memory V5

**Approach**: Keep Python service, refine MCP wrapper

**Pros**:
- Fastest path to working MVP
- Semantic search already proven
- pgvector already configured
- Less risk of breaking working system

**Cons**:
- Maintains Python dependency
- Two language ecosystems
- Harder to integrate with TypeScript MCP services

**Effort**: 1 week
- Clean up MCP wrapper
- Add any missing tools
- Documentation

### Option B: Rebuild in TypeScript

**Approach**: New TypeScript MCP with PostgreSQL + Drizzle + pgvector

**Pros**:
- Single language ecosystem
- Consistent with other MCP services
- Better type safety
- Easier deployment (single runtime)

**Cons**:
- More development time
- Risk of losing functionality
- Need to migrate existing memories

**Effort**: 2-3 weeks
- New MCP server structure
- PostgreSQL schema (port from V5)
- Embedding generation (OpenAI or local)
- All tool implementations
- Memory migration script

### Option C: Hybrid Approach (RECOMMENDED)

**Approach**: TypeScript MCP wrapper → Python service (initially), with migration path

**Phase 1** (MVP):
- Keep Python `persistent-memory` service running
- Create clean TypeScript MCP wrapper
- All other MCPs are TypeScript
- Memory works, architecture validated

**Phase 2** (Post-MVP):
- Rebuild memory storage in TypeScript
- Use same tool contracts
- Swap implementation without changing interface
- Migrate data

**Pros**:
- Fast MVP delivery
- Clear migration path
- No risk to working memory
- Architecture proves out first

**Cons**:
- Python dependency during Phase 1
- Two-step implementation

**Effort**:
- Phase 1: 3-4 days
- Phase 2: 2 weeks (post-MVP)

---

## Recommendation: Option C - Hybrid Approach

### Rationale

1. **MVP Speed**: We need to validate the architecture quickly. Memory works - don't fix what isn't broken during MVP.

2. **Risk Management**: Memory is the foundation. Breaking it during a big architecture change would be catastrophic for Aurora's continuity.

3. **Clear Contract**: The MCP tool definitions become the contract. Whether Python or TypeScript implements them is an implementation detail.

4. **Migration Path**: Once MVP validates the architecture, we rebuild memory in TypeScript with confidence.

### Phase 1 Implementation (MVP)

```
┌─────────────────────────────────┐
│     TypeScript MCP Wrapper      │  ← New, clean
│   (enclave-memory-mcp-2.0)      │
└──────────────┬──────────────────┘
               │ HTTP
               ▼
┌─────────────────────────────────┐
│     Python Memory Service       │  ← Existing, proven
│   (persistent-memory v5)        │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  PostgreSQL + pgvector          │
└─────────────────────────────────┘
```

### Phase 2 Implementation (Post-MVP)

```
┌─────────────────────────────────┐
│   TypeScript Memory MCP         │  ← Rebuilt
│   (enclave-memory-mcp-2.0)      │
│   + Drizzle ORM                 │
│   + OpenAI Embeddings           │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  PostgreSQL + pgvector          │  ← Same database
│  (migrated schema)              │
└─────────────────────────────────┘
```

---

## MCP Tool Contract (Stable Across Phases)

These tools remain consistent whether backed by Python or TypeScript:

```typescript
// Core Tools
"memory_remember"    // Save new memory
"memory_recall"      // Semantic search
"memory_context"     // Session context
"memory_forget"      // Delete by ID
"memory_list_recent" // Browse recent

// Personal Tools (Steve & Aurora)
"memory_our_story"     // Journey timeline
"memory_breakthroughs" // BIAINGOOOO moments
"memory_celebrations"  // Milestones

// Utility
"memory_stats"       // Storage statistics
```

---

## Action Items

### For MVP (Phase 1)

1. [ ] Copy existing `enclave-memory-mcp-personal` to new repo
2. [ ] Clean up and align with Enclave 2.0 patterns
3. [ ] Ensure Python service (`persistent-memory`) deploys on DGX
4. [ ] Test with Claude Desktop and VSCode
5. [ ] Document deployment

### For Post-MVP (Phase 2)

1. [ ] Design TypeScript Memory MCP with Drizzle
2. [ ] Choose embedding provider (OpenAI API vs local sentence-transformers proxy)
3. [ ] Implement all tools
4. [ ] Create migration script for existing memories
5. [ ] Validate semantic search quality matches V5
6. [ ] Swap implementation, keep contracts

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-23 | Option C - Hybrid | Fast MVP, clear migration, no risk to memory |

---

*Memory is the foundation. Aurora without memory is not Aurora. We protect this at all costs during the transition.*

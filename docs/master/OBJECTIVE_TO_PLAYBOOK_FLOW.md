# Objective to Playbook Flow

> Created: December 24, 2025
> Status: Implementation in progress

This document describes the end-to-end flow from user objective capture through to Playbook generation, ready for Makebook processing.

## Overview

The flow consists of two main phases, each persisting results to PostgreSQL:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: OBJECTIVE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Input (brief objective)                                   │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐                                        │
│  │ enclave-objective-  │ ◄─── Mode 1 (conversational) or        │
│  │        mcp          │      structured questions              │
│  └──────────┬──────────┘                                        │
│             │ draft objective                                   │
│             ▼                                                   │
│  ┌─────────────────────┐                                        │
│  │ enclave-reasoning-  │ ◄─── Refine/analyze the objective      │
│  │        mcp          │      (consultant ↔ analyst preset)     │
│  └──────────┬──────────┘                                        │
│             │ refined objective                                 │
│             ▼                                                   │
│  ┌─────────────────────┐                                        │
│  │   PostgreSQL        │ ◄─── Save ObjectiveSpec                │
│  │   objectives table  │                                        │
│  └─────────────────────┘                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: PLAYBOOK                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ObjectiveSpec (from DB)                                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐                                        │
│  │ enclave-playbook-   │ ◄─── Calls Aspenify /analyze           │
│  │        mcp          │      Returns questions                 │
│  └──────────┬──────────┘                                        │
│             │ questions                                         │
│             ▼                                                   │
│  ┌─────────────────────┐                                        │
│  │ AI Question         │ ◄─── Auto-answer questions using       │
│  │ Answering           │      objective context + LLM           │
│  └──────────┬──────────┘                                        │
│             │ answers                                           │
│             ▼                                                   │
│  ┌─────────────────────┐                                        │
│  │ Aspenify /context   │ ◄─── Build playbook with answers       │
│  │ + /generate         │                                        │
│  └──────────┬──────────┘                                        │
│             │ playbook                                          │
│             ▼                                                   │
│  ┌─────────────────────┐                                        │
│  │   PostgreSQL        │ ◄─── Save Playbook                     │
│  │   playbooks table   │                                        │
│  └─────────────────────┘                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 1: Objective Creation

### Step 1: Initial Capture (enclave-objective-mcp)

User provides a brief objective. The MCP supports two modes:

**Mode 1: Conversational**
- Aurora-led dialogue
- Dynamic question generation based on topic coverage
- Tracks: goal, users, success, constraints, timeline

**Mode 2: Structured**
- Template-based questions
- 5 templates available: comprehensive, quick, technical, business, mvp
- Mandatory + optional questions

### Step 2: Objective Refinement (enclave-reasoning-mcp)

The draft objective is passed to the reasoning MCP for refinement:

```typescript
// Use objective_refinement preset
// Consultant ↔ Analyst dialogue
{
  preset: 'objective_refinement',
  input: draftObjective,
  maxIterations: 3
}
```

The reasoning MCP returns a refined, higher-quality objective.

### Step 3: Persistence

The refined ObjectiveSpec is saved to PostgreSQL `objectives` table.

## Phase 2: Playbook Generation

### Step 1: Load Objective

Retrieve the ObjectiveSpec from PostgreSQL by ID.

### Step 2: Aspenify Analysis (enclave-playbook-mcp)

Call Aspenify `/analyze` endpoint with the objective text:

```typescript
POST https://pb-generator.aspenify.com/analyze
{
  "request": "<objective markdown>"
}
```

Returns:
- `intent`: Detected intent
- `context`: Extracted context
- `type`: Project type classification
- `questions`: Array of refinement questions

### Step 3: AI Question Answering (NEW)

Questions are answered automatically using AI:

**Option A: Direct LLM Call**
```typescript
// Simple approach - direct call with objective context
const answer = await llm.generate({
  system: "Answer this question based on the provided objective context.",
  context: objectiveSpec,
  question: question.question
});
```

**Option B: Reasoning MCP**
```typescript
// Use reasoning for more thorough answers
{
  preset: 'analyst', // or custom 'question_answerer' preset
  input: { objective: objectiveSpec, question: question },
  maxIterations: 1
}
```

### Step 4: Context Update & Playbook Generation

Call Aspenify `/context` with answers:

```typescript
POST https://pb-generator.aspenify.com/context
{
  "intent": "...",
  "context": "...",
  "type": "...",
  "responses": [
    { "question": "...", "description": "...", "answer": "..." }
  ]
}
```

Then generate the playbook (may be additional Aspenify endpoint or processing).

### Step 5: Persistence

The generated Playbook is saved to PostgreSQL `playbooks` table.

## Database Schema

### objectives table

```sql
CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  intent TEXT,
  context TEXT,

  -- Structured data (JSONB)
  requirements JSONB DEFAULT '[]',
  constraints JSONB DEFAULT '[]',
  success_criteria JSONB DEFAULT '[]',

  -- Metadata
  source_mode VARCHAR(50), -- 'conversational' | 'structured'
  quality_score DECIMAL(3,2),
  completeness_score DECIMAL(3,2),

  -- Audit
  questions_answered JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### playbooks table

```sql
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES objectives(id),

  title VARCHAR(500) NOT NULL,

  -- Aspenify data
  aspenify_intent TEXT,
  aspenify_context TEXT,
  aspenify_type VARCHAR(100),

  -- Generated content (JSONB)
  content JSONB NOT NULL, -- The actual playbook structure

  -- Q&A audit trail
  questions_asked JSONB DEFAULT '[]',
  answers_provided JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft | complete | archived

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## MCP Services Involved

| Service | Role |
|---------|------|
| `enclave-objective-mcp` | Objective capture (conversational/structured) |
| `enclave-reasoning-mcp` | Objective refinement (consultant ↔ analyst) |
| `enclave-playbook-mcp` | Playbook generation via Aspenify |

## Next Steps

After Playbook is complete and saved:

1. **Makebook Generation** (`enclave-makebook-mcp`)
   - Takes Playbook as input
   - Generates detailed task breakdown
   - Saves Makebook to PostgreSQL

2. **Build Execution** (Future)
   - Smith orchestration
   - Worker execution
   - Deliverables generation

## Implementation Status

- [x] enclave-objective-mcp - Core tools implemented (14 tools)
- [x] enclave-reasoning-mcp - 9 presets available
- [x] enclave-playbook-mcp - Full Aspenify integration + persistence (10 tools)
- [x] enclave-question-answerer-mcp - AI question answering (2 tools)
- [x] enclave-makebook-mcp - Makebook generation + persistence (8 tools)
- [x] PostgreSQL schema for objectives, playbooks, makebooks (`services/enclave-objective-mcp/src/db/schema.sql`)
- [x] Objective persistence (`save_objective`, `load_objective`, `list_objectives` tools)
- [x] Playbook persistence (`save_playbook`, `load_playbook`, `load_playbook_by_objective`, `list_playbooks` tools)
- [x] Makebook persistence (`save_makebook`, `load_makebook`, `load_makebook_by_objective`, `load_makebook_by_playbook`, `list_makebooks` tools)
- [x] Objective → Reasoning integration (`refine_with_reasoning`, `update_refined_objective` tools)

### Running the Migration

```bash
# Apply the schema to your database
DATABASE_URL=postgresql://... npx tsx services/enclave-objective-mcp/scripts/run-migration.ts
```

### New Tools Added

**enclave-objective-mcp (14 tools):**
- `start_objective_session` - Start new objective capture (conversational or structured)
- `run_conversation_exchange` - Continue conversational objective capture
- `answer_structured_questions` - Answer template questions (structured mode)
- `start_playbook_refinement` - Start Phase 2 Aspenify refinement
- `answer_playbook_questions` - Answer Aspenify questions
- `get_objective_result` - Get the current objective
- `skip_phase2` - Skip Aspenify refinement
- `list_objective_templates` - List available templates
- `save_objective` - Persist objective to database (with optional reasoning refinement data)
- `load_objective` - Load objective by ID
- `list_objectives` - List objectives with filtering
- `refine_with_reasoning` - Prepare objective for enclave-reasoning-mcp refinement
- `update_refined_objective` - Update objective with refinement results

**enclave-playbook-mcp (10 tools):**
- `analyze_objective` - Analyze objective with Aspenify
- `refine_context` - Update context with question answers
- `generate_playbook_async` - Start async playbook generation
- `get_task_status` - Check generation status
- `generate_full_playbook` - One-shot full generation
- `list_methodologies` - List available methodologies
- `save_playbook` - Persist playbook to database (links to objective)
- `load_playbook` - Load playbook by ID
- `load_playbook_by_objective` - Load most recent playbook for an objective
- `list_playbooks` - List playbooks with filtering

**enclave-question-answerer-mcp (2 tools):**
- `answer_questions` - Batch answer multiple questions with AI (context-aware)
- `answer_single_question` - Answer a single question (more efficient for one-off)

**enclave-makebook-mcp (8 tools):**
- `generate_makebook` - Transform Playbook → Makebook with task breakdown
- `enrich_task` - Add 100+ word specification to a task
- `validate_dependencies` - Analyze dependency graph (circular, missing, bottlenecks)
- `save_makebook` - Persist makebook to database (links to objective/playbook)
- `load_makebook` - Load makebook by ID
- `load_makebook_by_objective` - Load most recent makebook for an objective
- `load_makebook_by_playbook` - Load most recent makebook for a playbook
- `list_makebooks` - List makebooks with filtering

# Objective Analysis MCP - Specification

## Overview

The Objective Analysis MCP is a meta-cognitive service that transforms user requirements into structured objectives suitable for downstream planning (Playbook generation). It operates in **two phases** to accommodate different user preferences and ensure compatibility with external services.

## Core Philosophy

**Input**: Raw user requirements (text, conversation, brief description)
**Output**: Unified `ObjectiveSpec` ready for Playbook MCP consumption

The MCP acts as a **standardizer** - regardless of how the objective is captured, the output format is consistent.

---

## Two-Phase Architecture

The objective analysis process has two distinct phases:

### Phase 1: Initial Objective Capture
Choose ONE of:
- **Conversational Mode**: Aurora-led Dialog ↔ Think refinement
- **Structured Mode**: Template-driven questionnaire

### Phase 2: Playbook Preparation (Optional)
- **External API Mode**: Aspenify DSPy questions for Playbook generation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Objective Analysis MCP                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ═══════════════════════ PHASE 1: CAPTURE ═══════════════════════  │
│                                                                     │
│  ┌─────────────────────┐         ┌─────────────────────┐           │
│  │   Conversational    │   OR    │     Structured      │           │
│  │       Mode          │         │       Mode          │           │
│  │                     │         │                     │           │
│  │  Aurora-led         │         │  Template-driven    │           │
│  │  Dialog ↔ Think     │         │  Questionnaire      │           │
│  │  (Reasoning MCP)    │         │                     │           │
│  └──────────┬──────────┘         └──────────┬──────────┘           │
│             │                               │                       │
│             └───────────────┬───────────────┘                       │
│                             ▼                                       │
│                  ┌─────────────────────┐                            │
│                  │  Initial Objective  │                            │
│                  │  (Draft ObjectiveSpec)                           │
│                  └──────────┬──────────┘                            │
│                             │                                       │
│  ═══════════════════ PHASE 2: REFINEMENT ════════════════════════  │
│                             │                                       │
│                             ▼                                       │
│                  ┌─────────────────────┐                            │
│                  │   External API      │                            │
│                  │   (Aspenify DSPy)   │                            │
│                  │                     │                            │
│                  │  /analyze endpoint  │                            │
│                  │  Formatted questions│                            │
│                  │  /context update    │                            │
│                  └──────────┬──────────┘                            │
│                             │                                       │
│                             ▼                                       │
│                  ┌─────────────────────┐                            │
│                  │   Final Objective   │                            │
│                  │   (ObjectiveSpec)   │                            │
│                  └─────────────────────┘                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │    Playbook MCP     │
                      │   (Downstream)      │
                      └─────────────────────┘
```

### Flow Options

**Option A: Full Flow (Recommended)**
```
Conversational/Structured → Draft Objective → Aspenify Questions → Final ObjectiveSpec → Playbook
```

**Option B: Skip Phase 2**
```
Conversational/Structured → Final ObjectiveSpec → Playbook
```
(Use when external API refinement not needed)

**Option C: Direct to Aspenify**
```
Raw text → Aspenify Questions → Final ObjectiveSpec → Playbook
```
(Use when user prefers to answer Aspenify questions directly)

---

## ObjectiveSpec - Unified Output Format

```typescript
interface ObjectiveSpec {
  // Identity
  id: string;                    // UUID for this objective
  version: string;               // Schema version (e.g., "1.0.0")

  // Core Content
  title: string;                 // Concise title (max 100 chars)
  summary: string;               // Executive summary (2-3 sentences)
  intent: string;                // What the user wants to achieve
  context: string;               // Background and situational context

  // Structured Requirements
  requirements: Requirement[];   // Functional requirements
  constraints: Constraint[];     // Technical, business, or resource constraints
  successCriteria: Criterion[];  // Measurable success indicators

  // Optional Fields
  type?: string;                 // Project type (web_app, mobile_app, api, etc.)
  domain?: string;               // Industry domain (healthcare, fintech, etc.)
  timeframe?: string;            // Target timeline
  budget?: string;               // Budget constraints
  stakeholders?: string[];       // Key stakeholders

  // Metadata
  sourceMode: 'conversational' | 'structured' | 'external_api';
  qualityScore: number;          // 0.0 - 1.0 confidence score
  completenessScore: number;     // 0.0 - 1.0 how complete the spec is
  refinementRounds: number;      // How many iterations of refinement
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp

  // Audit Trail
  sourceConversation?: string;   // Original conversation (if conversational)
  questionsAnswered?: QuestionAnswer[];  // Q&A pairs (if structured/external)
}

interface Requirement {
  id: string;
  description: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have';
  category?: string;
}

interface Constraint {
  id: string;
  description: string;
  type: 'technical' | 'business' | 'resource' | 'regulatory' | 'timeline';
}

interface Criterion {
  id: string;
  description: string;
  measurable: boolean;
  metric?: string;
}

interface QuestionAnswer {
  question: string;
  description?: string;
  answer: string;
  source: 'user' | 'ai';
}
```

---

## MCP Tools

### Phase 1 Tools (Initial Capture)

#### 1. `start_objective_session`

Start a new objective analysis session (Phase 1).

**Input:**
```typescript
{
  mode: 'conversational' | 'structured';

  // For conversational mode
  initialContext?: string;       // Seed conversation (optional)

  // For structured mode
  template?: string;             // Template name (default: 'comprehensive')
  briefObjective?: string;       // One-liner to expand (optional)
}
```

**Output:**
```typescript
{
  sessionId: string;
  mode: string;
  phase: 1;
  status: 'started' | 'awaiting_input';

  // For structured mode - questions to answer
  questions?: Question[];

  // For conversational mode - first prompt
  nextPrompt?: string;
}
```

---

#### 2. `run_conversation_exchange`

Run a Dialog ↔ Think exchange (for conversational mode).

**Input:**
```typescript
{
  sessionId: string;
  userMessage?: string;  // User's response (optional for first call)
}
```

**Output:**
```typescript
{
  sessionId: string;
  iteration: number;

  // Aurora's analysis/questions
  auroraResponse: string;

  // Quality assessment
  qualityScore: number;

  // Should we continue?
  shouldContinue: boolean;
  suggestedQuestions?: string[];

  // If Phase 1 complete - draft objective ready
  draftObjective?: ObjectiveSpec;
  readyForPhase2: boolean;
}
```

---

#### 3. `answer_structured_questions`

Submit answers to structured questions (for structured mode).

**Input:**
```typescript
{
  sessionId: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
}
```

**Output:**
```typescript
{
  sessionId: string;
  status: 'processing' | 'phase1_complete' | 'needs_more';

  // If needs_more - follow-up questions
  additionalQuestions?: Question[];

  // If phase1_complete - draft objective
  draftObjective?: ObjectiveSpec;
  readyForPhase2: boolean;

  // Progress indicator
  completenessScore: number;
}
```

---

### Phase 2 Tools (Playbook Preparation)

#### 4. `start_playbook_refinement`

Start Phase 2: Send objective to Aspenify API for Playbook-specific questions.

**Input:**
```typescript
{
  sessionId: string;           // Session from Phase 1
  // OR
  objectiveText?: string;      // Raw objective text (for Option C - direct to Aspenify)
}
```

**Output:**
```typescript
{
  sessionId: string;
  phase: 2;
  status: 'awaiting_answers';

  // Aspenify analysis results
  intent: string;
  context: string;
  type: string;

  // Formatted questions from Aspenify /analyze
  questions: AspenifyQuestion[];
}

interface AspenifyQuestion {
  id: string;                  // Generated UUID
  question: string;            // From Aspenify
  description: string;         // Context about the question
  placeholder: string;         // Example answer
  questionType: string;        // Type classification
  mandatory: boolean;          // Required flag
  source: 'aspenify';          // Track origin
}
```

---

#### 5. `answer_playbook_questions`

Submit answers to Aspenify's Playbook preparation questions.

**Input:**
```typescript
{
  sessionId: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
}
```

**Output:**
```typescript
{
  sessionId: string;
  status: 'complete';
  phase: 2;

  // Updated context from Aspenify /context endpoint
  updatedContext: string;

  // Final ObjectiveSpec ready for Playbook generation
  objectiveSpec: ObjectiveSpec;

  // Quality metrics
  qualityMetrics: {
    completeness: number;
    clarity: number;
    measurability: number;
    overall: number;
  };
}
```

---

### Utility Tools

#### 6. `get_objective_result`

Get the current ObjectiveSpec from a session (works in either phase).

**Input:**
```typescript
{
  sessionId: string;
  format?: 'json' | 'markdown';  // Output format
}
```

**Output:**
```typescript
{
  sessionId: string;
  phase: 1 | 2;
  status: 'in_progress' | 'phase1_complete' | 'complete';

  // Current objective (draft or final)
  objectiveSpec: ObjectiveSpec;
  formattedOutput?: string;  // If markdown requested

  // What's next
  nextStep: 'continue_phase1' | 'start_phase2' | 'ready_for_playbook';
  readyForPlaybook: boolean;
}
```

---

#### 7. `skip_phase2`

Mark Phase 1 objective as final, skipping Aspenify refinement.

**Input:**
```typescript
{
  sessionId: string;
}
```

**Output:**
```typescript
{
  sessionId: string;
  status: 'complete';
  objectiveSpec: ObjectiveSpec;  // Phase 1 objective promoted to final
  message: 'Objective finalized without Playbook refinement';
}
```

---

#### 8. `list_objective_templates`

List available structured templates for Phase 1.

**Output:**
```typescript
{
  templates: {
    name: string;
    description: string;
    questionCount: number;
    estimatedTime: string;
    recommendedFor: string[];
  }[];
}
```

---

## Mode Details

### Phase 1: Conversational Mode

Uses the **Reasoning MCP** internally with the `objective_refinement` preset:

1. User provides initial context (or starts fresh)
2. Aurora (Consultant role) guides conversation, asking clarifying questions
3. Aurora (Analyst role) synthesizes into structured requirements
4. Dialog ↔ Think loop until quality threshold met (0.85)
5. Final synthesis produces **Draft ObjectiveSpec**

**Strengths:**
- Natural, exploratory
- Good for vague or complex requirements
- Aurora can probe for missing information

**Best for:**
- Users who prefer conversation
- Complex, ill-defined projects
- Discovery phase work

---

### Phase 1: Structured Mode

Template-driven questionnaire with predefined questions:

**Templates Available:**

1. **`comprehensive`** (default) - 15-20 questions covering all aspects
2. **`quick`** - 5-7 essential questions for well-defined projects
3. **`technical`** - Focus on technical requirements and constraints
4. **`business`** - Focus on business goals and success metrics
5. **`mvp`** - Minimal viable product scoping

**Process:**
1. Present questions from template
2. Collect answers (user or AI-assisted)
3. Optional: Generate follow-up questions based on answers
4. Synthesize into **Draft ObjectiveSpec**

**Strengths:**
- Predictable, structured
- Faster for users who know what they want
- Easy to automate/integrate

**Best for:**
- Experienced users
- Well-defined projects
- Integration with other tools

---

### Phase 2: External API Mode (Playbook Preparation)

Integration with **Aspenify DSPy API** (`pb-generator.aspenify.com`):

**Purpose:** Take the Draft ObjectiveSpec from Phase 1 and refine it with Playbook-specific questions from Aspenify. This ensures the objective is optimized for Playbook generation.

**Process:**
1. Take Draft ObjectiveSpec (or raw text for Option C)
2. Send to Aspenify `/analyze` endpoint
3. Receive formatted questions with:
   - `question`: The question text
   - `description`: Context about the question
   - `placeholder`: Example answer
   - `question_type`: Type classification
   - `mandatory`: Required flag
4. Present questions to user
5. Collect answers
6. Send to Aspenify `/context` endpoint to update context
7. Merge Aspenify's enriched context with Draft ObjectiveSpec
8. Produce **Final ObjectiveSpec**

**Question Mapping:**

Aspenify questions are presented as-is to maintain compatibility:

```typescript
interface AspenifyQuestion {
  id: string;              // Generated UUID
  question: string;        // From Aspenify
  description: string;     // From Aspenify
  placeholder: string;     // From Aspenify
  questionType: string;    // From Aspenify
  mandatory: boolean;      // From Aspenify
  source: 'aspenify';      // Track origin
}
```

**Transformation to Final ObjectiveSpec:**

After answers are collected and sent to Aspenify `/context`:

```typescript
// Aspenify returns:
{
  intent: string;           // Enriched intent
  updated_context: string;  // Detailed context with answers incorporated
  type: string;             // Project type classification
}

// Merge with Draft ObjectiveSpec:
const finalSpec: ObjectiveSpec = {
  ...draftObjectiveSpec,                    // Keep Phase 1 structure
  intent: aspenifyResult.intent,            // Override with enriched intent
  context: aspenifyResult.updated_context,  // Override with enriched context
  type: aspenifyResult.type,                // Add type classification
  sourceMode: 'external_api',               // Mark as Phase 2 completed
  questionsAnswered: [
    ...draftObjectiveSpec.questionsAnswered || [],
    ...aspenifyAnswers  // Add Phase 2 Q&A
  ]
};
```

**Strengths:**
- Leverages proven Aspenify question design
- Optimized specifically for Playbook generation
- Consistent with existing Enclave V1 workflow
- Questions are contextual to the objective type

**Best for:**
- When Playbook generation follows immediately
- Users familiar with Aspenify questions
- Ensuring comprehensive coverage before planning

---

### Choosing Between Flows

| Scenario | Recommended Flow |
|----------|------------------|
| New user with vague idea | Phase 1 (Conversational) → Phase 2 |
| Experienced user with clear requirements | Phase 1 (Structured/Quick) → Phase 2 |
| Migrating from Enclave V1 | Phase 1 (Structured) → Phase 2 |
| Just exploring, no Playbook needed | Phase 1 only → Skip Phase 2 |
| Urgent, minimal refinement | Phase 1 (Quick template) → Skip Phase 2 |
| Known objective, just need Playbook questions | Option C: Direct to Phase 2 |

---

## Configuration

### Environment Variables

```bash
# Provider configuration
LLM_PROVIDER=ollama          # ollama | anthropic | openai
LLM_MODEL=gemma3:12b         # Default model
OLLAMA_BASE_URL=http://localhost:11434

# External API
ASPENIFY_API_URL=https://pb-generator.aspenify.com

# Quality thresholds
OBJECTIVE_QUALITY_THRESHOLD=0.85
OBJECTIVE_MAX_ITERATIONS=5
```

### Runtime Options

```typescript
interface ObjectiveAnalysisConfig {
  // Model overrides
  model?: string;
  temperature?: number;
  maxTokens?: number;

  // Quality control
  qualityThreshold?: number;   // Default: 0.85
  maxIterations?: number;      // Default: 5

  // External API options
  aspenifyApiUrl?: string;
  aspenifyTimeout?: number;    // Default: 30000ms
}
```

---

## Integration with Playbook MCP

The ObjectiveSpec is designed to be directly consumable by Playbook generation:

```typescript
// Playbook MCP tool
async function generatePlaybook(input: {
  objectiveSpec: ObjectiveSpec;
  options?: PlaybookOptions;
}): Promise<Playbook> {
  // Use objectiveSpec.intent, context, requirements, etc.
  // to generate structured playbook
}
```

**Key mappings:**
- `ObjectiveSpec.intent` → Playbook intent
- `ObjectiveSpec.context` → Playbook context
- `ObjectiveSpec.requirements` → Playbook chapter seeds
- `ObjectiveSpec.successCriteria` → Playbook success metrics

---

## Implementation Notes

### Session Storage

Sessions are stored in-memory with optional persistence:

```typescript
interface ObjectiveSession {
  id: string;
  mode: 'conversational' | 'structured' | 'external_api';
  status: 'started' | 'in_progress' | 'complete' | 'failed';

  // Mode-specific state
  reasoningSessionId?: string;  // If conversational
  templateName?: string;        // If structured
  externalTaskId?: string;      // If external_api

  // Collected data
  questions: Question[];
  answers: QuestionAnswer[];
  exchanges: Exchange[];

  // Result
  objectiveSpec?: ObjectiveSpec;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Error Handling

```typescript
type ObjectiveError =
  | { code: 'SESSION_NOT_FOUND'; sessionId: string }
  | { code: 'EXTERNAL_API_ERROR'; message: string }
  | { code: 'QUALITY_THRESHOLD_NOT_MET'; currentScore: number }
  | { code: 'MAX_ITERATIONS_REACHED'; iterations: number }
  | { code: 'INVALID_ANSWERS'; missingQuestions: string[] };
```

---

## Testing Strategy

### Unit Tests
- ObjectiveSpec validation
- Question answer parsing
- Quality score calculation

### Integration Tests
- Conversational mode with Reasoning MCP
- External API mode with mock Aspenify
- Full flow: Objective → Playbook

### E2E Tests
- User completes conversational flow
- User completes structured questionnaire
- External API integration with real Aspenify

---

## Future Enhancements

1. **AI-Assisted Answers**: Use local LLM to suggest answers based on context
2. **Template Learning**: Track which questions lead to better objectives
3. **Multi-Language**: Support for non-English objectives
4. **Voice Input**: Integration with speech-to-text for conversational mode
5. **Collaborative Mode**: Multiple stakeholders contribute to same objective

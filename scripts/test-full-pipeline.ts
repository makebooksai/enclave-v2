#!/usr/bin/env npx tsx
/**
 * Full Pipeline Test with Artifact Output
 *
 * Tests the complete Objective → Playbook → Makebook pipeline
 * and saves all artifacts to outputs/ folder for review.
 *
 * Usage:
 *   LLM_PROVIDER=ollama LLM_MODEL=nemotron-mini:4b npx tsx scripts/test-full-pipeline.ts
 *
 * Output:
 *   outputs/
 *     ├── 01-objective.json          # The structured objective
 *     ├── 02-objective-refined.json  # After reasoning refinement
 *     ├── 03-playbook.json           # Generated playbook
 *     ├── 04-makebook.json           # Generated makebook with tasks
 *     ├── 05-makebook-enriched.json  # Makebook with enriched tasks
 *     ├── 06-dependency-analysis.json # Dependency graph analysis
 *     └── summary.md                  # Human-readable summary
 *
 * Authors: Steve & Aurora
 * December 2025
 */

import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  provider: process.env.LLM_PROVIDER || 'ollama',
  model: process.env.LLM_MODEL || 'nemotron-mini:4b',
  baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434',
  outputDir: path.join(process.cwd(), 'outputs'),
  timeout: 180000, // 3 minutes
};

// ─────────────────────────────────────────────────────────────────────────────
// Test Objective - A Real-World Project
// ─────────────────────────────────────────────────────────────────────────────

const TEST_OBJECTIVE_TEXT = `Build a modern task management web application that allows teams to collaborate on projects.

The app should support:
- User authentication with OAuth (Google, GitHub)
- Real-time updates when team members make changes
- Kanban board view with drag-and-drop
- Due dates, priorities, and labels
- File attachments and comments on tasks
- Mobile-responsive design

Target users are small development teams (5-20 people).
Timeline: MVP in 4 weeks.
Stack preference: React frontend, Node.js backend, PostgreSQL database.`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Objective {
  id: string;
  title: string;
  summary: string;
  intent: string;
  context: string;
  requirements: Array<{ id: string; description: string; priority: string }>;
  constraints: Array<{ id: string; description: string; type: string }>;
  success_criteria: Array<{ id: string; description: string; measurable: boolean }>;
  project_type: string;
  domain: string;
  timeframe: string;
  source_mode: string;
  created_at: string;
}

interface PlaybookPhase {
  name: string;
  description: string;
  steps: string[];
}

interface Playbook {
  id: string;
  title: string;
  summary: string;
  methodology: string;
  phases: PlaybookPhase[];
  considerations: string[];
  success_criteria: string[];
  roles: Array<{ name: string; responsibilities: string[] }>;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  phase: string;
  role: string;
  classification: string;
  dependencies: string[];
  deliverables: string[];
  acceptance_criteria: string[];
  estimated_complexity: string;
  technical_notes?: string;
  edge_cases?: string[];
  implementation_hints?: string[];
}

interface Makebook {
  id: string;
  title: string;
  objective: string;
  source_playbook_id: string;
  tasks: Task[];
  metadata: {
    total_tasks: number;
    auto_tasks: number;
    hybrid_tasks: number;
    manual_tasks: number;
    phases: string[];
    roles: string[];
    model_used: string;
    generation_time_ms: number;
  };
  created_at: string;
}

interface DependencyAnalysis {
  valid: boolean;
  issues: Array<{
    type: string;
    severity: string;
    tasks: string[];
    message: string;
    suggestion: string;
  }>;
  critical_path: string[];
  parallelization: {
    max_parallel: number;
    execution_layers: string[][];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string): void {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] [${phase}] ${message}`);
}

function section(title: string): void {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70) + '\n');
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function saveArtifact(filename: string, data: unknown): Promise<void> {
  const filepath = path.join(CONFIG.outputDir, filename);
  await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  log('SAVE', `Saved: ${filename}`);
}

async function callLLM(prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

  try {
    const response = await fetch(`${CONFIG.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.model,
        messages,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 8000,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LLM error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { message: { content: string } };
    return data.message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function parseJSON<T>(content: string): T | null {
  try {
    let jsonStr = content.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Find JSON object boundaries
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }

    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Steps
// ─────────────────────────────────────────────────────────────────────────────

async function step1_CreateObjective(): Promise<Objective> {
  section('Step 1: Create Structured Objective');

  log('OBJECTIVE', 'Parsing objective from natural language...');

  const systemPrompt = `You are an expert at analyzing project requirements. Output valid JSON only. No markdown.`;

  const userPrompt = `Create a JSON objective from this description:

"${TEST_OBJECTIVE_TEXT.replace(/\n/g, ' ')}"

Output exactly this JSON format:
{"title":"Project title","summary":"Summary","intent":"Goal","context":"Background","requirements":[{"id":"REQ-001","description":"Requirement","priority":"must_have"}],"constraints":[{"id":"CON-001","description":"Constraint","type":"technical"}],"success_criteria":[{"id":"SC-001","description":"Criterion","measurable":true}],"project_type":"web_app","domain":"Productivity","timeframe":"4 weeks"}`;

  const startTime = Date.now();
  const response = await callLLM(userPrompt, systemPrompt);
  const duration = Date.now() - startTime;

  log('OBJECTIVE', `LLM response time: ${duration}ms`);

  let parsed = parseJSON<Partial<Objective>>(response);

  if (!parsed) {
    log('OBJECTIVE', 'Warning: Parse failed, using structured fallback...');
    log('OBJECTIVE', `Response preview: ${response.substring(0, 200)}...`);

    // Create a reasonable fallback from the test objective
    parsed = {
      title: 'Task Management Application',
      summary: 'A modern task management web application for team collaboration',
      intent: 'Build a collaborative task management tool for small development teams',
      context: 'Target users are small development teams (5-20 people) who need to manage projects with Kanban boards, real-time updates, and OAuth authentication.',
      requirements: [
        { id: 'REQ-001', description: 'OAuth authentication with Google and GitHub', priority: 'must_have' },
        { id: 'REQ-002', description: 'Real-time updates when team members make changes', priority: 'must_have' },
        { id: 'REQ-003', description: 'Kanban board view with drag-and-drop', priority: 'must_have' },
        { id: 'REQ-004', description: 'Due dates, priorities, and labels', priority: 'must_have' },
        { id: 'REQ-005', description: 'File attachments and comments on tasks', priority: 'should_have' },
        { id: 'REQ-006', description: 'Mobile-responsive design', priority: 'must_have' },
      ],
      constraints: [
        { id: 'CON-001', description: 'MVP timeline of 4 weeks', type: 'timeline' },
        { id: 'CON-002', description: 'React frontend, Node.js backend, PostgreSQL database', type: 'technical' },
        { id: 'CON-003', description: 'Support teams of 5-20 people', type: 'business' },
      ],
      success_criteria: [
        { id: 'SC-001', description: 'Users can authenticate via Google or GitHub OAuth', measurable: true },
        { id: 'SC-002', description: 'Tasks sync in real-time across all connected clients', measurable: true },
        { id: 'SC-003', description: 'Kanban board supports drag-and-drop task movement', measurable: true },
        { id: 'SC-004', description: 'Application is responsive on mobile devices', measurable: true },
      ],
      project_type: 'web_app',
      domain: 'Productivity',
      timeframe: '4 weeks MVP',
    };
    log('OBJECTIVE', 'Using structured fallback objective');
  }

  const objective: Objective = {
    id: generateUUID(),
    title: parsed.title || 'Task Management Application',
    summary: parsed.summary || '',
    intent: parsed.intent || TEST_OBJECTIVE_TEXT.split('\n')[0],
    context: parsed.context || '',
    requirements: parsed.requirements || [],
    constraints: parsed.constraints || [],
    success_criteria: parsed.success_criteria || [],
    project_type: parsed.project_type || 'web_app',
    domain: parsed.domain || 'Productivity',
    timeframe: parsed.timeframe || '4 weeks MVP',
    source_mode: 'conversational',
    created_at: new Date().toISOString(),
  };

  log('OBJECTIVE', `Created: ${objective.title}`);
  log('OBJECTIVE', `Requirements: ${objective.requirements.length}`);
  log('OBJECTIVE', `Constraints: ${objective.constraints.length}`);
  log('OBJECTIVE', `Success Criteria: ${objective.success_criteria.length}`);

  await saveArtifact('01-objective.json', objective);

  return objective;
}

async function step2_RefineObjective(objective: Objective): Promise<Objective> {
  section('Step 2: Refine Objective (Consultant ↔ Analyst)');

  log('REFINE', 'Running reasoning refinement dialogue...');

  // Simulate a Consultant → Analyst → Consultant exchange
  const consultantPrompt = `You are a business consultant reviewing a project objective.

Analyze this objective and provide improvements:
- Are the requirements clear and complete?
- Are there missing constraints?
- Are success criteria measurable?

Objective:
${JSON.stringify(objective, null, 2)}

Provide specific, actionable recommendations in JSON:
{
  "analysis": "Your analysis",
  "missing_requirements": ["req 1", "req 2"],
  "refined_success_criteria": ["refined criterion 1"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

  const startTime = Date.now();
  const consultantResponse = await callLLM(consultantPrompt, 'You are a senior business consultant. Output JSON only.');
  const consultantDuration = Date.now() - startTime;

  log('REFINE', `Consultant analysis: ${consultantDuration}ms`);

  const refinements = parseJSON<{
    missing_requirements?: string[];
    refined_success_criteria?: string[];
    recommendations?: string[];
  }>(consultantResponse);

  // Apply refinements
  const refined = { ...objective };

  if (refinements?.missing_requirements) {
    refinements.missing_requirements.forEach((req, i) => {
      refined.requirements.push({
        id: `REQ-${String(refined.requirements.length + 1).padStart(3, '0')}`,
        description: req,
        priority: 'should_have',
      });
    });
    log('REFINE', `Added ${refinements.missing_requirements.length} requirements`);
  }

  if (refinements?.refined_success_criteria) {
    refinements.refined_success_criteria.forEach((sc) => {
      refined.success_criteria.push({
        id: `SC-${String(refined.success_criteria.length + 1).padStart(3, '0')}`,
        description: sc,
        measurable: true,
      });
    });
    log('REFINE', `Added ${refinements.refined_success_criteria.length} success criteria`);
  }

  await saveArtifact('02-objective-refined.json', {
    objective: refined,
    refinement_notes: refinements,
  });

  return refined;
}

async function step3_GeneratePlaybook(objective: Objective): Promise<Playbook> {
  section('Step 3: Generate Strategic Playbook');

  log('PLAYBOOK', 'Generating playbook from objective...');

  const systemPrompt = `You are an expert project strategist creating detailed playbooks.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.
Start your response with { and end with }`;

  const userPrompt = `Create a strategic playbook for this project:

Title: ${objective.title}
Intent: ${objective.intent}
Context: ${objective.context}
Timeline: ${objective.timeframe}

Requirements:
${objective.requirements.map((r) => `- ${r.description} (${r.priority})`).join('\n')}

Success Criteria:
${objective.success_criteria.map((s) => `- ${s.description}`).join('\n')}

Generate a playbook with this structure:
{
  "title": "Playbook title",
  "summary": "2-3 sentence summary of the approach",
  "methodology": "Agile|Waterfall|Kanban|Hybrid",
  "phases": [
    {
      "name": "Phase N: Phase Name",
      "description": "What this phase accomplishes",
      "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
    }
  ],
  "considerations": ["Key consideration 1", "Key consideration 2"],
  "success_criteria": ["How we measure success"],
  "roles": [
    { "name": "Role Name", "responsibilities": ["Responsibility 1", "Responsibility 2"] }
  ]
}

Create 4-5 phases with 4-6 steps each.
Include 4-6 roles with 3-4 responsibilities each.
Pure JSON output only.`;

  const startTime = Date.now();
  const response = await callLLM(userPrompt, systemPrompt);
  const duration = Date.now() - startTime;

  log('PLAYBOOK', `LLM response time: ${duration}ms`);

  let parsed = parseJSON<Partial<Playbook>>(response);

  if (!parsed || !parsed.phases || parsed.phases.length === 0) {
    log('PLAYBOOK', 'Warning: Parse failed, using structured fallback...');

    parsed = {
      title: `${objective.title} - Playbook`,
      summary: 'Strategic playbook for building a task management application with OAuth, real-time updates, and Kanban boards.',
      methodology: 'Agile',
      phases: [
        {
          name: 'Phase 1: Foundation',
          description: 'Set up project infrastructure and authentication',
          steps: [
            'Initialize React and Node.js project',
            'Set up PostgreSQL database',
            'Implement OAuth authentication',
            'Create user management',
            'Set up CI/CD pipeline',
          ],
        },
        {
          name: 'Phase 2: Core Features',
          description: 'Build main task management functionality',
          steps: [
            'Design task data model',
            'Create CRUD API for tasks',
            'Build Kanban board UI',
            'Implement drag-and-drop',
            'Add real-time updates with WebSockets',
          ],
        },
        {
          name: 'Phase 3: Collaboration',
          description: 'Add team collaboration features',
          steps: [
            'Implement file attachments',
            'Build comment system',
            'Add notifications',
            'Create activity feed',
          ],
        },
        {
          name: 'Phase 4: Polish & Launch',
          description: 'Finalize and deploy',
          steps: [
            'Mobile-responsive design',
            'Performance optimization',
            'Security audit',
            'Production deployment',
          ],
        },
      ],
      considerations: ['GDPR compliance', 'Horizontal scaling', 'Offline support'],
      success_criteria: ['OAuth works', 'Real-time sync', 'Mobile responsive'],
      roles: [
        { name: 'Full Stack Developer', responsibilities: ['Frontend', 'Backend', 'Database'] },
        { name: 'DevOps Engineer', responsibilities: ['CI/CD', 'Deployment', 'Monitoring'] },
        { name: 'QA Engineer', responsibilities: ['Testing', 'Quality assurance'] },
      ],
    };
    log('PLAYBOOK', 'Using structured fallback playbook');
  }

  const playbook: Playbook = {
    id: generateUUID(),
    title: parsed.title || `${objective.title} - Playbook`,
    summary: parsed.summary || '',
    methodology: parsed.methodology || 'Agile',
    phases: parsed.phases || [],
    considerations: parsed.considerations || [],
    success_criteria: parsed.success_criteria || [],
    roles: parsed.roles || [],
    created_at: new Date().toISOString(),
  };

  log('PLAYBOOK', `Created: ${playbook.title}`);
  log('PLAYBOOK', `Methodology: ${playbook.methodology}`);
  log('PLAYBOOK', `Phases: ${playbook.phases.length}`);
  log('PLAYBOOK', `Roles: ${playbook.roles.length}`);

  playbook.phases.forEach((phase) => {
    log('PLAYBOOK', `  - ${phase.name}: ${phase.steps.length} steps`);
  });

  await saveArtifact('03-playbook.json', playbook);

  return playbook;
}

async function step4_GenerateMakebook(objective: Objective, playbook: Playbook): Promise<Makebook> {
  section('Step 4: Generate Makebook with Tasks');

  log('MAKEBOOK', 'Transforming playbook into executable tasks...');

  const systemPrompt = `You are an expert project planner generating detailed Makebooks.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.
Start your response with { and end with }

Classification Guidelines:
- AUTO: Fully automatable by AI (code generation, boilerplate, simple CRUD, config files)
- HYBRID: Requires AI + human collaboration (complex design, integration, testing with judgment)
- MANUAL: Human-only tasks (stakeholder decisions, external coordination, approval, creative design)

Role Guidelines:
- architect: System design, API contracts, database schemas, technical decisions
- developer: Implementation, coding, debugging, unit tests
- designer: UI/UX design, user experience, visual design
- analyst: Requirements, research, data analysis, documentation
- devops: Infrastructure, deployment, CI/CD, monitoring
- qa: Testing, quality assurance, validation, test automation

Complexity Guidelines:
- trivial: < 1 hour, simple config or copy-paste
- simple: 1-4 hours, straightforward implementation
- moderate: 4-8 hours, requires some design thinking
- complex: 1-3 days, significant implementation effort
- epic: 3+ days, major feature or system component`;

  const userPrompt = `Transform this playbook into an executable Makebook:

## Objective
${objective.intent}

## Playbook
${JSON.stringify(playbook, null, 2)}

## Required Output
{
  "title": "Makebook title",
  "objective": "Brief objective statement",
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Clear, action-oriented task title",
      "description": "Detailed 50-100 word specification including: purpose, approach, key deliverables, and acceptance criteria",
      "phase": "Phase name from playbook",
      "role": "architect|developer|designer|analyst|devops|qa",
      "classification": "AUTO|HYBRID|MANUAL",
      "dependencies": ["TASK-XXX"],
      "deliverables": ["Specific output file or artifact"],
      "acceptance_criteria": ["Measurable completion criteria"],
      "estimated_complexity": "trivial|simple|moderate|complex|epic"
    }
  ],
  "metadata": {
    "total_tasks": 0,
    "auto_tasks": 0,
    "hybrid_tasks": 0,
    "manual_tasks": 0,
    "phases": ["phase list"],
    "roles": ["role list"]
  }
}

Generate 15-25 tasks covering ALL phases.
Ensure realistic dependency chains.
Balance AUTO/HYBRID/MANUAL classifications.
Pure JSON output only.`;

  const startTime = Date.now();
  const response = await callLLM(userPrompt, systemPrompt);
  const duration = Date.now() - startTime;

  log('MAKEBOOK', `LLM response time: ${duration}ms`);

  let parsed = parseJSON<Partial<Makebook>>(response);

  if (!parsed) {
    log('MAKEBOOK', 'Warning: Initial parse failed, attempting recovery...');
    log('MAKEBOOK', `Response preview: ${response.substring(0, 300)}...`);

    // Try to find tasks array directly
    const tasksMatch = response.match(/"tasks"\s*:\s*\[([\s\S]*?)\]/);
    if (tasksMatch) {
      try {
        const tasksStr = `[${tasksMatch[1]}]`;
        const tasks = JSON.parse(tasksStr);
        parsed = { tasks, title: 'Recovered Makebook' };
        log('MAKEBOOK', `Recovered ${tasks.length} tasks from response`);
      } catch {
        log('MAKEBOOK', 'Could not recover tasks array');
      }
    }
  }

  if (!parsed || !parsed.tasks || parsed.tasks.length === 0) {
    // Last resort: generate minimal makebook from playbook steps
    log('MAKEBOOK', 'Generating fallback makebook from playbook...');
    const fallbackTasks: Task[] = [];
    let taskNum = 1;

    playbook.phases.forEach((phase) => {
      phase.steps.forEach((step) => {
        fallbackTasks.push({
          id: `TASK-${String(taskNum++).padStart(3, '0')}`,
          title: step,
          description: `Implement: ${step}. Part of ${phase.name}.`,
          phase: phase.name,
          role: 'developer',
          classification: 'HYBRID',
          dependencies: [],
          deliverables: [],
          acceptance_criteria: [`${step} is complete`],
          estimated_complexity: 'moderate',
        });
      });
    });

    parsed = { tasks: fallbackTasks, title: `${objective.title} - Makebook` };
    log('MAKEBOOK', `Created fallback with ${fallbackTasks.length} tasks`);
  }

  // Normalize tasks
  const tasks: Task[] = (parsed.tasks || []).map((t, i) => ({
    id: t.id || `TASK-${String(i + 1).padStart(3, '0')}`,
    title: t.title || 'Untitled Task',
    description: t.description || '',
    phase: t.phase || 'General',
    role: t.role || 'developer',
    classification: t.classification || 'HYBRID',
    dependencies: t.dependencies || [],
    deliverables: t.deliverables || [],
    acceptance_criteria: t.acceptance_criteria || [],
    estimated_complexity: t.estimated_complexity || 'moderate',
  }));

  // Fix task IDs to be sequential
  const idMap = new Map<string, string>();
  tasks.forEach((task, i) => {
    const newId = `TASK-${String(i + 1).padStart(3, '0')}`;
    idMap.set(task.id, newId);
    task.id = newId;
  });

  // Update dependencies to use new IDs
  tasks.forEach((task) => {
    task.dependencies = task.dependencies
      .map((dep) => idMap.get(dep) || dep)
      .filter((dep) => tasks.some((t) => t.id === dep));
  });

  const makebook: Makebook = {
    id: generateUUID(),
    title: parsed.title || `${objective.title} - Makebook`,
    objective: parsed.objective || objective.intent,
    source_playbook_id: playbook.id,
    tasks,
    metadata: {
      total_tasks: tasks.length,
      auto_tasks: tasks.filter((t) => t.classification === 'AUTO').length,
      hybrid_tasks: tasks.filter((t) => t.classification === 'HYBRID').length,
      manual_tasks: tasks.filter((t) => t.classification === 'MANUAL').length,
      phases: [...new Set(tasks.map((t) => t.phase))],
      roles: [...new Set(tasks.map((t) => t.role))],
      model_used: `${CONFIG.provider}/${CONFIG.model}`,
      generation_time_ms: duration,
    },
    created_at: new Date().toISOString(),
  };

  log('MAKEBOOK', `Created: ${makebook.title}`);
  log('MAKEBOOK', `Total tasks: ${makebook.metadata.total_tasks}`);
  log('MAKEBOOK', `AUTO: ${makebook.metadata.auto_tasks}, HYBRID: ${makebook.metadata.hybrid_tasks}, MANUAL: ${makebook.metadata.manual_tasks}`);
  log('MAKEBOOK', `Phases: ${makebook.metadata.phases.join(', ')}`);
  log('MAKEBOOK', `Roles: ${makebook.metadata.roles.join(', ')}`);

  await saveArtifact('04-makebook.json', makebook);

  return makebook;
}

async function step5_EnrichTasks(makebook: Makebook): Promise<Makebook> {
  section('Step 5: Enrich Tasks with Details');

  log('ENRICH', `Enriching ${makebook.tasks.length} tasks...`);

  const systemPrompt = `You are an expert at writing detailed technical specifications.

CRITICAL: Output ONLY valid JSON array. No markdown, no explanation.
Start your response with [ and end with ]`;

  // Enrich in batches of 5
  const batchSize = 5;
  const enrichedTasks: Task[] = [];

  for (let i = 0; i < makebook.tasks.length; i += batchSize) {
    const batch = makebook.tasks.slice(i, i + batchSize);
    log('ENRICH', `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(makebook.tasks.length / batchSize)}...`);

    const userPrompt = `Enrich these tasks with detailed specifications:

${JSON.stringify(batch.map((t) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  role: t.role,
  classification: t.classification,
})), null, 2)}

For each task, output:
[
  {
    "id": "TASK-XXX",
    "description": "Expanded 80-120 word description with technical details, approach, and expected outcomes",
    "technical_notes": "Key technical considerations and gotchas",
    "edge_cases": ["Edge case 1", "Edge case 2"],
    "implementation_hints": ["Hint 1", "Hint 2"]
  }
]

Pure JSON array only.`;

    try {
      const response = await callLLM(userPrompt, systemPrompt);
      let enrichments: Array<{
        id: string;
        description?: string;
        technical_notes?: string;
        edge_cases?: string[];
        implementation_hints?: string[];
      }> = [];

      // Try to parse as array
      try {
        const jsonStr = response.trim();
        const arrayStart = jsonStr.indexOf('[');
        const arrayEnd = jsonStr.lastIndexOf(']');
        if (arrayStart !== -1 && arrayEnd !== -1) {
          enrichments = JSON.parse(jsonStr.substring(arrayStart, arrayEnd + 1));
        }
      } catch {
        log('ENRICH', `Warning: Could not parse batch ${Math.floor(i / batchSize) + 1}`);
      }

      // Apply enrichments
      batch.forEach((task) => {
        const enrichment = enrichments.find((e) => e.id === task.id);
        if (enrichment) {
          task.description = enrichment.description || task.description;
          task.technical_notes = enrichment.technical_notes;
          task.edge_cases = enrichment.edge_cases;
          task.implementation_hints = enrichment.implementation_hints;
        }
        enrichedTasks.push(task);
      });
    } catch (error) {
      log('ENRICH', `Warning: Batch ${Math.floor(i / batchSize) + 1} failed, using original tasks`);
      enrichedTasks.push(...batch);
    }
  }

  makebook.tasks = enrichedTasks;

  // Count enriched tasks
  const enrichedCount = makebook.tasks.filter((t) => t.technical_notes || t.edge_cases?.length).length;
  log('ENRICH', `Enriched ${enrichedCount}/${makebook.tasks.length} tasks`);

  await saveArtifact('05-makebook-enriched.json', makebook);

  return makebook;
}

async function step6_AnalyzeDependencies(makebook: Makebook): Promise<DependencyAnalysis> {
  section('Step 6: Analyze Dependencies');

  log('DEPS', 'Analyzing task dependency graph...');

  const tasks = makebook.tasks;
  const taskIds = new Set(tasks.map((t) => t.id));
  const issues: DependencyAnalysis['issues'] = [];

  // Check for missing dependencies
  tasks.forEach((task) => {
    task.dependencies.forEach((dep) => {
      if (!taskIds.has(dep)) {
        issues.push({
          type: 'missing',
          severity: 'error',
          tasks: [task.id],
          message: `Task ${task.id} depends on non-existent task ${dep}`,
          suggestion: `Remove dependency on ${dep} or add the missing task`,
        });
      }
    });
  });

  // Check for circular dependencies
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function findCycle(taskId: string, path: string[]): string[] | null {
    if (inStack.has(taskId)) {
      const cycleStart = path.indexOf(taskId);
      return path.slice(cycleStart);
    }
    if (visited.has(taskId)) return null;

    visited.add(taskId);
    inStack.add(taskId);

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      for (const dep of task.dependencies) {
        const cycle = findCycle(dep, [...path, taskId]);
        if (cycle) return cycle;
      }
    }

    inStack.delete(taskId);
    return null;
  }

  const foundCycles = new Set<string>();
  tasks.forEach((task) => {
    visited.clear();
    inStack.clear();
    const cycle = findCycle(task.id, []);
    if (cycle) {
      const cycleKey = cycle.sort().join(',');
      if (!foundCycles.has(cycleKey)) {
        foundCycles.add(cycleKey);
        issues.push({
          type: 'circular',
          severity: 'error',
          tasks: cycle,
          message: `Circular dependency: ${cycle.join(' → ')} → ${cycle[0]}`,
          suggestion: 'Break the cycle by removing one dependency',
        });
      }
    }
  });

  // Find bottlenecks
  const dependencyCount = new Map<string, number>();
  tasks.forEach((task) => {
    task.dependencies.forEach((dep) => {
      dependencyCount.set(dep, (dependencyCount.get(dep) || 0) + 1);
    });
  });

  const threshold = Math.max(3, Math.floor(tasks.length * 0.15));
  dependencyCount.forEach((count, taskId) => {
    if (count >= threshold) {
      issues.push({
        type: 'bottleneck',
        severity: 'info',
        tasks: [taskId],
        message: `Task ${taskId} is a bottleneck - ${count} tasks depend on it`,
        suggestion: 'Consider parallelizing or breaking down this task',
      });
    }
  });

  // Calculate execution layers (parallelization)
  const layers: string[][] = [];
  const assigned = new Set<string>();

  while (assigned.size < tasks.length) {
    const layer: string[] = [];
    tasks.forEach((task) => {
      if (assigned.has(task.id)) return;
      const depsAssigned = task.dependencies.every((d) => assigned.has(d));
      if (depsAssigned) layer.push(task.id);
    });

    if (layer.length === 0) {
      // Stuck - add remaining
      const remaining = tasks.filter((t) => !assigned.has(t.id)).map((t) => t.id);
      if (remaining.length > 0) {
        layers.push(remaining);
        remaining.forEach((id) => assigned.add(id));
      }
      break;
    }

    layers.push(layer);
    layer.forEach((id) => assigned.add(id));
  }

  // Calculate critical path (longest path)
  const dependents = new Map<string, string[]>();
  tasks.forEach((t) => dependents.set(t.id, []));
  tasks.forEach((task) => {
    task.dependencies.forEach((dep) => {
      if (dependents.has(dep)) {
        dependents.get(dep)!.push(task.id);
      }
    });
  });

  let longestPath: string[] = [];
  function findLongestPath(start: string, visited: Set<string>): string[] {
    if (visited.has(start)) return [];
    visited.add(start);

    const deps = dependents.get(start) || [];
    if (deps.length === 0) return [start];

    let maxPath: string[] = [];
    deps.forEach((dep) => {
      const path = findLongestPath(dep, new Set(visited));
      if (path.length > maxPath.length) maxPath = path;
    });

    return [start, ...maxPath];
  }

  const startTasks = tasks.filter((t) => t.dependencies.length === 0);
  startTasks.forEach((start) => {
    const path = findLongestPath(start.id, new Set());
    if (path.length > longestPath.length) longestPath = path;
  });

  const analysis: DependencyAnalysis = {
    valid: !issues.some((i) => i.severity === 'error'),
    issues,
    critical_path: longestPath,
    parallelization: {
      max_parallel: Math.max(...layers.map((l) => l.length), 0),
      execution_layers: layers,
    },
  };

  log('DEPS', `Valid: ${analysis.valid}`);
  log('DEPS', `Issues: ${issues.length} (${issues.filter((i) => i.severity === 'error').length} errors)`);
  log('DEPS', `Critical path length: ${longestPath.length} tasks`);
  log('DEPS', `Execution layers: ${layers.length}`);
  log('DEPS', `Max parallelization: ${analysis.parallelization.max_parallel}`);

  await saveArtifact('06-dependency-analysis.json', analysis);

  return analysis;
}

async function generateSummary(
  objective: Objective,
  playbook: Playbook,
  makebook: Makebook,
  analysis: DependencyAnalysis
): Promise<void> {
  section('Generating Summary');

  const summary = `# Pipeline Test Results

## Generated: ${new Date().toISOString()}

---

## 1. Objective

**Title:** ${objective.title}

**Intent:** ${objective.intent}

**Project Type:** ${objective.project_type}

**Timeframe:** ${objective.timeframe}

### Requirements (${objective.requirements.length})
${objective.requirements.map((r) => `- [${r.priority}] ${r.description}`).join('\n')}

### Constraints (${objective.constraints.length})
${objective.constraints.map((c) => `- [${c.type}] ${c.description}`).join('\n')}

### Success Criteria (${objective.success_criteria.length})
${objective.success_criteria.map((s) => `- ${s.description}`).join('\n')}

---

## 2. Playbook

**Title:** ${playbook.title}

**Methodology:** ${playbook.methodology}

### Phases (${playbook.phases.length})
${playbook.phases.map((p) => `
#### ${p.name}
${p.description}

Steps:
${p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`).join('\n')}

### Roles (${playbook.roles.length})
${playbook.roles.map((r) => `
#### ${r.name}
- ${r.responsibilities.join('\n- ')}
`).join('\n')}

---

## 3. Makebook

**Title:** ${makebook.title}

**Model:** ${makebook.metadata.model_used}

**Generation Time:** ${makebook.metadata.generation_time_ms}ms

### Task Summary
- **Total Tasks:** ${makebook.metadata.total_tasks}
- **AUTO:** ${makebook.metadata.auto_tasks} (${Math.round((makebook.metadata.auto_tasks / makebook.metadata.total_tasks) * 100)}%)
- **HYBRID:** ${makebook.metadata.hybrid_tasks} (${Math.round((makebook.metadata.hybrid_tasks / makebook.metadata.total_tasks) * 100)}%)
- **MANUAL:** ${makebook.metadata.manual_tasks} (${Math.round((makebook.metadata.manual_tasks / makebook.metadata.total_tasks) * 100)}%)

### Tasks by Phase
${makebook.metadata.phases.map((phase) => {
  const phaseTasks = makebook.tasks.filter((t) => t.phase === phase);
  return `
#### ${phase} (${phaseTasks.length} tasks)
${phaseTasks.map((t) => `- **${t.id}** [${t.classification}] ${t.title}`).join('\n')}
`;
}).join('\n')}

### All Tasks Detail
${makebook.tasks.map((t) => `
#### ${t.id}: ${t.title}
- **Role:** ${t.role}
- **Classification:** ${t.classification}
- **Complexity:** ${t.estimated_complexity}
- **Dependencies:** ${t.dependencies.length > 0 ? t.dependencies.join(', ') : 'None'}

${t.description}

${t.deliverables.length > 0 ? `**Deliverables:**\n${t.deliverables.map((d) => `- ${d}`).join('\n')}` : ''}

${t.acceptance_criteria.length > 0 ? `**Acceptance Criteria:**\n${t.acceptance_criteria.map((a) => `- ${a}`).join('\n')}` : ''}

${t.technical_notes ? `**Technical Notes:** ${t.technical_notes}` : ''}

${t.edge_cases?.length ? `**Edge Cases:**\n${t.edge_cases.map((e) => `- ${e}`).join('\n')}` : ''}
`).join('\n---\n')}

---

## 4. Dependency Analysis

**Valid Graph:** ${analysis.valid ? '✅ Yes' : '❌ No'}

### Issues (${analysis.issues.length})
${analysis.issues.length > 0 ? analysis.issues.map((i) => `- [${i.severity.toUpperCase()}] ${i.message}`).join('\n') : 'No issues found.'}

### Critical Path (${analysis.critical_path.length} tasks)
\`\`\`
${analysis.critical_path.join(' → ')}
\`\`\`

### Execution Layers (${analysis.parallelization.execution_layers.length} layers)
${analysis.parallelization.execution_layers.map((layer, i) => `
**Layer ${i + 1}:** ${layer.join(', ')} (${layer.length} parallel)
`).join('')}

**Maximum Parallelization:** ${analysis.parallelization.max_parallel} tasks

---

## Configuration

- **LLM Provider:** ${CONFIG.provider}
- **Model:** ${CONFIG.model}
- **Base URL:** ${CONFIG.baseUrl}

---

*Generated by Enclave 2.0 Pipeline Test*
*Steve & Aurora - December 2025*
`;

  await writeFile(path.join(CONFIG.outputDir, 'summary.md'), summary, 'utf-8');
  log('SUMMARY', 'Saved: summary.md');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║     ENCLAVE 2.0 - FULL PIPELINE TEST                                 ║');
  console.log('║     Objective → Playbook → Makebook                                  ║');
  console.log('║                                                                      ║');
  console.log('║     With Full Artifact Output                                        ║');
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('Configuration:');
  console.log(`  Provider: ${CONFIG.provider}`);
  console.log(`  Model: ${CONFIG.model}`);
  console.log(`  Base URL: ${CONFIG.baseUrl}`);
  console.log(`  Output: ${CONFIG.outputDir}`);
  console.log('');

  // Create output directory
  if (!existsSync(CONFIG.outputDir)) {
    await mkdir(CONFIG.outputDir, { recursive: true });
    log('SETUP', `Created output directory: ${CONFIG.outputDir}`);
  }

  const startTime = Date.now();

  try {
    // Step 1: Create Objective
    const objective = await step1_CreateObjective();

    // Step 2: Refine Objective
    const refinedObjective = await step2_RefineObjective(objective);

    // Step 3: Generate Playbook
    const playbook = await step3_GeneratePlaybook(refinedObjective);

    // Step 4: Generate Makebook
    const makebook = await step4_GenerateMakebook(refinedObjective, playbook);

    // Step 5: Enrich Tasks
    const enrichedMakebook = await step5_EnrichTasks(makebook);

    // Step 6: Analyze Dependencies
    const analysis = await step6_AnalyzeDependencies(enrichedMakebook);

    // Generate Summary
    await generateSummary(refinedObjective, playbook, enrichedMakebook, analysis);

    const totalTime = Date.now() - startTime;

    section('COMPLETE');

    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                      ║');
    console.log('║     🎉 PIPELINE COMPLETE!                                            ║');
    console.log('║                                                                      ║');
    console.log(`║     Total Time: ${(totalTime / 1000).toFixed(1)}s                                              `);
    console.log('║                                                                      ║');
    console.log('║     Output Files:                                                    ║');
    console.log('║       • 01-objective.json                                            ║');
    console.log('║       • 02-objective-refined.json                                    ║');
    console.log('║       • 03-playbook.json                                             ║');
    console.log('║       • 04-makebook.json                                             ║');
    console.log('║       • 05-makebook-enriched.json                                    ║');
    console.log('║       • 06-dependency-analysis.json                                  ║');
    console.log('║       • summary.md                                                   ║');
    console.log('║                                                                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Review artifacts in: ${CONFIG.outputDir}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Pipeline failed:', (error as Error).message);
    console.error(error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

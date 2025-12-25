/**
 * Objective Builder
 *
 * Utilities for constructing ObjectiveSpec from various inputs.
 */

import { randomUUID } from 'crypto';
import type {
  ObjectiveSpec,
  ObjectiveSession,
  Requirement,
  Constraint,
  Criterion,
  QuestionAnswer,
} from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// ObjectiveSpec Builder
// ─────────────────────────────────────────────────────────────────────────────

export function createEmptyObjectiveSpec(
  sourceMode: 'conversational' | 'structured' | 'external_api'
): ObjectiveSpec {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    version: '1.0.0',
    title: '',
    summary: '',
    intent: '',
    context: '',
    requirements: [],
    constraints: [],
    successCriteria: [],
    sourceMode,
    qualityScore: 0,
    completenessScore: 0,
    refinementRounds: 0,
    createdAt: now,
    updatedAt: now,
    questionsAnswered: [],
  };
}

export function buildObjectiveFromAnswers(
  session: ObjectiveSession
): ObjectiveSpec {
  const spec = createEmptyObjectiveSpec(
    session.mode === 'conversational' ? 'conversational' : 'structured'
  );

  // Extract answers by category
  const answerMap = new Map<string, string>();
  for (const qa of session.answers) {
    answerMap.set(qa.question.toLowerCase(), qa.answer);
  }

  // Find answers by keyword matching
  const findAnswer = (...keywords: string[]): string => {
    for (const [question, answer] of answerMap) {
      for (const kw of keywords) {
        if (question.includes(kw.toLowerCase())) {
          return answer;
        }
      }
    }
    return '';
  };

  // Build core fields
  spec.title = generateTitle(findAnswer('goal', 'build', 'what do you want'));
  spec.summary = generateSummary(
    findAnswer('goal', 'build'),
    findAnswer('problem', 'solve'),
    findAnswer('users', 'for', 'who')
  );
  spec.intent = findAnswer('goal', 'objective', 'outcome', 'build');
  spec.context = buildContext(session.answers);

  // Extract requirements
  const mustHave = findAnswer('must-have', 'required', 'core');
  const niceToHave = findAnswer('nice-to-have', 'additional');
  spec.requirements = parseRequirements(mustHave, niceToHave);

  // Extract constraints
  const timeline = findAnswer('timeline', 'deadline');
  const budget = findAnswer('budget');
  const technical = findAnswer('platform', 'technology', 'stack');
  const regulatory = findAnswer('regulatory', 'compliance');
  spec.constraints = parseConstraints(timeline, budget, technical, regulatory);

  // Extract success criteria
  const success = findAnswer('success', 'measure', 'kpi');
  spec.successCriteria = parseSuccessCriteria(success);

  // Set metadata
  spec.type = inferProjectType(spec.intent, spec.context);
  spec.timeframe = findAnswer('timeline', 'deadline');
  spec.budget = findAnswer('budget');

  // Calculate scores
  spec.qualityScore = calculateQualityScore(spec);
  spec.completenessScore = calculateCompletenessScore(spec);
  spec.questionsAnswered = session.answers;
  spec.refinementRounds = session.iteration;
  spec.updatedAt = new Date().toISOString();

  return spec;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseRequirements(
  mustHave: string,
  niceToHave: string
): Requirement[] {
  const requirements: Requirement[] = [];

  // Parse must-have requirements
  const mustHaveItems = parseListItems(mustHave);
  for (const item of mustHaveItems) {
    requirements.push({
      id: randomUUID(),
      description: item,
      priority: 'must_have',
    });
  }

  // Parse nice-to-have requirements
  const niceToHaveItems = parseListItems(niceToHave);
  for (const item of niceToHaveItems) {
    requirements.push({
      id: randomUUID(),
      description: item,
      priority: 'nice_to_have',
    });
  }

  return requirements;
}

function parseConstraints(
  timeline: string,
  budget: string,
  technical: string,
  regulatory: string
): Constraint[] {
  const constraints: Constraint[] = [];

  if (timeline) {
    constraints.push({
      id: randomUUID(),
      description: `Timeline: ${timeline}`,
      type: 'timeline',
    });
  }

  if (budget) {
    constraints.push({
      id: randomUUID(),
      description: `Budget: ${budget}`,
      type: 'resource',
    });
  }

  const technicalItems = parseListItems(technical);
  for (const item of technicalItems) {
    constraints.push({
      id: randomUUID(),
      description: item,
      type: 'technical',
    });
  }

  if (regulatory) {
    constraints.push({
      id: randomUUID(),
      description: `Compliance: ${regulatory}`,
      type: 'regulatory',
    });
  }

  return constraints;
}

function parseSuccessCriteria(success: string): Criterion[] {
  const criteria: Criterion[] = [];
  const items = parseListItems(success);

  for (const item of items) {
    const hasNumbers = /\d/.test(item);
    criteria.push({
      id: randomUUID(),
      description: item,
      measurable: hasNumbers,
      metric: hasNumbers ? extractMetric(item) : undefined,
    });
  }

  return criteria;
}

function parseListItems(text: string): string[] {
  if (!text) return [];

  // Split by common delimiters
  const items = text
    .split(/[,;\n]|(?:^|\s)-\s|(?:^|\s)\d+\.\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  return items;
}

function extractMetric(text: string): string | undefined {
  // Look for percentage patterns
  const percentMatch = text.match(/(\d+%)/);
  if (percentMatch) return percentMatch[1];

  // Look for number patterns
  const numberMatch = text.match(/(\d+[\d,]*)/);
  if (numberMatch) return numberMatch[1];

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generation Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateTitle(goal: string): string {
  if (!goal) return 'Untitled Project';

  // Extract first meaningful phrase
  const cleaned = goal
    .replace(/^(I want to|We want to|Build|Create|Develop)\s*/i, '')
    .trim();

  // Capitalize and limit length
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return title.length > 80 ? title.substring(0, 77) + '...' : title;
}

function generateSummary(goal: string, problem: string, users: string): string {
  const parts: string[] = [];

  if (goal) {
    parts.push(goal.charAt(0).toUpperCase() + goal.slice(1));
  }

  if (problem) {
    parts.push(`This addresses the challenge of ${problem.toLowerCase()}`);
  }

  if (users) {
    parts.push(`Target users are ${users.toLowerCase()}`);
  }

  return parts.join('. ').replace(/\.\./g, '.') || 'Project objectives to be defined.';
}

function buildContext(answers: QuestionAnswer[]): string {
  return answers
    .map((qa) => `**${qa.question}**\n${qa.answer}`)
    .join('\n\n');
}

function inferProjectType(intent: string, context: string): string {
  const text = `${intent} ${context}`.toLowerCase();

  if (text.includes('mobile app') || text.includes('ios') || text.includes('android')) {
    return 'mobile_app';
  }
  if (text.includes('web app') || text.includes('website') || text.includes('frontend')) {
    return 'web_app';
  }
  if (text.includes('api') || text.includes('backend') || text.includes('service')) {
    return 'api_service';
  }
  if (text.includes('platform') || text.includes('system')) {
    return 'platform';
  }
  if (text.includes('data') || text.includes('pipeline') || text.includes('analytics')) {
    return 'data_platform';
  }

  return 'general';
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Scoring
// ─────────────────────────────────────────────────────────────────────────────

function calculateQualityScore(spec: ObjectiveSpec): number {
  let score = 0;
  let maxScore = 0;

  // Title (10 points)
  maxScore += 10;
  if (spec.title && spec.title !== 'Untitled Project') score += 10;

  // Summary (15 points)
  maxScore += 15;
  if (spec.summary && spec.summary.length > 50) score += 15;
  else if (spec.summary) score += 5;

  // Intent (15 points)
  maxScore += 15;
  if (spec.intent && spec.intent.length > 30) score += 15;
  else if (spec.intent) score += 5;

  // Requirements (20 points)
  maxScore += 20;
  if (spec.requirements.length >= 5) score += 20;
  else if (spec.requirements.length >= 3) score += 15;
  else if (spec.requirements.length >= 1) score += 10;

  // Constraints (15 points)
  maxScore += 15;
  if (spec.constraints.length >= 3) score += 15;
  else if (spec.constraints.length >= 1) score += 10;

  // Success Criteria (15 points)
  maxScore += 15;
  const measurable = spec.successCriteria.filter((c) => c.measurable).length;
  if (measurable >= 2) score += 15;
  else if (spec.successCriteria.length >= 1) score += 10;

  // Context (10 points)
  maxScore += 10;
  if (spec.context && spec.context.length > 200) score += 10;
  else if (spec.context) score += 5;

  return Math.round((score / maxScore) * 100) / 100;
}

function calculateCompletenessScore(spec: ObjectiveSpec): number {
  const fields = [
    !!spec.title,
    !!spec.summary,
    !!spec.intent,
    !!spec.context,
    spec.requirements.length > 0,
    spec.constraints.length > 0,
    spec.successCriteria.length > 0,
  ];

  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown Formatting
// ─────────────────────────────────────────────────────────────────────────────

export function formatObjectiveAsMarkdown(spec: ObjectiveSpec): string {
  const lines: string[] = [];

  lines.push(`# ${spec.title || 'Untitled Objective'}`);
  lines.push('');

  if (spec.summary) {
    lines.push('## Summary');
    lines.push(spec.summary);
    lines.push('');
  }

  if (spec.intent) {
    lines.push('## Intent');
    lines.push(spec.intent);
    lines.push('');
  }

  if (spec.requirements.length > 0) {
    lines.push('## Requirements');
    for (const req of spec.requirements) {
      const priority = req.priority === 'must_have' ? '**[Must Have]**' :
                       req.priority === 'should_have' ? '[Should Have]' : '[Nice to Have]';
      lines.push(`- ${priority} ${req.description}`);
    }
    lines.push('');
  }

  if (spec.constraints.length > 0) {
    lines.push('## Constraints');
    for (const con of spec.constraints) {
      lines.push(`- [${con.type}] ${con.description}`);
    }
    lines.push('');
  }

  if (spec.successCriteria.length > 0) {
    lines.push('## Success Criteria');
    for (const crit of spec.successCriteria) {
      const measurable = crit.measurable ? ' (measurable)' : '';
      lines.push(`- ${crit.description}${measurable}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`**Quality Score:** ${Math.round(spec.qualityScore * 100)}%`);
  lines.push(`**Completeness:** ${Math.round(spec.completenessScore * 100)}%`);
  lines.push(`**Source:** ${spec.sourceMode}`);
  lines.push(`**Last Updated:** ${spec.updatedAt}`);

  return lines.join('\n');
}

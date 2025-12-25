/**
 * Refine with Reasoning Tool
 *
 * Integrates with enclave-reasoning-mcp to refine objectives
 * through multi-agent dialogue (Consultant ↔ Analyst).
 *
 * This tool is designed to be called AFTER Phase 1 capture is complete,
 * BEFORE saving the objective to the database.
 *
 * Flow:
 * 1. Get draft objective from session
 * 2. Call enclave-reasoning-mcp with objective_refinement preset
 * 3. Run dialogue iterations (2-3 rounds)
 * 4. Extract refined objective from dialogue
 * 5. Update session with refined objective
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getSession, updateSession, getObjective } from '../utils/session-store.js';
import type { ObjectiveSpec } from '../types.js';

export const refineWithReasoningTool: Tool = {
  name: 'refine_with_reasoning',
  description:
    'Refine a draft objective using enclave-reasoning-mcp\'s multi-agent dialogue. ' +
    'Uses the objective_refinement preset (Consultant ↔ Analyst). ' +
    'Call after Phase 1 is complete, before saving to database. ' +
    'NOTE: This tool prepares the refinement parameters - the actual reasoning ' +
    'session must be executed using enclave-reasoning-mcp tools directly.',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'The objective session ID',
      },
      max_iterations: {
        type: 'number',
        description: 'Maximum reasoning iterations (default: 3)',
        default: 3,
      },
      quality_threshold: {
        type: 'number',
        description: 'Quality threshold to stop early (default: 0.85)',
        default: 0.85,
      },
    },
    required: ['session_id'],
  },
};

interface ReasoningParams {
  preset: string;
  input: string;
  maxIterations: number;
  qualityThreshold: number;
}

export async function handleRefineWithReasoning(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const sessionId = args.session_id as string;
  const maxIterations = (args.max_iterations as number) || 3;
  const qualityThreshold = (args.quality_threshold as number) || 0.85;

  // Get the session
  const session = getSession(sessionId);
  if (!session) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: 'Session not found',
              session_id: sessionId,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Check if we have a draft objective
  const objective = getObjective(session);
  if (!objective) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: 'No draft objective available - complete Phase 1 first',
              session_id: sessionId,
              phase: session.phase,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Format the objective for reasoning input
  const objectiveMarkdown = formatObjectiveForReasoning(objective);

  // Prepare the reasoning parameters
  const reasoningParams: ReasoningParams = {
    preset: 'objective_refinement',
    input: objectiveMarkdown,
    maxIterations,
    qualityThreshold,
  };

  // Update session to show refinement is pending
  updateSession(sessionId, {
    status: 'refining',
  });

  // Return parameters for the caller to use with enclave-reasoning-mcp
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            session_id: sessionId,
            objective_id: objective.id,
            objective_title: objective.title,
            reasoning_params: reasoningParams,
            instructions: {
              step1: 'Call enclave-reasoning-mcp start_reasoning_session with preset="objective_refinement" and the input below',
              step2: 'Call run_reasoning_exchange to iterate (2-3 times)',
              step3: 'Call get_reasoning_result to get the refined objective',
              step4: 'Parse the refined content and call update_refined_objective on enclave-objective-mcp',
              step5: 'Call save_objective with reasoning_session_id and reasoning_summary',
            },
            input_for_reasoning: objectiveMarkdown,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Format objective into markdown for reasoning input
 */
function formatObjectiveForReasoning(objective: ObjectiveSpec): string {
  const sections: string[] = [];

  sections.push(`# Objective: ${objective.title}`);
  sections.push('');

  if (objective.summary) {
    sections.push(`## Summary`);
    sections.push(objective.summary);
    sections.push('');
  }

  if (objective.intent) {
    sections.push(`## Intent`);
    sections.push(objective.intent);
    sections.push('');
  }

  if (objective.context) {
    sections.push(`## Context`);
    sections.push(objective.context);
    sections.push('');
  }

  if (objective.requirements && objective.requirements.length > 0) {
    sections.push(`## Requirements`);
    objective.requirements.forEach((req) => {
      const priority = req.priority ? ` [${req.priority}]` : '';
      sections.push(`- ${req.description}${priority}`);
    });
    sections.push('');
  }

  if (objective.constraints && objective.constraints.length > 0) {
    sections.push(`## Constraints`);
    objective.constraints.forEach((con) => {
      const type = con.type ? ` (${con.type})` : '';
      sections.push(`- ${con.description}${type}`);
    });
    sections.push('');
  }

  if (objective.successCriteria && objective.successCriteria.length > 0) {
    sections.push(`## Success Criteria`);
    objective.successCriteria.forEach((crit) => {
      const metric = crit.metric ? ` - Metric: ${crit.metric}` : '';
      sections.push(`- ${crit.description}${metric}`);
    });
    sections.push('');
  }

  if (objective.type) {
    sections.push(`## Project Type`);
    sections.push(objective.type);
    sections.push('');
  }

  if (objective.domain) {
    sections.push(`## Domain`);
    sections.push(objective.domain);
    sections.push('');
  }

  if (objective.timeframe) {
    sections.push(`## Timeframe`);
    sections.push(objective.timeframe);
    sections.push('');
  }

  if (objective.budget) {
    sections.push(`## Budget`);
    sections.push(objective.budget);
    sections.push('');
  }

  sections.push(`---`);
  sections.push(`**Current Quality Score:** ${objective.qualityScore}`);
  sections.push(`**Completeness Score:** ${objective.completenessScore}`);
  sections.push(`**Source Mode:** ${objective.sourceMode}`);

  return sections.join('\n');
}

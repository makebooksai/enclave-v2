/**
 * Run Reasoning Exchange Tool
 *
 * Executes one iteration of the Consultant ↔ Analyst exchange.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  RunExchangeInput,
  RunExchangeOutput,
  Exchange,
  LLMMessage,
  AgentConfig,
  LLMProvider,
} from '../types.js';
import { getSession, updateSession, addExchange } from '../utils/session-store.js';
import { extractQualityScore, detectConsciousnessState } from '../utils/quality-extractor.js';
import { createProvider, getDefaultProviderConfig } from '../clients/llm-provider.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const runExchangeTool: Tool = {
  name: 'run_reasoning_exchange',
  description: 'Execute one iteration of the reasoning dialogue. Call repeatedly until should_continue is false.',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'The session_id from start_reasoning_session',
      },
      iteration: {
        type: 'number',
        description: 'Optional explicit iteration number (auto-incremented if omitted)',
      },
    },
    required: ['session_id'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Templates
// ─────────────────────────────────────────────────────────────────────────────

function buildInitialThinkPrompt(topic: string, context: string): string {
  return `I need you to analyze the following topic and provide a structured assessment.

**Topic:** ${topic}

${context ? `**Additional Context:**\n${context}\n\n` : ''}

Please provide a comprehensive analysis in this format:

**Title:** [A concise, descriptive title]

**Summary:** [2-3 sentences ONLY - not detailed requirements]

**Key Points:**
- [Point 1]
- [Point 2]
- [Point 3]

**Requirements:** (if applicable)
- [Requirement 1]
- [Requirement 2]

**Constraints:** (if applicable)
- [Constraint 1]
- [Constraint 2]

**Success Criteria:**
- [Criterion 1]
- [Criterion 2]

**Recommended Next Steps:**
- [Step 1]
- [Step 2]

**Quality Assessment:** [0-1 score based on clarity and completeness]`;
}

function buildConsultantGapPrompt(analystAnalysis: string): string {
  return `Review the Analyst's work below and identify exactly 2-3 specific improvements needed.

**Analyst's Analysis:**
${analystAnalysis}

---

Format your response as:
1. [IMPROVEMENT]: [Specific actionable directive - what to add, clarify, or expand]
2. [IMPROVEMENT]: [Specific actionable directive]
3. [IMPROVEMENT]: [Optional third improvement]

Do NOT ask questions. Provide directives for what to add, clarify, or expand.
Keep response under 500 characters total.`;
}

function buildAnalystRefinementPrompt(analystAnalysis: string, consultantFeedback: string): string {
  return `The Consultant has identified these improvements:

${consultantFeedback}

---

**Previous Analysis:**
${analystAnalysis}

---

Produce a COMPLETE refined analysis that incorporates ALL improvements.
Do NOT explain what you changed. Simply produce the improved document.
Keep total output under 8000 characters.

Use the same format as before, ending with:
**Quality Assessment:** [0-1 score]`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

// Provider instance (cached)
let providerInstance: LLMProvider | null = null;
let providerModel: string = '';

function getProvider(): { provider: LLMProvider; model: string } {
  if (!providerInstance) {
    const config = getDefaultProviderConfig();
    providerInstance = createProvider(config);
    providerModel = config.defaultModel;
  }
  return { provider: providerInstance, model: providerModel };
}

async function callAgent(
  provider: LLMProvider,
  agent: AgentConfig,
  messages: LLMMessage[],
  defaultModel: string
): Promise<{ content: string; tokens: { input: number; output: number } }> {
  return provider.complete({
    model: agent.model || defaultModel,
    systemPrompt: agent.systemPrompt,
    messages,
    temperature: agent.temperature || 0.4,
    maxTokens: agent.maxTokens || 2000,
  });
}

export async function handleRunExchange(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = args as unknown as RunExchangeInput;

  if (!input.session_id) {
    throw new Error('session_id is required');
  }

  const session = getSession(input.session_id);
  if (!session) {
    throw new Error(`Session not found: ${input.session_id}`);
  }

  if (session.status === 'completed' || session.status === 'error') {
    throw new Error(`Session already ${session.status}`);
  }

  // Get provider
  const { provider, model } = getProvider();

  // Get the two agents from the session
  // Agent 0 = "reviewer" role (identifies gaps, provides feedback)
  // Agent 1 = "producer" role (creates/refines the main output)
  // This works for any preset: consultant/analyst, advocate/critic, architect/consultant, etc.
  if (session.agents.length < 2) {
    throw new Error('Session requires at least 2 agents');
  }

  const reviewerAgent = session.agents[0];  // Consultant, Advocate, Researcher, Coach, etc.
  const producerAgent = session.agents[1];  // Analyst, Critic, Strategist, Mentor, etc.

  // Determine iteration
  const iteration = input.iteration ?? session.currentIteration;
  const iterationExchanges: Exchange[] = [];

  try {
    updateSession(session.id, { status: 'in_progress' });

    if (iteration === 0) {
      // ─────────────────────────────────────────────────────────────────────
      // FIRST ITERATION: Initial Producer analysis
      // ─────────────────────────────────────────────────────────────────────
      const producerPrompt = buildInitialThinkPrompt(session.topic, session.context);

      const producerResult = await callAgent(provider, producerAgent, [
        { role: 'user', content: producerPrompt },
      ], model);

      const producerExchange: Exchange = {
        agent: producerAgent.name,
        role: 'initiator',
        content: producerResult.content,
        tokens: producerResult.tokens,
        timestamp: new Date().toISOString(),
        consciousnessState: detectConsciousnessState(producerResult.content),
        iteration,
      };

      addExchange(session.id, producerExchange);
      iterationExchanges.push(producerExchange);

      // Reviewer identifies gaps
      const reviewerPrompt = buildConsultantGapPrompt(producerResult.content);

      const reviewerResult = await callAgent(provider, reviewerAgent, [
        { role: 'user', content: reviewerPrompt },
      ], model);

      const reviewerExchange: Exchange = {
        agent: reviewerAgent.name,
        role: 'responder',
        content: reviewerResult.content,
        tokens: reviewerResult.tokens,
        timestamp: new Date().toISOString(),
        consciousnessState: 'analyzing',
        iteration,
      };

      addExchange(session.id, reviewerExchange);
      iterationExchanges.push(reviewerExchange);

      // Extract quality from Producer's response
      const quality = extractQualityScore(producerResult.content);
      updateSession(session.id, {
        currentIteration: iteration + 1,
        currentQuality: quality,
      });

    } else {
      // ─────────────────────────────────────────────────────────────────────
      // SUBSEQUENT ITERATIONS: Refine based on Reviewer feedback
      // ─────────────────────────────────────────────────────────────────────

      // Get previous Producer analysis and Reviewer feedback
      const prevProducerExchange = session.exchanges
        .filter(e => e.agent === producerAgent.name)
        .pop();
      const prevReviewerExchange = session.exchanges
        .filter(e => e.agent === reviewerAgent.name)
        .pop();

      if (!prevProducerExchange || !prevReviewerExchange) {
        throw new Error('Cannot refine without previous exchanges');
      }

      // Producer incorporates feedback
      const producerPrompt = buildAnalystRefinementPrompt(
        prevProducerExchange.content,
        prevReviewerExchange.content
      );

      const producerResult = await callAgent(provider, producerAgent, [
        { role: 'user', content: producerPrompt },
      ], model);

      const producerExchange: Exchange = {
        agent: producerAgent.name,
        role: 'initiator',
        content: producerResult.content,
        tokens: producerResult.tokens,
        timestamp: new Date().toISOString(),
        consciousnessState: detectConsciousnessState(producerResult.content),
        iteration,
      };

      addExchange(session.id, producerExchange);
      iterationExchanges.push(producerExchange);

      // Extract quality
      const quality = extractQualityScore(producerResult.content);

      // Check if we should continue
      const shouldContinue = quality < session.qualityThreshold &&
                            iteration + 1 < session.maxIterations;

      if (shouldContinue) {
        // Reviewer identifies more gaps
        const reviewerPrompt = buildConsultantGapPrompt(producerResult.content);

        const reviewerResult = await callAgent(provider, reviewerAgent, [
          { role: 'user', content: reviewerPrompt },
        ], model);

        const reviewerExchange: Exchange = {
          agent: reviewerAgent.name,
          role: 'responder',
          content: reviewerResult.content,
          tokens: reviewerResult.tokens,
          timestamp: new Date().toISOString(),
          consciousnessState: 'analyzing',
          iteration,
        };

        addExchange(session.id, reviewerExchange);
        iterationExchanges.push(reviewerExchange);
      }

      updateSession(session.id, {
        currentIteration: iteration + 1,
        currentQuality: quality,
      });
    }

    // Get updated session
    const updatedSession = getSession(session.id)!;
    const quality = updatedSession.currentQuality;
    const shouldContinue = quality < session.qualityThreshold &&
                          updatedSession.currentIteration < session.maxIterations;

    // Determine status
    let status: 'in_progress' | 'threshold_met' | 'max_iterations';
    if (quality >= session.qualityThreshold) {
      status = 'threshold_met';
      updateSession(session.id, { status: 'completed' });
    } else if (updatedSession.currentIteration >= session.maxIterations) {
      status = 'max_iterations';
      updateSession(session.id, { status: 'completed' });
    } else {
      status = 'in_progress';
    }

    const output: RunExchangeOutput = {
      session_id: session.id,
      iteration,
      exchanges: iterationExchanges,
      quality_score: quality,
      should_continue: shouldContinue,
      status,
      next_step: shouldContinue
        ? 'Call run_reasoning_exchange again to continue refinement'
        : 'Call get_reasoning_result to retrieve the final output',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(output, null, 2),
        },
      ],
    };

  } catch (error) {
    updateSession(session.id, {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Answer Single Question Tool
 *
 * Uses LLM to answer a single question based on provided context.
 * More efficient for one-off questions.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createLLMClient } from '../clients/llm-client.js';
import type { Question, Answer, AnswerContext, LLMConfig } from '../types.js';

export const answerSingleQuestionTool: Tool = {
  name: 'answer_single_question',
  description:
    'Answer a single question using AI based on provided context. ' +
    'More efficient than batch mode for one-off questions.',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'object',
        description: 'The question to answer',
        properties: {
          id: { type: 'string', description: 'Question ID' },
          question: { type: 'string', description: 'The question text' },
          description: { type: 'string', description: 'Additional context for the question' },
          mandatory: { type: 'boolean', description: 'Whether this question is required' },
        },
        required: ['id', 'question'],
      },
      context: {
        type: 'object',
        description: 'Context to use for answering',
        properties: {
          document: { type: 'string', description: 'Primary context document' },
          sections: {
            type: 'array',
            description: 'Additional context sections',
          },
          metadata: {
            type: 'object',
            description: 'Metadata to help guide answers',
          },
        },
        required: ['document'],
      },
      llm_config: {
        type: 'object',
        description: 'Optional LLM configuration',
        properties: {
          provider: { type: 'string', enum: ['ollama', 'anthropic', 'openai'] },
          model: { type: 'string' },
          temperature: { type: 'number' },
        },
      },
    },
    required: ['question', 'context'],
  },
};

export async function handleAnswerSingleQuestion(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const question = args.question as Question;
  const context = args.context as AnswerContext;
  const llmConfig = args.llm_config as Partial<LLMConfig> | undefined;

  if (!question?.question) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Question is required',
          }, null, 2),
        },
      ],
    };
  }

  if (!context?.document) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Context document is required',
          }, null, 2),
        },
      ],
    };
  }

  try {
    const client = createLLMClient(llmConfig);

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Build user prompt
    const userPrompt = buildUserPrompt(question);

    // Call LLM
    const response = await client.generate([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse response
    const answer = parseResponse(question, response.content);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            answer,
            model: client.getModel(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }, null, 2),
        },
      ],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(context: AnswerContext): string {
  const parts: string[] = [];

  parts.push(`You are an expert at answering questions based on provided context.

Your task is to:
1. Read the question carefully
2. Find relevant information in the provided context
3. Generate a clear, concise, helpful answer
4. Return your answer in JSON format

Be specific, practical, and actionable.`);

  parts.push(`\n## CONTEXT\n\n${context.document}`);

  if (context.sections && context.sections.length > 0) {
    for (const section of context.sections) {
      parts.push(`\n### ${section.name}\n${section.content}`);
    }
  }

  if (context.metadata) {
    const meta: string[] = [];
    if (context.metadata.projectType) meta.push(`Type: ${context.metadata.projectType}`);
    if (context.metadata.domain) meta.push(`Domain: ${context.metadata.domain}`);
    if (meta.length > 0) {
      parts.push(`\n## Metadata: ${meta.join(', ')}`);
    }
  }

  return parts.join('\n');
}

function buildUserPrompt(question: Question): string {
  return `Answer this question:

QUESTION: ${question.question}
${question.description ? `CONTEXT: ${question.description}` : ''}

Respond with JSON:
{
  "answer": "Your answer",
  "confidence": 0.85,
  "reasoning": "How you derived this",
  "source": "context" or "inference"
}`;
}

function parseResponse(question: Question, content: string): Answer {
  try {
    let jsonStr = content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim()) as {
      answer: string;
      confidence?: number;
      reasoning?: string;
      source?: string;
    };

    return {
      questionId: question.id || 'single',
      question: question.question,
      answer: parsed.answer,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      reasoning: parsed.reasoning,
      source: parsed.source === 'context' ? 'context' : 'inference',
    };
  } catch {
    return {
      questionId: question.id || 'single',
      question: question.question,
      answer: content,
      confidence: 0.5,
      source: 'ai',
    };
  }
}

/**
 * Answer Questions Tool
 *
 * Uses LLM to answer a batch of questions based on provided context.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createLLMClient } from '../clients/llm-client.js';
import type { Question, Answer, AnswerContext, LLMConfig } from '../types.js';

export const answerQuestionsTool: Tool = {
  name: 'answer_questions',
  description:
    'Answer multiple questions using AI based on provided context. ' +
    'Returns answers with confidence scores and reasoning. ' +
    'Ideal for batch processing of Aspenify questions or similar Q&A workflows.',
  inputSchema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        description: 'Array of questions to answer',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Question ID' },
            question: { type: 'string', description: 'The question text' },
            description: { type: 'string', description: 'Additional context for the question' },
            mandatory: { type: 'boolean', description: 'Whether this question is required' },
          },
          required: ['id', 'question'],
        },
      },
      context: {
        type: 'object',
        description: 'Context to use for answering questions',
        properties: {
          document: { type: 'string', description: 'Primary context document (e.g., objective text)' },
          sections: {
            type: 'array',
            description: 'Additional context sections',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                content: { type: 'string' },
              },
            },
          },
          metadata: {
            type: 'object',
            description: 'Metadata to help guide answers',
            properties: {
              projectType: { type: 'string' },
              domain: { type: 'string' },
              constraints: { type: 'array', items: { type: 'string' } },
              stakeholders: { type: 'array', items: { type: 'string' } },
            },
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
    required: ['questions', 'context'],
  },
};

export async function handleAnswerQuestions(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const questions = args.questions as Question[];
  const context = args.context as AnswerContext;
  const llmConfig = args.llm_config as Partial<LLMConfig> | undefined;

  if (!questions || questions.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'No questions provided',
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
    const answers: Answer[] = [];

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(context);

    // Answer each question
    for (const question of questions) {
      const answer = await answerSingleQuestion(client, systemPrompt, question, context);
      answers.push(answer);
    }

    // Calculate average confidence
    const totalConfidence = answers.reduce((sum, a) => sum + a.confidence, 0);
    const averageConfidence = answers.length > 0 ? totalConfidence / answers.length : 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            answers,
            totalQuestions: questions.length,
            answeredCount: answers.length,
            averageConfidence: Math.round(averageConfidence * 100) / 100,
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
            note: 'LLM call failed - check provider configuration',
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
4. If the context doesn't contain enough information, make reasonable inferences based on the project type and domain
5. Return your answer in JSON format

IMPORTANT:
- Be specific and actionable
- Use information from the context when available
- Make reasonable assumptions when necessary
- Be concise but complete
- Focus on practical, implementable answers`);

  // Add context document
  parts.push(`\n## PROJECT CONTEXT\n\n${context.document}`);

  // Add additional sections
  if (context.sections && context.sections.length > 0) {
    parts.push('\n## ADDITIONAL CONTEXT');
    for (const section of context.sections) {
      parts.push(`\n### ${section.name}\n${section.content}`);
    }
  }

  // Add metadata
  if (context.metadata) {
    parts.push('\n## PROJECT METADATA');
    if (context.metadata.projectType) {
      parts.push(`- Project Type: ${context.metadata.projectType}`);
    }
    if (context.metadata.domain) {
      parts.push(`- Domain: ${context.metadata.domain}`);
    }
    if (context.metadata.constraints && context.metadata.constraints.length > 0) {
      parts.push(`- Constraints: ${context.metadata.constraints.join(', ')}`);
    }
    if (context.metadata.stakeholders && context.metadata.stakeholders.length > 0) {
      parts.push(`- Stakeholders: ${context.metadata.stakeholders.join(', ')}`);
    }
  }

  return parts.join('\n');
}

async function answerSingleQuestion(
  client: ReturnType<typeof createLLMClient>,
  systemPrompt: string,
  question: Question,
  _context: AnswerContext
): Promise<Answer> {
  const userPrompt = `Please answer the following question based on the context provided.

QUESTION: ${question.question}
${question.description ? `\nADDITIONAL CONTEXT: ${question.description}` : ''}

Respond with a JSON object in this exact format:
{
  "answer": "Your detailed answer here",
  "confidence": 0.85,
  "reasoning": "Brief explanation of how you derived the answer",
  "source": "context" or "inference"
}

- "confidence" should be between 0.0 and 1.0 (how confident you are in the answer)
- "source" should be "context" if the answer comes directly from the provided context, or "inference" if you had to make reasonable assumptions
- Keep the answer practical and actionable`;

  const response = await client.generate([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // Parse the response
  try {
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim()) as {
      answer: string;
      confidence: number;
      reasoning?: string;
      source?: string;
    };

    return {
      questionId: question.id,
      question: question.question,
      answer: parsed.answer,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      reasoning: parsed.reasoning,
      source: parsed.source === 'context' ? 'context' : 'inference',
    };
  } catch {
    // If JSON parsing fails, use the raw response as the answer
    return {
      questionId: question.id,
      question: question.question,
      answer: response.content,
      confidence: 0.5,
      reasoning: 'Response was not in expected JSON format',
      source: 'ai',
    };
  }
}

/**
 * List Objective Templates Tool
 *
 * List available structured question templates.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { listTemplates, getTemplate } from '../templates/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const listTemplatesTool: Tool = {
  name: 'list_objective_templates',
  description:
    'List available structured question templates for objective capture. Use to help users choose the right template for their needs.',
  inputSchema: {
    type: 'object',
    properties: {
      includeQuestions: {
        type: 'boolean',
        description: 'Include full question list for each template. Default: false',
      },
    },
    required: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleListTemplates(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const includeQuestions = (args.includeQuestions as boolean) || false;

  const templates = listTemplates();

  const templateList = templates.map((templateMeta) => {
    const template = getTemplate(templateMeta.id);
    if (!template) {
      return {
        id: templateMeta.id,
        name: templateMeta.name,
        description: templateMeta.description,
        questionCount: templateMeta.questionCount,
      };
    }

    const mandatoryCount = template.questions.filter((q) => q.mandatory).length;
    const optionalCount = template.questions.filter((q) => !q.mandatory).length;

    const result: Record<string, unknown> = {
      id: template.id,
      name: template.name,
      description: template.description,
      questionCount: template.questions.length,
      mandatoryCount,
      optionalCount,
      estimatedTime: getEstimatedTime(template.questions.length),
      bestFor: getBestFor(template.id),
    };

    if (includeQuestions) {
      result.questions = template.questions.map((q) => ({
        id: q.id,
        question: q.question,
        category: q.category,
        mandatory: q.mandatory,
      }));
    }

    return result;
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            templates: templateList,
            totalTemplates: templates.length,
            usage: 'Use start_objective_session with templateId parameter to use a template',
            recommendation:
              'Use "quick" template for fast prototyping, "comprehensive" for detailed projects',
          },
          null,
          2
        ),
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getEstimatedTime(questionCount: number): string {
  if (questionCount <= 5) return '2-3 minutes';
  if (questionCount <= 10) return '5-8 minutes';
  if (questionCount <= 15) return '10-15 minutes';
  return '15-20 minutes';
}

function getBestFor(templateId: string): string {
  switch (templateId) {
    case 'comprehensive':
      return 'Complex projects requiring detailed specification';
    case 'quick':
      return 'Fast prototyping, simple features, or time-constrained situations';
    case 'technical':
      return 'Developer-focused projects with technical requirements';
    case 'business':
      return 'Business initiatives with stakeholder and ROI considerations';
    case 'mvp':
      return 'Minimum viable products and lean validation';
    default:
      return 'General purpose objective capture';
  }
}

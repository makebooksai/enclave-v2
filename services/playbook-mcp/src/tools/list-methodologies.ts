/**
 * List Methodologies Tool
 *
 * Returns available project methodologies with descriptions
 * to help users choose the right approach.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const listMethodologiesTool: Tool = {
  name: 'list_methodologies',
  description: 'List available project methodologies with descriptions and use cases',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export interface Methodology {
  id: string;
  name: string;
  description: string;
  best_for: string[];
  phases: string[];
  pros: string[];
  cons: string[];
}

const METHODOLOGIES: Methodology[] = [
  {
    id: 'agile',
    name: 'Agile',
    description: 'Iterative development with continuous feedback and adaptation. Work is done in short sprints with regular delivery.',
    best_for: [
      'Software development',
      'Projects with evolving requirements',
      'Teams that can work closely together',
      'Products needing frequent user feedback',
    ],
    phases: ['Discovery', 'Sprint Planning', 'Development Sprints', 'Review & Retrospective', 'Release'],
    pros: ['Flexible to change', 'Early and continuous delivery', 'Close collaboration', 'Reduced risk through iteration'],
    cons: ['Requires active stakeholder involvement', 'Can lack long-term predictability', 'Documentation often lighter'],
  },
  {
    id: 'waterfall',
    name: 'Waterfall',
    description: 'Sequential, linear approach where each phase must be completed before the next begins. Well-documented and structured.',
    best_for: [
      'Projects with fixed, well-understood requirements',
      'Regulatory or compliance-heavy projects',
      'Hardware or manufacturing projects',
      'Projects with clear deliverables and deadlines',
    ],
    phases: ['Requirements', 'Design', 'Implementation', 'Testing', 'Deployment', 'Maintenance'],
    pros: ['Clear milestones', 'Comprehensive documentation', 'Predictable timeline', 'Easy to understand'],
    cons: ['Inflexible to change', 'Testing comes late', 'Risk discovered late in process'],
  },
  {
    id: 'lean',
    name: 'Lean',
    description: 'Focus on eliminating waste and maximizing value. Build only what\'s needed, when it\'s needed.',
    best_for: [
      'Startups and MVPs',
      'Resource-constrained projects',
      'Projects focused on efficiency',
      'Continuous improvement initiatives',
    ],
    phases: ['Identify Value', 'Map Value Stream', 'Create Flow', 'Establish Pull', 'Pursue Perfection'],
    pros: ['Eliminates waste', 'Fast to market', 'Cost efficient', 'Customer-focused'],
    cons: ['May sacrifice features', 'Requires discipline', 'Can feel minimal'],
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    description: 'Combines elements from multiple methodologies. Typically uses Waterfall for planning/design and Agile for execution.',
    best_for: [
      'Complex projects needing both structure and flexibility',
      'Enterprise projects with regulatory needs',
      'Projects with mixed teams or stakeholders',
      'When neither pure Agile nor Waterfall fits',
    ],
    phases: ['Strategic Planning (Waterfall)', 'Architecture & Design', 'Agile Development Sprints', 'Integration & Testing', 'Release & Review'],
    pros: ['Best of both worlds', 'Adaptable to project needs', 'Structured yet flexible'],
    cons: ['Can be complex to manage', 'Requires clear governance', 'Team needs to understand both approaches'],
  },
];

export async function handleListMethodologies(): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(METHODOLOGIES, null, 2),
      },
    ],
  };
}

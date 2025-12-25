/**
 * Structured Question Templates
 *
 * Predefined question sets for Phase 1 structured mode.
 */

import type { QuestionTemplate, Question } from '../types.js';
import { randomUUID } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Create question with auto-generated ID
// ─────────────────────────────────────────────────────────────────────────────

function q(
  question: string,
  description: string,
  options: Partial<Question> = {}
): Question {
  return {
    id: randomUUID(),
    question,
    description,
    placeholder: options.placeholder || '',
    questionType: options.questionType || 'text',
    mandatory: options.mandatory ?? true,
    category: options.category,
    order: options.order ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive Template (15-20 questions)
// ─────────────────────────────────────────────────────────────────────────────

const comprehensiveQuestions: Question[] = [
  // Vision & Goals
  q(
    'What is the primary goal or outcome you want to achieve?',
    'The main objective that defines success for this project',
    { category: 'vision', order: 1, placeholder: 'Build a mobile app that helps users track their daily habits' }
  ),
  q(
    'What problem are you trying to solve?',
    'The pain point or gap that this project addresses',
    { category: 'vision', order: 2, placeholder: 'Users struggle to maintain consistency with their goals' }
  ),
  q(
    'Who are the primary users or beneficiaries?',
    'The target audience who will use or benefit from this',
    { category: 'vision', order: 3, placeholder: 'Health-conscious individuals aged 25-45' }
  ),
  q(
    'What does success look like? How will you measure it?',
    'Specific metrics or outcomes that indicate project success',
    { category: 'vision', order: 4, placeholder: '10,000 active users within 6 months, 80% retention rate' }
  ),

  // Scope & Features
  q(
    'What are the must-have features or capabilities?',
    'Core functionality that is absolutely required',
    { category: 'scope', order: 5, placeholder: 'User accounts, habit tracking, daily reminders, progress charts' }
  ),
  q(
    'What are the nice-to-have features?',
    'Additional features that would enhance the solution but are not critical',
    { category: 'scope', order: 6, mandatory: false, placeholder: 'Social sharing, gamification, AI insights' }
  ),
  q(
    'What is explicitly out of scope?',
    'Things you specifically do NOT want to include',
    { category: 'scope', order: 7, mandatory: false, placeholder: 'No marketplace, no premium subscriptions initially' }
  ),

  // Technical
  q(
    'What platforms or technologies should be used?',
    'Preferred or required technical stack',
    { category: 'technical', order: 8, placeholder: 'React Native for mobile, Node.js backend, PostgreSQL' }
  ),
  q(
    'Are there existing systems this needs to integrate with?',
    'APIs, databases, or services that must be connected',
    { category: 'technical', order: 9, mandatory: false, placeholder: 'Google Calendar API, Apple Health' }
  ),
  q(
    'What are the performance requirements?',
    'Speed, scalability, or availability expectations',
    { category: 'technical', order: 10, mandatory: false, placeholder: 'Page load under 2 seconds, support 100k concurrent users' }
  ),

  // Constraints
  q(
    'What is your timeline or deadline?',
    'When this needs to be completed',
    { category: 'constraints', order: 11, placeholder: 'MVP in 3 months, full launch in 6 months' }
  ),
  q(
    'What is your budget range?',
    'Available resources for this project',
    { category: 'constraints', order: 12, mandatory: false, placeholder: '$50,000 - $100,000' }
  ),
  q(
    'What resources (team, tools) do you have available?',
    'Existing capabilities and assets',
    { category: 'constraints', order: 13, mandatory: false, placeholder: '2 developers, 1 designer, AWS account' }
  ),
  q(
    'Are there regulatory or compliance requirements?',
    'Legal, security, or industry standards to follow',
    { category: 'constraints', order: 14, mandatory: false, placeholder: 'GDPR compliance, HIPAA if health data' }
  ),

  // Context
  q(
    'What similar solutions exist? How is this different?',
    'Competitive landscape and differentiation',
    { category: 'context', order: 15, mandatory: false, placeholder: 'Similar to Habitica but focused on simplicity, not gamification' }
  ),
  q(
    'What have you already tried or considered?',
    'Previous attempts or research done',
    { category: 'context', order: 16, mandatory: false, placeholder: 'Tried spreadsheets, looked at existing apps but too complex' }
  ),

  // Risks & Concerns
  q(
    'What are your biggest concerns or risks?',
    'Potential obstacles or worries about the project',
    { category: 'risks', order: 17, mandatory: false, placeholder: 'User adoption, technical complexity, timeline pressure' }
  ),
  q(
    'What would cause this project to fail?',
    'Critical failure points to avoid',
    { category: 'risks', order: 18, mandatory: false, placeholder: 'Poor user experience, unreliable notifications' }
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Quick Template (5-7 essential questions)
// ─────────────────────────────────────────────────────────────────────────────

const quickQuestions: Question[] = [
  q(
    'What do you want to build?',
    'A brief description of the project',
    { category: 'vision', order: 1, placeholder: 'A habit tracking mobile app' }
  ),
  q(
    'What problem does it solve?',
    'The pain point or need being addressed',
    { category: 'vision', order: 2, placeholder: 'Users struggle to maintain healthy habits' }
  ),
  q(
    'Who is it for?',
    'The target users or audience',
    { category: 'vision', order: 3, placeholder: 'Health-conscious professionals' }
  ),
  q(
    'What are the must-have features?',
    'Core capabilities required',
    { category: 'scope', order: 4, placeholder: 'Habit tracking, reminders, progress visualization' }
  ),
  q(
    'What is your timeline?',
    'When you need it completed',
    { category: 'constraints', order: 5, placeholder: '3 months for MVP' }
  ),
  q(
    'Any technical preferences or constraints?',
    'Technology requirements or limitations',
    { category: 'technical', order: 6, mandatory: false, placeholder: 'Must work on iOS and Android' }
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Technical Template (Focus on technical requirements)
// ─────────────────────────────────────────────────────────────────────────────

const technicalQuestions: Question[] = [
  q(
    'What is the system or application you want to build?',
    'High-level description of the technical solution',
    { category: 'vision', order: 1, placeholder: 'A real-time data processing pipeline' }
  ),
  q(
    'What are the primary use cases?',
    'Main scenarios the system must support',
    { category: 'scope', order: 2, placeholder: 'Ingest IoT data, process in real-time, store for analytics' }
  ),
  q(
    'What is the expected data volume and throughput?',
    'Scale requirements for the system',
    { category: 'technical', order: 3, placeholder: '1 million events per second, 10TB daily' }
  ),
  q(
    'What are the latency requirements?',
    'How fast must the system respond?',
    { category: 'technical', order: 4, placeholder: 'Sub-100ms end-to-end processing' }
  ),
  q(
    'What availability and reliability is required?',
    'Uptime and fault tolerance expectations',
    { category: 'technical', order: 5, placeholder: '99.99% uptime, automatic failover' }
  ),
  q(
    'What existing systems must this integrate with?',
    'APIs, databases, or services to connect',
    { category: 'technical', order: 6, placeholder: 'Kafka, PostgreSQL, Elasticsearch, Grafana' }
  ),
  q(
    'What is the preferred technology stack?',
    'Languages, frameworks, and tools',
    { category: 'technical', order: 7, placeholder: 'Rust for processing, Kubernetes for orchestration' }
  ),
  q(
    'What are the security requirements?',
    'Authentication, encryption, compliance needs',
    { category: 'technical', order: 8, placeholder: 'TLS everywhere, SOC2 compliance, role-based access' }
  ),
  q(
    'What monitoring and observability is needed?',
    'Logging, metrics, alerting requirements',
    { category: 'technical', order: 9, placeholder: 'Prometheus metrics, distributed tracing, PagerDuty alerts' }
  ),
  q(
    'What is the deployment environment?',
    'Where will this run?',
    { category: 'technical', order: 10, placeholder: 'AWS EKS, multi-region, GitOps deployment' }
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Business Template (Focus on business goals)
// ─────────────────────────────────────────────────────────────────────────────

const businessQuestions: Question[] = [
  q(
    'What is the business objective?',
    'The strategic goal this project supports',
    { category: 'vision', order: 1, placeholder: 'Increase customer retention by 20%' }
  ),
  q(
    'Who are the key stakeholders?',
    'People who have interest in or influence over this project',
    { category: 'vision', order: 2, placeholder: 'VP of Product, Head of Customer Success, CFO' }
  ),
  q(
    'What is the target market or customer segment?',
    'Who you are trying to reach',
    { category: 'vision', order: 3, placeholder: 'Enterprise B2B SaaS customers, 500+ employees' }
  ),
  q(
    'What are the key success metrics (KPIs)?',
    'How will business success be measured?',
    { category: 'vision', order: 4, placeholder: 'NPS score > 50, churn rate < 5%, expansion revenue +15%' }
  ),
  q(
    'What is the revenue model or business case?',
    'How this creates or saves money',
    { category: 'vision', order: 5, placeholder: 'Reduce support costs by $2M/year, enable premium tier pricing' }
  ),
  q(
    'What is the competitive advantage?',
    'Why customers would choose this over alternatives',
    { category: 'context', order: 6, placeholder: 'Only solution that integrates with legacy systems' }
  ),
  q(
    'What is the go-to-market strategy?',
    'How will this be launched and promoted?',
    { category: 'context', order: 7, mandatory: false, placeholder: 'Pilot with top 10 customers, then phased rollout' }
  ),
  q(
    'What are the budget constraints?',
    'Available funding and resource limits',
    { category: 'constraints', order: 8, placeholder: '$500K initial investment, 6-month runway' }
  ),
  q(
    'What are the timeline expectations?',
    'Key milestones and deadlines',
    { category: 'constraints', order: 9, placeholder: 'Q2 launch to align with customer renewal cycle' }
  ),
  q(
    'What are the risks to achieving ROI?',
    'Threats to business success',
    { category: 'risks', order: 10, placeholder: 'Market timing, competitor response, adoption resistance' }
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// MVP Template (Minimal viable product scoping)
// ─────────────────────────────────────────────────────────────────────────────

const mvpQuestions: Question[] = [
  q(
    'What is the core value proposition?',
    'The ONE thing this must do well',
    { category: 'vision', order: 1, placeholder: 'Help users track and maintain daily habits effortlessly' }
  ),
  q(
    'Who is the initial target user?',
    'The specific early adopter segment',
    { category: 'vision', order: 2, placeholder: 'Busy professionals who want simple habit tracking' }
  ),
  q(
    'What is the absolute minimum feature set?',
    'Features required to deliver core value (nothing more)',
    { category: 'scope', order: 3, placeholder: 'Create habit, mark complete, view streak' }
  ),
  q(
    'What can you build in 4-6 weeks?',
    'Realistic scope given time constraints',
    { category: 'constraints', order: 4, placeholder: 'Single-platform mobile app with 3 core features' }
  ),
  q(
    'How will you validate success?',
    'What will prove the MVP works?',
    { category: 'vision', order: 5, placeholder: '100 users complete at least one 7-day streak' }
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Template Registry
// ─────────────────────────────────────────────────────────────────────────────

export const TEMPLATES: QuestionTemplate[] = [
  {
    id: 'comprehensive',
    name: 'Comprehensive',
    description: 'Complete coverage of vision, scope, technical, constraints, and risks',
    questions: comprehensiveQuestions,
    recommendedFor: ['new projects', 'complex initiatives', 'formal planning'],
  },
  {
    id: 'quick',
    name: 'Quick Start',
    description: 'Essential questions for well-defined projects',
    questions: quickQuestions,
    recommendedFor: ['simple projects', 'experienced users', 'time-constrained'],
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Focus on technical requirements and architecture',
    questions: technicalQuestions,
    recommendedFor: ['infrastructure', 'platform development', 'system design'],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Focus on business goals and success metrics',
    questions: businessQuestions,
    recommendedFor: ['product initiatives', 'executive stakeholders', 'ROI-focused'],
  },
  {
    id: 'mvp',
    name: 'MVP',
    description: 'Minimal viable product scoping',
    questions: mvpQuestions,
    recommendedFor: ['startups', 'prototypes', 'validation projects'],
  },
];

export function getTemplate(idOrName: string): QuestionTemplate | undefined {
  return TEMPLATES.find((t) => t.id === idOrName || t.name === idOrName);
}

export function getTemplateQuestions(name: string): Question[] | undefined {
  return getTemplate(name)?.questions;
}

export function listTemplates(): {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  estimatedTime: string;
  recommendedFor: string[];
}[] {
  return TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    questionCount: t.questions.length,
    estimatedTime: estimateTime(t.questions.length),
    recommendedFor: t.recommendedFor,
  }));
}

function estimateTime(questionCount: number): string {
  const minutes = questionCount * 2; // ~2 minutes per question
  if (minutes < 10) return '5-10 minutes';
  if (minutes < 20) return '10-20 minutes';
  if (minutes < 30) return '20-30 minutes';
  return '30-45 minutes';
}

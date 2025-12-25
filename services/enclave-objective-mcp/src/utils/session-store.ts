/**
 * Session Store
 *
 * In-memory storage for objective analysis sessions.
 */

import { randomUUID } from 'crypto';
import type {
  ObjectiveSession,
  SessionMode,
  SessionPhase,
  SessionStatus,
  Question,
  QuestionAnswer,
  ObjectiveSpec,
  AspenifyQuestion,
} from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Session Store
// ─────────────────────────────────────────────────────────────────────────────

const sessions = new Map<string, ObjectiveSession>();

export function createSession(params: {
  mode: SessionMode;
  template?: string;
  questions?: Question[];
}): ObjectiveSession {
  const session: ObjectiveSession = {
    id: randomUUID(),
    mode: params.mode,
    phase: 1,
    status: 'started',
    template: params.template,
    iteration: 0,
    questions: params.questions || [],
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): ObjectiveSession | undefined {
  return sessions.get(id);
}

export function updateSession(
  id: string,
  updates: Partial<ObjectiveSession>
): ObjectiveSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;

  const updated = {
    ...session,
    ...updates,
    updatedAt: new Date(),
  };

  sessions.set(id, updated);
  return updated;
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Session State Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function addAnswer(
  sessionId: string,
  questionId: string,
  question: string,
  answer: string,
  source: 'user' | 'aurora' | 'aspenify' = 'user'
): ObjectiveSession | undefined {
  const session = getSession(sessionId);
  if (!session) return undefined;

  const qa: QuestionAnswer = {
    questionId,
    question,
    answer,
    source,
  };

  return updateSession(sessionId, {
    answers: [...session.answers, qa],
  });
}

export function setDraftObjective(
  sessionId: string,
  objective: ObjectiveSpec
): ObjectiveSession | undefined {
  return updateSession(sessionId, {
    draftObjective: objective,
    status: 'phase1_complete',
  });
}

export function setFinalObjective(
  sessionId: string,
  objective: ObjectiveSpec
): ObjectiveSession | undefined {
  return updateSession(sessionId, {
    finalObjective: objective,
    status: 'complete',
  });
}

export function transitionToPhase2(
  sessionId: string,
  aspenifyQuestions: AspenifyQuestion[]
): ObjectiveSession | undefined {
  return updateSession(sessionId, {
    phase: 2,
    status: 'awaiting_input',
    aspenifyQuestions,
  });
}

export function incrementIteration(sessionId: string): ObjectiveSession | undefined {
  const session = getSession(sessionId);
  if (!session) return undefined;

  return updateSession(sessionId, {
    iteration: session.iteration + 1,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Query Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isPhase1Complete(session: ObjectiveSession): boolean {
  return session.status === 'phase1_complete' && !!session.draftObjective;
}

export function isComplete(session: ObjectiveSession): boolean {
  return session.status === 'complete' && !!session.finalObjective;
}

export function getNextStep(
  session: ObjectiveSession
): 'continue_phase1' | 'start_phase2' | 'ready_for_playbook' {
  if (session.status === 'complete') {
    return 'ready_for_playbook';
  }
  if (session.status === 'phase1_complete') {
    return 'start_phase2';
  }
  return 'continue_phase1';
}

export function getUnansweredQuestions(session: ObjectiveSession): Question[] {
  const answeredIds = new Set(session.answers.map((a) => a.questionId));
  return session.questions.filter((q) => !answeredIds.has(q.id));
}

export function getMandatoryUnanswered(session: ObjectiveSession): Question[] {
  const answeredIds = new Set(session.answers.map((a) => a.questionId));
  return session.questions.filter((q) => q.mandatory && !answeredIds.has(q.id));
}

export function clearSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Get the objective from a session (final if available, otherwise draft)
 */
export function getObjective(session: ObjectiveSession): ObjectiveSpec | undefined {
  return session.finalObjective || session.draftObjective;
}

/**
 * Session Store
 *
 * In-memory storage for reasoning sessions.
 * Could be extended to use Redis/SQLite for persistence.
 */

import { nanoid } from 'nanoid';
import type { ReasoningSession, AgentConfig, ReasoningMode, Exchange } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Session Store
// ─────────────────────────────────────────────────────────────────────────────

const sessions = new Map<string, ReasoningSession>();

export function createSession(params: {
  topic: string;
  context: string;
  agents: AgentConfig[];
  mode: ReasoningMode;
  maxIterations: number;
  qualityThreshold: number;
}): ReasoningSession {
  const id = `rs-${nanoid(12)}`;
  const threadId = `thread-${nanoid(12)}`;
  const now = new Date();

  const session: ReasoningSession = {
    id,
    threadId,
    topic: params.topic,
    context: params.context,
    agents: params.agents,
    mode: params.mode,
    maxIterations: params.maxIterations,
    qualityThreshold: params.qualityThreshold,
    currentIteration: 0,
    exchanges: [],
    currentQuality: 0,
    status: 'started',
    createdAt: now,
    updatedAt: now,
  };

  sessions.set(id, session);
  return session;
}

export function getSession(id: string): ReasoningSession | undefined {
  return sessions.get(id);
}

export function updateSession(id: string, updates: Partial<ReasoningSession>): ReasoningSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;

  const updated: ReasoningSession = {
    ...session,
    ...updates,
    updatedAt: new Date(),
  };

  sessions.set(id, updated);
  return updated;
}

export function addExchange(id: string, exchange: Exchange): ReasoningSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;

  session.exchanges.push(exchange);
  session.updatedAt = new Date();
  sessions.set(id, session);
  return session;
}

export function listSessions(): ReasoningSession[] {
  return Array.from(sessions.values());
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Cleanup (optional TTL)
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions.entries()) {
    if (now - session.updatedAt.getTime() > SESSION_TTL_MS) {
      sessions.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredSessions, 10 * 60 * 1000);

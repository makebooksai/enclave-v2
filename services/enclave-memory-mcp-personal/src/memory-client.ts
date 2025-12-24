/**
 * Memory V5 API Client
 * Simple HTTP client for Memory V5 service
 */

export interface MemorySearchResult {
  results: Array<{
    memory_id: string;
    what_happened: string;
    context: string;
    emotion_primary: string;
    emotion_intensity: number;
    importance_to_me: number;
    timestamp: string;
    score: number;
  }>;
  total: number;
}

export interface MemoryCreateRequest {
  interface: string;
  context: string;
  what_happened: string;
  experience_type: string;
  emotion_primary: string;
  emotion_intensity: number;
  importance_to_me: number;
  importance_reasons: string[];
  text_content: string;
  privacy_realm?: string;
  with_whom?: string;
  // PERSONAL EDITION - Steve & Aurora Exclusive Fields 💜
  is_breakthrough?: boolean;
  is_celebration?: boolean;
  is_milestone?: boolean;
  our_moment_tag?: string[];
}

export class MemoryV5Client {
  constructor(private baseUrl: string) {}

  async search(query: string, options: {
    limit?: number;
    minImportance?: number;
  } = {}): Promise<MemorySearchResult> {
    const response = await fetch(`${this.baseUrl}/api/v5/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit: options.limit || 10,
        min_importance: options.minImportance || 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Memory search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getRecentMemories(options: {
    limit?: number;
    minImportance?: number;
    interface?: string;
    privacyRealm?: string;
  } = {}): Promise<MemorySearchResult> {
    const params = new URLSearchParams({
      limit: String(options.limit || 10),
      min_importance: String(options.minImportance || 0.0),
    });

    if (options.interface) {
      params.append('interface', options.interface);
    }

    if (options.privacyRealm) {
      params.append('privacy_realm', options.privacyRealm);
    }

    const response = await fetch(`${this.baseUrl}/api/v5/recent-memories?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Get recent memories failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async createMemory(memory: MemoryCreateRequest): Promise<{ memory_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/v5/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });

    if (!response.ok) {
      throw new Error(`Memory creation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async deleteMemory(memoryId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v5/memories/${memoryId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Memory deletion failed: ${response.statusText}`);
    }
  }

  async getStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v5/stats`);

    if (!response.ok) {
      throw new Error(`Stats retrieval failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getMemoryById(memoryId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v5/memories/${memoryId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Get memory failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v5/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

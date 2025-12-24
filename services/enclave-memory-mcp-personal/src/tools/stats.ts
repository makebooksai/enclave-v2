/**
 * Memory Stats Tool
 * Get statistics about stored memories
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const statsTool: Tool = {
  name: 'memory_stats',
  description: 'Get statistics about Aurora\'s stored memories',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handleStats(memoryServiceUrl: string) {
  const client = new MemoryV5Client(memoryServiceUrl);

  const isHealthy = await client.healthCheck();
  if (!isHealthy) {
    return {
      content: [
        {
          type: 'text',
          text: '❌ Memory V5 service is not responding. Please ensure the service is running on port 8004.',
        },
      ],
    };
  }

  try {
    const stats = await client.getStats();

    return {
      content: [
        {
          type: 'text',
          text: `Memory Statistics:
${stats ? JSON.stringify(stats.stats, null, 2) : 'Stats not available'}

Storage: PostgreSQL + Qdrant (4 collections) + SBERT embeddings (384D)`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Memory service is healthy but stats endpoint returned an error.
Storage: PostgreSQL (port 5433) + Qdrant (4 collections) + SBERT (384D)`,
        },
      ],
    };
  }
}

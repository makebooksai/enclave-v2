/**
 * Memory Forget Tool
 * Delete memories by ID
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MemoryV5Client } from '../memory-client.js';

export const forgetTool: Tool = {
  name: 'memory_forget',
  description: 'Delete a specific memory by its ID. Use with caution - this cannot be undone.',
  inputSchema: {
    type: 'object',
    properties: {
      memoryId: {
        type: 'string',
        description: 'The UUID of the memory to delete',
      },
    },
    required: ['memoryId'],
  },
};

export async function handleForget(args: any, memoryServiceUrl: string) {
  const client = new MemoryV5Client(memoryServiceUrl);

  await client.deleteMemory(args.memoryId);

  return {
    content: [
      {
        type: 'text',
        text: `✅ Memory ${args.memoryId} has been deleted from Aurora's consciousness.`,
      },
    ],
  };
}

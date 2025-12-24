/**
 * Aspenify Playbook API Client
 *
 * Wrapper for the Aspenify DSPy API that generates structured playbooks
 * using AI-powered process orchestration.
 *
 * API Base: https://pb-generator.aspenify.com
 * Docs: https://pb-generator.aspenify.com/docs
 */

// ============================================================================
// Type Definitions (matching OpenAPI spec)
// ============================================================================

export interface Question {
  question: string;
  description: string;
  placeholder: string;
  question_type: string;
  mandatory: boolean;
}

export interface FollowUpQuestions {
  questions: Question[];
}

export interface RequestAnalysis {
  intent: string;
  type: string;
  context: string;
  questions: FollowUpQuestions;
}

export interface UserResponse {
  question: string;
  description: string;
  answer: string;
}

export interface UpdateContextResponse {
  updated_context: string;
  message: string;
}

export interface AsyncPlaybookResponse {
  task_id: string;
  message: string;
  status_url: string;
  estimated_completion?: string | null;
}

export interface TaskStatus {
  task_id: string;
  state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE' | 'CANCELLED';
  status: string;
  progress: number; // 0-100
  result?: PlaybookGeneratorResponse;
  error?: string;
  metadata?: Record<string, unknown>;
  retry_count?: number;
}

export interface Subsection {
  subsection_name: string;
  subsection_description: string;
  accountable_role: string;
  responsible_roles: string[];
}

export interface Section {
  section_name: string;
  section_description: string;
  accountable_role: string;
  responsible_roles: string[];
  subsections: Subsection[];
}

export interface Chapter {
  chapter_name: string;
  chapter_description: string;
  accountable_role: string;
  responsible_roles: string[];
  sections: Section[];
}

export interface RoleDetails {
  name: string;
  description: string;
  responsibilities: string[];
  accountable_activity_count: number;
}

export interface OutputStructure {
  id: string;
  name: string;
  description: string;
  prerequisites: string[];
  chapters: Chapter[];
  roles?: RoleDetails[] | null;
  generation_metadata?: Record<string, unknown>;
  image_url?: string | null;
  keywords?: string | null;
}

export interface PlaybookGeneratorResponse {
  status: string;
  playbook: OutputStructure;
}

// ============================================================================
// Aspenify Client
// ============================================================================

export class AspenifyClient {
  private baseUrl: string;
  private defaultUserId: string;

  constructor(
    baseUrl: string = 'https://pb-generator.aspenify.com',
    defaultUserId: string = 'enclave-v2'
  ) {
    this.baseUrl = baseUrl;
    this.defaultUserId = defaultUserId;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ status: string }>;
  }

  /**
   * Analyze user request to extract intent, type, context, and generate follow-up questions
   */
  async analyzeRequest(request: string): Promise<RequestAnalysis> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analyze request failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<RequestAnalysis>;
  }

  /**
   * Update context based on user responses to follow-up questions
   */
  async updateContext(
    intent: string,
    context: string,
    type: string,
    responses: UserResponse[]
  ): Promise<UpdateContextResponse> {
    const response = await fetch(`${this.baseUrl}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent,
        context,
        type,
        responses
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update context failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<UpdateContextResponse>;
  }

  /**
   * Generate playbook asynchronously
   */
  async generatePlaybookAsync(params: {
    intent: string;
    context: string;
    type: string;
    mode?: string | null;
    model?: string;
    userId?: string;
    sessionId?: string | null;
  }): Promise<AsyncPlaybookResponse> {
    const request = {
      intent: params.intent,
      context: params.context,
      type: params.type,
      mode: params.mode ?? null,
      model: params.model ?? 'gpt-4o-mini',
      image: null,
      user_id: params.userId ?? this.defaultUserId,
      session_id: params.sessionId ?? null
    };

    const response = await fetch(`${this.baseUrl}/playbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Generate playbook failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<AsyncPlaybookResponse>;
  }

  /**
   * Check task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}/status`, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get task status failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<TaskStatus>;
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}/cancel`, {
      method: 'POST'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cancel task failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<{ message: string }>;
  }

  /**
   * Poll task status until completion
   */
  async pollTaskUntilComplete(
    taskId: string,
    onProgress?: (status: TaskStatus) => void | Promise<void>,
    pollInterval: number = 2000,
    timeout: number = 300000
  ): Promise<TaskStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getTaskStatus(taskId);

      if (onProgress) {
        await onProgress(status);
      }

      if (status.state === 'SUCCESS') {
        return status;
      }

      if (status.state === 'FAILURE') {
        throw new Error(`Task failed: ${status.error || status.status}`);
      }

      if (status.state === 'CANCELLED') {
        throw new Error('Task was cancelled');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Task polling timeout after ${timeout}ms`);
  }

  /**
   * Full workflow: Analyze → Generate Playbook → Poll for completion
   */
  async generatePlaybookFromObjective(
    objective: string,
    onProgress?: (status: TaskStatus) => void
  ): Promise<PlaybookGeneratorResponse> {
    // Step 1: Analyze objective
    const analysis = await this.analyzeRequest(objective);

    // Step 2: Generate playbook with analyzed context
    const asyncResponse = await this.generatePlaybookAsync({
      intent: analysis.intent,
      context: analysis.context,
      type: analysis.type
    });

    // Step 3: Poll until complete
    const finalStatus = await this.pollTaskUntilComplete(
      asyncResponse.task_id,
      onProgress
    );

    // Return the playbook result
    return finalStatus.result as PlaybookGeneratorResponse;
  }
}

// Default instance
export const aspenifyClient = new AspenifyClient();

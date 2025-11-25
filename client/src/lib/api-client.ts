/**
 * API Client for Nielsen Sales Analytics Assistant.
 *
 * Provides typed HTTP client for backend API endpoints.
 */

import type {
  AskQuestionRequest,
  AskQuestionResponse,
  SuggestedQuestion,
} from '@/types/genie'
import type { ChatRequest, ChatResponse } from '@/types/claude'

const API_BASE_URL = '/api'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Genie API methods
  async askQuestion(
    request: AskQuestionRequest
  ): Promise<AskQuestionResponse> {
    return this.request<AskQuestionResponse>('/genie/ask', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getSuggestedQuestions(): Promise<SuggestedQuestion[]> {
    return this.request<SuggestedQuestion[]>('/genie/suggestions')
  }

  async cancelQuery(queryId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/genie/cancel/${queryId}`, {
      method: 'POST',
    })
  }

  async chatWithClaude(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/genie/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }
}

export const apiClient = new ApiClient()

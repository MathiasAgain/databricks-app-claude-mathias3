/**
 * Chat hook for conversational follow-ups with Claude
 */

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { ChatRequest, ChatResponse } from '@/types/claude'

export function useChat() {
  return useMutation({
    mutationFn: (request: ChatRequest) => apiClient.chatWithClaude(request),
  })
}

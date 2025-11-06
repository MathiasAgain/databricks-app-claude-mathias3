/**
 * React Query hooks for Genie API.
 *
 * Provides hooks for asking questions, getting suggestions,
 * and managing query state.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  AskQuestionRequest,
  AskQuestionResponse,
} from '@/types/genie'

const QUERY_KEYS = {
  suggestions: ['genie', 'suggestions'] as const,
  question: (question: string) => ['genie', 'question', question] as const,
}

/**
 * Hook to ask a natural language question.
 *
 * Uses mutation to handle question submission and caching of results.
 */
export function useAskQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AskQuestionRequest) =>
      apiClient.askQuestion(request),
    onSuccess: (data, variables) => {
      // Cache the result by question
      queryClient.setQueryData(
        QUERY_KEYS.question(variables.question),
        data
      )
    },
  })
}

/**
 * Hook to get suggested questions.
 *
 * Fetches predefined questions on component mount.
 */
export function useSuggestedQuestions() {
  return useQuery({
    queryKey: QUERY_KEYS.suggestions,
    queryFn: () => apiClient.getSuggestedQuestions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to cancel a running query.
 */
export function useCancelQuery() {
  return useMutation({
    mutationFn: (queryId: string) => apiClient.cancelQuery(queryId),
  })
}

/**
 * Hook to get a previously asked question from cache.
 *
 * Useful for displaying historical queries without re-executing.
 */
export function useCachedQuestion(question: string) {
  return useQuery<AskQuestionResponse>({
    queryKey: QUERY_KEYS.question(question),
    enabled: false, // Don't auto-fetch, only use cache
    staleTime: Infinity,
  })
}

/**
 * Hook to chat with Claude about query results.
 *
 * Use for conversational follow-ups that don'''t require new SQL queries.
 */
export function useChatWithClaude() {
  return useMutation({
    mutationFn: (request: import('@/types/claude').ChatRequest) =>
      apiClient.chatWithClaude(request),
  })
}

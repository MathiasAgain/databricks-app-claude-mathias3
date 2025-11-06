/**
 * React Query hooks for Dashboard API.
 *
 * Provides hooks for fetching dashboard configuration
 * and managing embed tokens.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { DashboardConfig } from '@/types/analytics'

const QUERY_KEYS = {
  config: ['dashboard', 'config'] as const,
}

/**
 * Hook to get dashboard configuration.
 *
 * Fetches dashboard URL and embed token for iframe rendering.
 */
export function useDashboardConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => apiClient.getDashboardConfig(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 25 * 60 * 1000, // Refetch every 25 minutes (before token expiry)
  })
}

/**
 * Hook to refresh dashboard token.
 *
 * Use this to get a new token when the current one is about to expire.
 */
export function useRefreshDashboardToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.refreshDashboardToken(),
    onSuccess: (data) => {
      // Update the dashboard config with new token
      queryClient.setQueryData<DashboardConfig>(
        QUERY_KEYS.config,
        (old) =>
          old
            ? {
                ...old,
                embedToken: data.token,
                expiresAt: data.expiresAt,
              }
            : old
      )
    },
  })
}

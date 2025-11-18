/**
 * Zustand store for managing query results and visualizations across tabs.
 *
 * This store enables sharing Genie query results between the Analytics page
 * and the Visualization page, allowing users to see AI-generated charts
 * based on their queries.
 */

import { create } from 'zustand'
import type { AskQuestionResponse, VisualizationSpec } from '../types'

// Re-export for convenience
export type { VisualizationSpec }

/**
 * Type alias for clarity
 */
export type EnhancedQueryResponse = AskQuestionResponse

interface QueryStore {
  // Current query response with visualization spec
  currentQuery: EnhancedQueryResponse | null

  // History of queries (for future enhancement)
  queryHistory: EnhancedQueryResponse[]

  // Actions
  setCurrentQuery: (query: EnhancedQueryResponse) => void
  clearCurrentQuery: () => void
  addToHistory: (query: EnhancedQueryResponse) => void
  clearHistory: () => void
}

/**
 * Global store for query results and visualizations.
 * Use this to share data between Analytics and Visualization pages.
 */
export const useQueryStore = create<QueryStore>((set) => ({
  currentQuery: null,
  queryHistory: [],

  setCurrentQuery: (query) => set({ currentQuery: query }),

  clearCurrentQuery: () => set({ currentQuery: null }),

  addToHistory: (query) => set((state) => ({
    queryHistory: [...state.queryHistory, query].slice(-10) // Keep last 10 queries
  })),

  clearHistory: () => set({ queryHistory: [] })
}))

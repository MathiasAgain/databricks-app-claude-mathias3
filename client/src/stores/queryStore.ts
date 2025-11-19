/**
 * Zustand store for managing query results and visualizations across tabs.
 *
 * This store enables sharing Genie query results between the Analytics page
 * and the Visualization page, allowing users to see AI-generated charts
 * based on their queries.
 *
 * Uses localStorage persistence to maintain state across page reloads.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AskQuestionResponse, VisualizationSpec } from "../types";

// Re-export for convenience
export type { VisualizationSpec };

/**
 * Type alias for clarity
 */
export type EnhancedQueryResponse = AskQuestionResponse;

/**
 * Conversation message type
 */
export interface ConversationMessage {
  role: string;
  content: string;
}

interface QueryStore {
  // Current query response with visualization spec
  currentQuery: EnhancedQueryResponse | null;

  // Conversation history for follow-up questions
  conversationHistory: ConversationMessage[];

  // History of queries (for future enhancement)
  queryHistory: EnhancedQueryResponse[];

  // Actions
  setCurrentQuery: (query: EnhancedQueryResponse) => void;
  clearCurrentQuery: () => void;
  setConversationHistory: (history: ConversationMessage[]) => void;
  addToConversation: (message: ConversationMessage) => void;
  clearConversationHistory: () => void;
  addToHistory: (query: EnhancedQueryResponse) => void;
  clearHistory: () => void;
}

/**
 * Global store for query results and visualizations.
 * Use this to share data between Analytics and Visualization pages.
 * Persists to localStorage to survive page reloads.
 */
export const useQueryStore = create<QueryStore>()(
  persist(
    (set) => ({
      currentQuery: null,
      conversationHistory: [],
      queryHistory: [],

      setCurrentQuery: (query) => set({ currentQuery: query }),

      clearCurrentQuery: () => set({ currentQuery: null }),

      setConversationHistory: (history) =>
        set({ conversationHistory: history }),

      addToConversation: (message) =>
        set((state) => ({
          conversationHistory: [...state.conversationHistory, message],
        })),

      clearConversationHistory: () => set({ conversationHistory: [] }),

      addToHistory: (query) =>
        set((state) => ({
          queryHistory: [...state.queryHistory, query].slice(-10), // Keep last 10 queries
        })),

      clearHistory: () => set({ queryHistory: [] }),
    }),
    {
      name: "genie-query-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

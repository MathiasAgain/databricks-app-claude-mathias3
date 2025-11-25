/**
 * App-specific type definitions for the Nielsen Sales Analytics Assistant.
 *
 * These types are used throughout the application for state management,
 * UI components, and business logic.
 */

import type { QueryResults } from './genie'

export interface QueryResult {
  sql: string
  results: QueryResults
  aiSummary: string
  suggestedFollowups: string[]
  executionTimeMs: number
  queryId: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  queryResults?: QueryResult
}

export interface AppState {
  // Query state
  currentQuery?: QueryResult
  queryHistory: QueryResult[]

  // Chat state
  messages: ChatMessage[]
  isTyping: boolean

  // UI state
  sidebarExpanded: boolean
  resultsExpanded: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  sidebarDefaultExpanded: boolean
  showSuggestedQuestions: boolean
}

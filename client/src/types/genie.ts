/**
 * Type definitions for Genie API integration.
 *
 * These types match the backend Pydantic models for
 * natural language query generation and execution.
 */

export interface QueryResults {
  columns: string[]
  rows: any[][]
  rowCount: number
  truncated?: boolean
}

export interface AskQuestionRequest {
  question: string
  context?: {
    conversationId?: string
    previousQueries?: any[]
  }
}

export interface AskQuestionResponse {
  question: string
  sql: string
  genieAnswer: string
  results: QueryResults
  aiSummary: string
  suggestedFollowups: string[]
  executionTimeMs: number
  queryId: string
}

export interface SuggestedQuestion {
  question: string
  category?: string
  description?: string
}

export type QueryState =
  | 'idle'
  | 'generating-sql'
  | 'executing'
  | 'success'
  | 'error'
  | 'cancelled'

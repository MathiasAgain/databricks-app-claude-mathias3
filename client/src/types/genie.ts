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

/**
 * Visualization specification from AI
 */
export interface VisualizationAxis {
  column: string
  label?: string
  type?: 'category' | 'linear' | 'time' | 'log'
}

export interface VisualizationAnnotation {
  text: string
  x?: number
  y?: number
}

export interface VisualizationSpec {
  chartType: string
  title?: string
  xAxis?: VisualizationAxis
  yAxis?: VisualizationAxis
  zAxis?: VisualizationAxis
  groupBy?: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  colors?: string[]
  annotations?: VisualizationAnnotation[]
  reasoning?: string
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
  visualizationSpec?: VisualizationSpec
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

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

/** Font configuration for chart elements */
export interface FontConfig {
  size?: number
  family?: string
  color?: string
  weight?: string
}

/** Enhanced axis configuration with styling */
export interface VisualizationAxis {
  column: string
  label?: string
  type?: 'category' | 'linear' | 'time' | 'log'
  range?: [number, number]
  tickFormat?: string
  showGrid?: boolean
  font?: FontConfig
}

/** Enhanced annotation configuration with advanced styling */
export interface VisualizationAnnotation {
  text: string
  x?: any
  y?: any
  xref?: string
  yref?: string
  font?: FontConfig
  showarrow?: boolean
  arrowhead?: number
  ax?: number
  ay?: number
  bgcolor?: string
  bordercolor?: string
}

/** Chart layout configuration */
export interface LayoutConfig {
  width?: number
  height?: number
  showlegend?: boolean
  legendPosition?: string
  margin?: {
    l?: number
    r?: number
    t?: number
    b?: number
  }
  titleFont?: FontConfig
}

/** Complete visualization specification */
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
  layout?: LayoutConfig
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

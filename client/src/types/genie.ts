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

/** Human-readable number format options */
export type NumberFormat = 'billions' | 'millions' | 'thousands' | 'percentage' | 'currency' | 'compact'

/** Enhanced axis configuration with styling */
export interface VisualizationAxis {
  column: string
  label?: string
  type?: 'category' | 'linear' | 'time' | 'log'
  range?: [number, number]
  tickFormat?: string
  /** Human-readable format: 'billions', 'millions', 'thousands', 'percentage', 'currency', 'compact' */
  numberFormat?: NumberFormat
  /** Number of decimal places (0-4) */
  decimals?: number
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

/** Data label configuration for showing values on chart */
export interface DataLabelConfig {
  show: boolean
  position?: 'auto' | 'inside' | 'outside' | 'top' | 'bottom'
  format?: string
  font?: FontConfig
}

/** Complete visualization specification
 *
 * Supports two modes:
 * 1. Structured mode: Use chartType, xAxis, yAxis, etc. for simple charts
 * 2. Raw Plotly mode: Use plotlyData and plotlyLayout for ANY Plotly feature
 *
 * When plotlyData/plotlyLayout are provided, they take precedence over
 * structured fields, allowing unlimited customization via natural language.
 */
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
  dataLabels?: DataLabelConfig
  reasoning?: string
  /** Raw Plotly trace data - when provided, used directly instead of structured fields */
  plotlyData?: Record<string, unknown>[]
  /** Raw Plotly layout - when provided, used directly instead of structured fields */
  plotlyLayout?: Record<string, unknown>
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

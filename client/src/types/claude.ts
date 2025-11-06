/**
 * Type definitions for Claude AI assistant integration.
 *
 * These types support chat, analysis, and error explanation features.
 */

import type { QueryResults } from './genie'

export interface ConversationContext {
  conversationHistory: Array<{
    role: string
    content: string
  }>
  currentQueryResults?: QueryResults
  dashboardState?: Record<string, any>
}

export interface ChatRequest {
  message: string
  context?: ConversationContext
}

export interface ChatResponse {
  message: string
  suggestedFollowups: string[]
  confidence: number
}

export interface AnalyzeRequest {
  queryResults: QueryResults
  querySql: string
}

export interface AnalysisResponse {
  insights: string[]
  anomalies: string[]
  recommendations: string[]
}

export interface ErrorExplanation {
  explanation: string
  suggestedRephrasings: string[]
  helpText?: string
}

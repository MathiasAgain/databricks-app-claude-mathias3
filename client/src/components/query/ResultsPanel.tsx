/**
 * Results Panel Component
 *
 * Displays query results with AI summary and follow-up questions.
 * Combines ResultsTable and AI insights in a unified panel.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResultsTable } from './ResultsTable'
import { ChatInterface } from './ChatInterface'
import type { AskQuestionResponse } from '@/types/genie'

interface ResultsPanelProps {
  result: AskQuestionResponse
  onFollowupClick?: (question: string) => void
}

export function ResultsPanel({ result, onFollowupClick }: ResultsPanelProps) {
  return (
    <div className="space-y-6 fade-in">
      {/* Question and Genie's Answer */}
      <Card className="border-2 border-secondary/30 shadow-xl bg-gradient-to-br from-card to-secondary/5">
        <CardHeader className="border-b border-secondary/10 bg-secondary/5">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-secondary">Your Question</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Original Question */}
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
            <p className="text-lg font-medium text-primary italic">"{result.question}"</p>
          </div>

          {/* Genie's Natural Language Answer */}
          {result.genieAnswer && (
            <div>
              <h4 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Genie's Answer
              </h4>
              <div className="p-4 bg-background/80 rounded-lg border border-muted">
                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{result.genieAnswer}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Summary - Enhanced Orkla Design */}
      <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="border-b border-primary/10 bg-primary/5">
          <CardTitle className="text-xl flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-primary">AI Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Summary */}
          <div className="mb-6 p-4 bg-background/80 rounded-lg border border-muted">
            <p className="text-base text-foreground leading-relaxed">{result.aiSummary}</p>
          </div>

          {/* Follow-up Questions */}
          {result.suggestedFollowups.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Suggested Follow-up Questions
              </h4>
              <div className="space-y-2">
                {result.suggestedFollowups.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left hover:bg-primary/10 hover:border-primary hover:text-primary transition-all smooth-transition border-2"
                    onClick={() => onFollowupClick?.(question)}
                  >
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-muted">
            <Badge variant="secondary" className="px-3 py-1 bg-primary text-white">
              <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {result.executionTimeMs}ms
            </Badge>
            <Badge variant="outline" className="px-3 py-1 border-2 border-secondary text-secondary">
              <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              {result.results.rowCount} rows
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <ResultsTable results={result.results} sql={result.sql} />

      {/* Chat Interface */}
      <ChatInterface queryResults={result.results} />
    </div>
  )
}

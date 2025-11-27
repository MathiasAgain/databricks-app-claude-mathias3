/**
 * Results Panel Component
 *
 * Clean, streamlined display of query results with AI insights.
 * Combines visualization, insights, and data in a unified panel.
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResultsTable } from './ResultsTable'
import { PlotlyChart } from '@/components/charts/PlotlyChart'
import { ChartEditor } from '@/components/charts/ChartEditor'
import type { AskQuestionResponse } from '@/types/genie'

interface ResultsPanelProps {
  result: AskQuestionResponse
  onFollowupClick?: (question: string) => void
  onEditChart?: (request: string) => void
  onNewQuery?: (question: string) => void
  isProcessing?: boolean
  isModifyingChart?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onResetChart?: () => void
  canUndo?: boolean
  canRedo?: boolean
  historyIndex?: number
  historyTotal?: number
  onSaveTemplate?: (spec: import('@/types/genie').VisualizationSpec, thumbnail?: string) => void
}

export function ResultsPanel({
  result,
  onFollowupClick,
  onEditChart,
  isModifyingChart,
  onUndo,
  onRedo,
  onResetChart,
  canUndo = false,
  canRedo = false,
  historyIndex = 0,
  historyTotal = 0,
  onSaveTemplate,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
        <div className="p-2 rounded-full bg-primary/10">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{result.question}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {result.executionTimeMs}ms
            </Badge>
            <Badge variant="outline" className="text-xs">
              {result.results.rowCount} rows
            </Badge>
          </div>
        </div>
      </div>

      {/* AI Answer */}
      <div className="p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-medium text-muted-foreground">AI Insights</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.aiSummary}</p>

        {/* Follow-up Suggestions - Compact Pills */}
        {result.suggestedFollowups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {result.suggestedFollowups.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => onFollowupClick?.(question)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors truncate max-w-[200px]"
                title={question}
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visualization Section */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Tab Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'chart'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Data
            </button>
          </div>

          {/* Chart Controls */}
          {activeTab === 'chart' && historyTotal > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-2">
                v{historyIndex}/{historyTotal}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo || isModifyingChart}
                className="h-7 w-7 p-0"
                title="Undo"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo || isModifyingChart}
                className="h-7 w-7 p-0"
                title="Redo"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetChart}
                disabled={historyIndex === 1 || isModifyingChart}
                className="h-7 px-2 text-xs"
                title="Reset"
              >
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'chart' ? (
            <>
              <PlotlyChart
                results={result.results}
                visualizationSpec={result.visualizationSpec}
                isModifying={isModifyingChart}
                onSaveTemplate={onSaveTemplate}
              />
              {/* Chart Editor - Compact */}
              {result.visualizationSpec && (
                <ChartEditor
                  onEditChart={onEditChart || (() => {})}
                  isModifying={isModifyingChart}
                  disabled={false}
                />
              )}
            </>
          ) : (
            <ResultsTable results={result.results} sql={result.sql} />
          )}
        </div>
      </div>
    </div>
  )
}

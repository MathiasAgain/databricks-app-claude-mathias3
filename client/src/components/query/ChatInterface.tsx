/**
 * Chat Interface Component
 *
 * Enables multi-turn conversations with Claude about query results
 * AND chart editing - all in one unified interface with shared context.
 *
 * Two modes:
 * - Analytics Mode: Ask Claude questions, get insights, new Genie queries
 * - Edit Chart Mode: Modify chart appearance (colors, type, labels, etc.)
 *
 * Both modes share full context (data + visualization) for intelligent responses.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { QueryResults, VisualizationSpec } from '@/types/genie'

type MessageMode = 'analytics' | 'edit-chart'

interface ChatInterfaceProps {
  queryResults: QueryResults
  visualizationSpec?: VisualizationSpec
  onSendMessage?: (message: string) => void
  onEditChart?: (request: string) => void
  onNewQuery?: (question: string) => void
  isProcessing?: boolean
  isModifyingChart?: boolean
}

// Quick action chips for Edit Chart mode
const quickActions = {
  colors: [
    { label: 'Blue', prompt: 'Change the chart colors to blue' },
    { label: 'Red', prompt: 'Change the chart colors to red' },
    { label: 'Green', prompt: 'Change the chart colors to green' },
    { label: 'Orange', prompt: 'Change the chart colors to orange' },
    { label: 'Purple', prompt: 'Change the chart colors to purple' },
  ],
  chartTypes: [
    { label: 'Bar', prompt: 'Convert to a bar chart' },
    { label: 'Line', prompt: 'Convert to a line chart' },
    { label: 'Pie', prompt: 'Convert to a pie chart' },
    { label: 'Area', prompt: 'Convert to an area chart' },
    { label: 'Scatter', prompt: 'Convert to a scatter plot' },
  ],
  styling: [
    { label: 'Add Labels', prompt: 'Add data labels to the chart' },
    { label: 'Hide Legend', prompt: 'Hide the legend' },
    { label: 'Show Grid', prompt: 'Show grid lines' },
    { label: 'Add Title', prompt: 'Add a descriptive title' },
  ],
}

export function ChatInterface({
  queryResults,
  visualizationSpec,
  onSendMessage,
  onEditChart,
  onNewQuery,
  isProcessing,
  isModifyingChart,
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [mode, setMode] = useState<MessageMode>('analytics')

  const isLoading = isProcessing || isModifyingChart

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return

    // Route based on mode
    if (mode === 'analytics') {
      // Analytics mode handles both follow-ups and new queries intelligently
      onSendMessage?.(inputMessage)
    } else {
      // Edit chart mode
      onEditChart?.(inputMessage)
    }

    setInputMessage('')
  }

  const handleQuickAction = (prompt: string) => {
    if (isLoading) return
    onEditChart?.(prompt)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Mode-specific UI content
  const modeConfig = {
    analytics: {
      title: 'Analytics & Questions',
      badge: 'Claude + Genie',
      badgeColor: 'bg-primary',
      placeholder: 'Ask about the data, request insights, or ask a new question...',
      examples: [
        '"What\'s the main trend here?" - Analytical insight',
        '"Which product performs best?" - Data question',
        '"Explain these anomalies" - Pattern analysis',
        '"Show me top 10 by revenue" - New Genie query',
      ],
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      ),
    },
    'edit-chart': {
      title: 'Edit Chart',
      badge: 'Visual Editor',
      badgeColor: 'bg-accent',
      placeholder: 'Describe how to change the chart appearance...',
      examples: [
        '"Make it blue" - Change colors',
        '"Show as pie chart" - Change type',
        '"Add labels to highest values" - Annotations',
        '"Make the title bigger" - Styling',
      ],
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      ),
    },
  }

  const config = modeConfig[mode]

  return (
    <Card className="border-2 border-accent/30 shadow-xl bg-gradient-to-br from-card to-accent/5">
      <CardHeader className="border-b border-accent/10 bg-accent/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mode === 'analytics' ? 'bg-primary' : 'bg-accent'}`}>
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {config.icon}
              </svg>
            </div>
            <span className={mode === 'analytics' ? 'text-primary' : 'text-accent'}>{config.title}</span>
            <Badge variant="secondary" className={`ml-2 ${config.badgeColor} text-white`}>
              {config.badge}
            </Badge>
          </CardTitle>

          {/* Mode Toggle - Two modes: Analytics & Edit Chart */}
          <div className="flex gap-1 bg-background/80 rounded-lg p-1 border border-muted">
            <Button
              variant={mode === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('analytics')}
              className="text-xs"
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Analytics
            </Button>
            <Button
              variant={mode === 'edit-chart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('edit-chart')}
              className="text-xs"
              disabled={!visualizationSpec}
              title={!visualizationSpec ? 'No chart to edit - run a query first' : 'Edit chart appearance'}
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
              Edit Chart
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Input Area */}
        <div className="space-y-4">
          {/* Quick Actions for Edit Chart Mode */}
          {mode === 'edit-chart' && visualizationSpec && (
            <div className="space-y-3 p-4 bg-accent/5 rounded-lg border border-accent/20">
              <p className="text-sm font-medium text-accent flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </p>

              {/* Colors */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground w-16">Colors:</span>
                {quickActions.colors.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isLoading}
                    className="text-xs h-7 px-2 hover:bg-accent/10 hover:border-accent"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Chart Types */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground w-16">Type:</span>
                {quickActions.chartTypes.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isLoading}
                    className="text-xs h-7 px-2 hover:bg-accent/10 hover:border-accent"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Styling */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground w-16">Style:</span>
                {quickActions.styling.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isLoading}
                    className="text-xs h-7 px-2 hover:bg-accent/10 hover:border-accent"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          <div className="p-4 bg-background/80 rounded-lg border border-muted">
            <p className="text-sm text-muted-foreground mb-3">
              {mode === 'edit-chart' ? '🎨' : '💡'} <strong>Try asking:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              {config.examples.map((example, index) => (
                <li key={index}>• {example}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={config.placeholder}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={`px-6 ${mode === 'edit-chart' ? 'bg-accent hover:bg-accent/90' : ''}`}
            >
              {isLoading ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </Button>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground text-center">
            Press Enter to send •{' '}
            {mode === 'analytics'
              ? 'Ask questions about the data or request new queries'
              : 'Chart updates will appear above'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

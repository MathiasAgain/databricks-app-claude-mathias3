/**
 * Chat Interface Component
 *
 * Enables multi-turn conversations with Claude about query results
 * AND new data queries with Genie - all in one unified interface.
 *
 * Two modes:
 * - Chat Mode: Ask Claude follow-up questions, request viz changes
 * - Query Mode: Ask Genie new data questions
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { QueryResults, VisualizationSpec } from '@/types/genie'

type MessageMode = 'chat' | 'query'

interface ChatInterfaceProps {
  queryResults: QueryResults
  visualizationSpec?: VisualizationSpec
  onSendMessage?: (message: string) => void
  onNewQuery?: (question: string) => void
  isProcessing?: boolean
}

export function ChatInterface({
  queryResults,
  visualizationSpec,
  onSendMessage,
  onNewQuery,
  isProcessing,
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [mode, setMode] = useState<MessageMode>('chat')

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isProcessing) return

    // Route based on mode
    if (mode === 'chat') {
      onSendMessage?.(inputMessage)
    } else {
      onNewQuery?.(inputMessage)
    }

    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Mode-specific UI content
  const modeConfig = {
    chat: {
      title: 'Ask Follow-up Questions',
      badge: 'AI Assistant',
      placeholder: 'Type your question or visualization request...',
      examples: [
        '"Make it blue" - Change chart colors',
        '"Show as pie chart" - Change chart type',
        '"Add labels to the highest points" - Add annotations',
        '"What\'s the trend?" - Ask analytical questions',
      ],
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      ),
    },
    query: {
      title: 'Ask New Data Query',
      badge: 'Genie',
      placeholder: 'Ask a new question about your data...',
      examples: [
        '"Show top 10 products by sales" - New data query',
        '"What were sales last quarter?" - Time-based query',
        '"Compare sales by region" - Comparison query',
        '"Show revenue trend for 2024" - Trend analysis',
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
  }

  const config = modeConfig[mode]

  return (
    <Card className="border-2 border-accent/30 shadow-xl bg-gradient-to-br from-card to-accent/5">
      <CardHeader className="border-b border-accent/10 bg-accent/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {config.icon}
              </svg>
            </div>
            <span className="text-accent">{config.title}</span>
            <Badge variant="secondary" className="ml-2">
              {config.badge}
            </Badge>
          </CardTitle>

          {/* Mode Toggle */}
          <div className="flex gap-2 bg-background/80 rounded-lg p-1 border border-muted">
            <Button
              variant={mode === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('chat')}
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Chat
            </Button>
            <Button
              variant={mode === 'query' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('query')}
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
              New Query
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Input Area */}
        <div className="space-y-4">
          <div className="p-4 bg-background/80 rounded-lg border border-muted">
            <p className="text-sm text-muted-foreground mb-3">
              💡 <strong>Try asking:</strong>
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
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              className="px-6"
            >
              {isProcessing ? (
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
            {mode === 'chat'
              ? 'Visualization updates appear in the AI Insights section above'
              : 'New query results will replace current data'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

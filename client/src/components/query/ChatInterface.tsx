/**
 * Chat Interface Component
 *
 * Enables multi-turn conversations with Claude about query results.
 * Focused on analytics, insights, and follow-up questions.
 *
 * For chart editing, use the ChartEditor component on the visualization card.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { QueryResults } from '@/types/genie'

interface ChatInterfaceProps {
  queryResults: QueryResults
  onSendMessage?: (message: string) => void
  onNewQuery?: (question: string) => void
  isProcessing?: boolean
}

export function ChatInterface({
  queryResults: _queryResults,
  onSendMessage,
  onNewQuery: _onNewQuery,
  isProcessing = false,
}: ChatInterfaceProps) {
  // Note: queryResults and onNewQuery are available for future use
  void _queryResults
  void _onNewQuery

  const [inputMessage, setInputMessage] = useState('')

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isProcessing) return
    onSendMessage?.(inputMessage)
    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const examples = [
    '"What\'s the main trend here?" - Analytical insight',
    '"Which product performs best?" - Data question',
    '"Explain these anomalies" - Pattern analysis',
    '"Show me top 10 by revenue" - New Genie query',
  ]

  return (
    <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="border-b border-primary/10 bg-primary/5">
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary">
            <svg
              className="w-5 h-5 text-white"
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
          </div>
          <span className="text-primary">Analytics & Questions</span>
          <Badge variant="secondary" className="ml-2 bg-primary text-white">
            Claude + Genie
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Examples */}
          <div className="p-4 bg-background/80 rounded-lg border border-muted">
            <p className="text-sm text-muted-foreground mb-3">
              <strong>Try asking:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              {examples.map((example, index) => (
                <li key={index}>- {example}</li>
              ))}
            </ul>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ask about the data, request insights, or ask a new question..."
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
            Press Enter to send - Ask questions about the data or request new queries
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

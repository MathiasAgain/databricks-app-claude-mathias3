/**
 * Chat Interface Component
 *
 * Enables multi-turn conversations with Claude about query results.
 * Users can ask follow-up questions, request visualizations changes,
 * and get context-aware responses that update the visualization.
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
  isProcessing?: boolean
}

export function ChatInterface({ queryResults, onSendMessage, isProcessing }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('')

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isProcessing) return

    // Call the parent handler which updates visualizations and manages conversation
    onSendMessage?.(inputMessage)
    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="border-2 border-accent/30 shadow-xl bg-gradient-to-br from-card to-accent/5">
      <CardHeader className="border-b border-accent/10 bg-accent/5">
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="p-2 bg-accent rounded-lg">
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <span className="text-accent">Ask Follow-up Questions</span>
          <Badge variant="secondary" className="ml-auto">
            AI Assistant
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Input Area */}
        <div className="space-y-4">
          <div className="p-4 bg-background/80 rounded-lg border border-muted">
            <p className="text-sm text-muted-foreground mb-3">
              💡 <strong>Try asking:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• "Make it blue" - Change chart colors</li>
              <li>• "Show as pie chart" - Change chart type</li>
              <li>• "Add labels to the highest points" - Add annotations</li>
              <li>• "What's the trend?" - Ask analytical questions</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Type your question or visualization request..."
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
            Press Enter to send • Visualization updates appear in the AI Insights section above
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

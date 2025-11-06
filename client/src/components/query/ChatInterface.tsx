/**
 * Chat Interface Component
 *
 * Enables multi-turn conversations with Claude about query results.
 * Users can ask follow-up questions and get context-aware responses.
 */

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useChat } from '@/hooks/useChat'
import type { ConversationContext, ChatResponse } from '@/types/claude'
import type { QueryResults } from '@/types/genie'

interface ChatInterfaceProps {
  queryResults: QueryResults
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatInterface({ queryResults }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { mutate: sendChat, isPending } = useChat()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isPending) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    }

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')

    // Build conversation context
    const context: ConversationContext = {
      conversationHistory: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      currentQueryResults: queryResults,
    }

    // Send chat request
    sendChat(
      { message: inputMessage, context },
      {
        onSuccess: (response: ChatResponse) => {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        },
        onError: (error) => {
          console.error('Chat error:', error)
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: "I'm sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        },
      }
    )
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
          <span className="text-accent">Chat with Claude</span>
          <Badge variant="secondary" className="ml-auto">
            AI Assistant
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Chat Messages */}
        <div className="h-[400px] overflow-y-auto mb-4 space-y-4 p-4 bg-background/50 rounded-lg border border-muted">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-16">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="font-medium">Start a conversation about your data</p>
              <p className="text-sm mt-1">
                Ask follow-up questions or request deeper insights
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground border border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.role === 'assistant' && (
                    <svg
                      className="w-4 h-4 text-accent"
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
                  )}
                  <span className="text-xs opacity-75">
                    {message.role === 'user' ? 'You' : 'Claude'}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {isPending && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-accent rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-accent rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Claude is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask Claude about the results..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isPending}
            className="px-6"
          >
            {isPending ? (
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
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send • Claude remembers the context of this conversation
        </p>
      </CardContent>
    </Card>
  )
}

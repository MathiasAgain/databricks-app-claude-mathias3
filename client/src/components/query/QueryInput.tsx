/**
 * Query Input Component
 *
 * Natural language question input with submit functionality.
 * Displays loading state and handles question submission.
 */

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAskQuestion } from '@/hooks/useGenie'
import type { AskQuestionResponse } from '@/types/genie'

interface QueryInputProps {
  onQueryComplete?: (result: AskQuestionResponse) => void
  disabled?: boolean
}

export function QueryInput({ onQueryComplete, disabled }: QueryInputProps) {
  const [question, setQuestion] = useState('')
  const [loadingStage, setLoadingStage] = useState(0)
  const { mutate: askQuestion, isPending } = useAskQuestion()

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (!question.trim() || isPending) return

    // Reset loading stage
    setLoadingStage(0)

    // Simulate loading stages (Genie takes 15-20 seconds)
    if (!isPending) {
      setTimeout(() => setLoadingStage(1), 2000)  // "Generating SQL..."
      setTimeout(() => setLoadingStage(2), 7000)  // "Executing query..."
      setTimeout(() => setLoadingStage(3), 13000) // "Analyzing results..."
    }

    askQuestion(
      { question: question.trim() },
      {
        onSuccess: (data) => {
          setLoadingStage(0)
          onQueryComplete?.(data)
          setQuestion('') // Clear input after successful query
        },
        onError: (error) => {
          setLoadingStage(0)
          console.error('Query failed:', error)
        },
      }
    )
  }, [question, isPending, askQuestion, onQueryComplete])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as React.FormEvent)
    }
  }, [handleSubmit])

  const loadingMessages = [
    'Processing your question...',
    'Generating SQL query...',
    'Executing query...',
    'Analyzing results with AI...'
  ]

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-3 w-full">
        <Input
          type="text"
          placeholder="Ask a question about your sales data..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending || disabled}
          className="flex-1 border-2 focus:border-primary transition-colors"
        />
        <Button
          type="submit"
          disabled={!question.trim() || isPending || disabled}
          className="bg-primary hover:bg-secondary transition-all smooth-transition px-6"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing
            </span>
          ) : (
            'Ask'
          )}
        </Button>
      </form>

      {/* Loading Progress Indicator */}
      {isPending && (
        <div className="fade-in">
          <div className="bg-muted/50 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="pulse-subtle">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">
                  {loadingMessages[loadingStage]}
                </p>
                <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-1000 ease-out"
                    style={{
                      width: `${(loadingStage + 1) * 25}%`,
                      transition: 'width 1s ease-out'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

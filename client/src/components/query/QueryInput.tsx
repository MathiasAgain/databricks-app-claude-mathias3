/**
 * Query Input Component
 *
 * Clean, focused question input with loading feedback.
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
  const { mutate: askQuestion, isPending } = useAskQuestion()

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isPending) return

    askQuestion(
      { question: question.trim() },
      {
        onSuccess: (data) => {
          onQueryComplete?.(data)
          setQuestion('')
        },
        onError: (error) => console.error('Query failed:', error),
      }
    )
  }, [question, isPending, askQuestion, onQueryComplete])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as React.FormEvent)
    }
  }, [handleSubmit])

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Ask a question about your data..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending || disabled}
            className="pr-4 h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={!question.trim() || isPending || disabled}
          className="h-11 px-6"
        >
          {isPending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            'Ask'
          )}
        </Button>
      </div>

      {/* Loading State */}
      {isPending && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Processing your question...</span>
        </div>
      )}
    </form>
  )
}

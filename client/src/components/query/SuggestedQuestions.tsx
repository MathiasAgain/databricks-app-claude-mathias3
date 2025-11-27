/**
 * Suggested Questions Component
 *
 * Clean, compact list of clickable question suggestions.
 */

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useSuggestedQuestions, useAskQuestion } from '@/hooks/useGenie'
import type { AskQuestionResponse } from '@/types/genie'

interface SuggestedQuestionsProps {
  onQuestionSelect?: (result: AskQuestionResponse) => void
}

export function SuggestedQuestions({ onQuestionSelect }: SuggestedQuestionsProps) {
  const { data: suggestions, isLoading } = useSuggestedQuestions()
  const { mutate: askQuestion, isPending } = useAskQuestion()
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)

  const handleQuestionClick = (question: string) => {
    setActiveQuestion(question)
    askQuestion(
      { question },
      {
        onSuccess: (data) => {
          setActiveQuestion(null)
          onQuestionSelect?.(data)
        },
        onError: () => setActiveQuestion(null),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground mb-3">Suggestions</p>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Quick Start</p>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleQuestionClick(suggestion.question)}
            disabled={isPending}
            className={`w-full text-left p-3 text-sm rounded-lg border transition-all ${
              activeQuestion === suggestion.question
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-card hover:bg-muted/50 hover:border-muted-foreground/20'
            } ${isPending && activeQuestion !== suggestion.question ? 'opacity-50' : ''}`}
          >
            <span className="line-clamp-2">{suggestion.question}</span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isPending && activeQuestion && (
        <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-accent animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs text-accent">Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}

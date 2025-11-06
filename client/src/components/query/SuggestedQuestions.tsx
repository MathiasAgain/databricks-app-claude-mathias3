/**
 * Suggested Questions Component
 *
 * Displays predefined questions as clickable buttons.
 * Clicking a suggestion automatically submits the query.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSuggestedQuestions, useAskQuestion } from '@/hooks/useGenie'
import type { AskQuestionResponse } from '@/types/genie'

interface SuggestedQuestionsProps {
  onQuestionSelect?: (result: AskQuestionResponse) => void
}

export function SuggestedQuestions({
  onQuestionSelect,
}: SuggestedQuestionsProps) {
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
        onError: () => {
          setActiveQuestion(null)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="border-b border-primary/10 bg-primary/5">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 border-2 hover:bg-primary/10 hover:border-primary hover:text-primary transition-all smooth-transition group whitespace-normal"
              onClick={() => handleQuestionClick(suggestion.question)}
              disabled={isPending}
            >
              <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm leading-relaxed">{suggestion.question}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Loading Indicator */}
      {isPending && activeQuestion && (
        <Card className="border-2 border-accent/50 shadow-lg bg-gradient-to-br from-accent/5 to-secondary/5 fade-in">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 pulse-subtle">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">
                    Processing Question
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    "{activeQuestion}"
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Generating answer...</p>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent via-primary to-secondary animate-pulse" style={{ width: '70%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

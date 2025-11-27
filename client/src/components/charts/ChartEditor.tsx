/**
 * ChartEditor Component - Natural language chart modification
 *
 * Compact, intuitive interface for editing charts using natural language.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChartEditorProps {
  onEditChart: (request: string) => void
  isModifying?: boolean
  disabled?: boolean
}

// Quick actions - simplified
const quickActions = [
  { label: 'Bar', prompt: 'Convert to a bar chart' },
  { label: 'Line', prompt: 'Convert to a line chart' },
  { label: 'Pie', prompt: 'Convert to a pie chart' },
  { label: 'Labels', prompt: 'Add data labels' },
]

const colorActions = [
  { color: '#3b82f6', prompt: 'Change colors to blue' },
  { color: '#10b981', prompt: 'Change colors to green' },
  { color: '#f97316', prompt: 'Change colors to orange' },
  { color: '#a855f7', prompt: 'Change colors to purple' },
]

export function ChartEditor({ onEditChart, isModifying = false, disabled = false }: ChartEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const handleQuickAction = (prompt: string) => {
    if (isModifying || disabled) return
    onEditChart(prompt)
  }

  const handleSubmit = () => {
    if (!inputValue.trim() || isModifying || disabled) return
    onEditChart(inputValue)
    setInputValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t mt-4" data-testid="chart-editor">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-muted-foreground">Edit with AI</span>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Input */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Describe changes... (e.g., 'show in billions')"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isModifying}
              className="flex-1 h-9 text-sm"
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isModifying}
              size="sm"
              className="h-9 px-3"
            >
              {isModifying ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                'Apply'
              )}
            </Button>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Chart type buttons */}
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.prompt)}
                disabled={isModifying}
                className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}

            {/* Divider */}
            <span className="w-px h-4 bg-border" />

            {/* Color buttons */}
            {colorActions.map((action) => (
              <button
                key={action.color}
                onClick={() => handleQuickAction(action.prompt)}
                disabled={isModifying}
                className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform disabled:opacity-50"
                style={{ backgroundColor: action.color }}
                title={action.prompt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * ChartEditor Component - Natural language chart modification
 *
 * Provides an intuitive interface for editing charts using natural language.
 * Placed directly next to the chart for immediate visual feedback.
 *
 * Features:
 * - Collapsible edit panel
 * - Quick action chips for common modifications
 * - Natural language text input
 * - Visual feedback during modifications
 *
 * @version 1.0.1 - Added to visualization card
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface ChartEditorProps {
  onEditChart: (request: string) => void
  isModifying?: boolean
  disabled?: boolean
}

// Quick action presets
const quickActions = {
  colors: [
    { label: 'Blue', prompt: 'Change the chart colors to blue', color: '#3b82f6' },
    { label: 'Red', prompt: 'Change the chart colors to red', color: '#ef4444' },
    { label: 'Green', prompt: 'Change the chart colors to green', color: '#10b981' },
    { label: 'Orange', prompt: 'Change the chart colors to orange', color: '#f97316' },
    { label: 'Purple', prompt: 'Change the chart colors to purple', color: '#a855f7' },
  ],
  chartTypes: [
    { label: 'Bar', prompt: 'Convert to a bar chart', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { label: 'Line', prompt: 'Convert to a line chart', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
    { label: 'Pie', prompt: 'Convert to a pie chart', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' },
    { label: 'Area', prompt: 'Convert to an area chart', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { label: 'Scatter', prompt: 'Convert to a scatter plot', icon: 'M7 7h.01M7 17h.01M17 7h.01M17 17h.01M12 12h.01' },
  ],
  styling: [
    { label: 'Add Labels', prompt: 'Add data labels to the chart' },
    { label: 'Hide Legend', prompt: 'Hide the legend' },
    { label: 'Show Grid', prompt: 'Show grid lines' },
    { label: 'Bigger Title', prompt: 'Make the title bigger' },
  ],
}

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

  if (disabled) {
    return null
  }

  return (
    <div className="border-t border-accent/20 bg-gradient-to-r from-accent/5 to-transparent" data-testid="chart-editor">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent rounded-md">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          <span className="font-medium text-accent">Edit Chart</span>
          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-0">
            Natural Language
          </Badge>
        </div>
        <svg
          className={`w-5 h-5 text-accent transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Edit Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Natural Language Input */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Describe how you want to change the chart..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isModifying}
              className="flex-1 border-accent/30 focus:border-accent"
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isModifying}
              className="bg-accent hover:bg-accent/90 px-4"
            >
              {isModifying ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            {/* Colors */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Colors</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.colors.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isModifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-full hover:border-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: action.color }}
                    />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Types */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Chart Type</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.chartTypes.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isModifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-full hover:border-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                    </svg>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Styling */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Styling</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.styling.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isModifying}
                    className="px-3 py-1.5 text-xs font-medium border border-border rounded-full hover:border-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="font-medium mb-1">Tips:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>"Make the bars yellow and add labels"</li>
              <li>"Show this as a pie chart with percentages"</li>
              <li>"Increase the title font size to 24"</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

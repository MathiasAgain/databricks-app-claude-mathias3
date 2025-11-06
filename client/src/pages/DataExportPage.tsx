/**
 * Data Export Page - Custom query export interface
 *
 * Allows users to ask for data and export results to CSV.
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { ResultsTable } from '@/components/query/ResultsTable'
import { useAskQuestion } from '@/hooks/useGenie'
import type { AskQuestionResponse } from '@/types/genie'

export default function DataExportPage() {
  const [query, setQuery] = useState('')
  const [currentResult, setCurrentResult] = useState<AskQuestionResponse | null>(null)
  const { mutate: askQuestion, isPending } = useAskQuestion()

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!query.trim()) return

      askQuestion(
        { question: query },
        {
          onSuccess: (data) => {
            setCurrentResult(data)
          },
        }
      )
    },
    [query, askQuestion]
  )

  const handleExportCSV = useCallback(() => {
    if (!currentResult?.results) return

    // Convert results to CSV format
    const { columns, rows } = currentResult.results

    // Create CSV header
    const csvHeader = columns.join(',')

    // Create CSV rows
    const csvRows = rows.map((row) =>
      row.map((cell) => {
        // Handle values that might contain commas or quotes
        const value = cell === null || cell === undefined ? '' : String(cell)
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )

    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `export_${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [currentResult])

  return (
    <div className="space-y-6">
      {/* Query Input Card */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
          <CardTitle className="text-xl flex items-center gap-2 text-primary">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Data Export
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="query-input" className="text-sm font-medium text-foreground">
                Describe the data you want to export:
              </label>
              <Input
                id="query-input"
                type="text"
                placeholder="e.g., Show me all sales data for Q4 2024"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-base"
                disabled={isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={!query.trim() || isPending}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Query...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Generate Data
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Alert */}
      {!currentResult && (
        <Alert className="border-accent/50 bg-accent/5">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="ml-2 text-sm">
            Describe the data you want in natural language, and we'll generate the query and prepare it for export.
          </p>
        </Alert>
      )}

      {/* Results and Export */}
      {currentResult && (
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-accent/5 to-secondary/5 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Query Results ({currentResult.results.rowCount} rows)
              </CardTitle>
              <Button
                onClick={handleExportCSV}
                className="bg-gradient-to-r from-accent to-secondary hover:opacity-90"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Generated SQL */}
            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">
                Generated SQL:
              </p>
              <code className="text-sm font-mono block bg-background p-3 rounded border overflow-x-auto">
                {currentResult.sql}
              </code>
            </div>

            {/* Results Table */}
            <div className="border rounded-lg overflow-hidden">
              <ResultsTable results={currentResult.results} />
            </div>

            {/* Export Info */}
            <Alert className="border-accent/50 bg-accent/5">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="ml-2 text-sm">
                Data ready for export. Click "Download CSV" to save the results to your computer.
              </p>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

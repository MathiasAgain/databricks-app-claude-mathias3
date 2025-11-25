/**
 * Chart Gallery Page - Manage and Browse Charts
 *
 * A comprehensive gallery for managing chart visualizations including:
 * - Current active chart from Analytics
 * - Recent charts from query history
 * - Saved chart templates
 *
 * Features:
 * - View current visualization
 * - Browse recent charts
 * - Manage saved templates
 * - Apply templates to current data
 * - Delete templates
 */

import { useMemo } from 'react'
import { useQueryStore } from '@/stores/queryStore'
import { useChartHistoryStore, type ChartTemplate } from '@/stores/chartHistoryStore'
import { PlotlyChart } from '@/components/charts/PlotlyChart'
import { getVisualizationOrFallback } from '@/utils/chartRecommendations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function VisualizationPage() {
  const currentQuery = useQueryStore((state) => state.currentQuery)
  const queryHistory = useQueryStore((state) => state.queryHistory)
  const setCurrentQuery = useQueryStore((state) => state.setCurrentQuery)

  const templates = useChartHistoryStore((state) => state.templates)
  const deleteTemplate = useChartHistoryStore((state) => state.deleteTemplate)
  const applyTemplate = useChartHistoryStore((state) => state.applyTemplate)

  // Get visualization spec (AI-provided or fallback)
  const visualizationSpec = useMemo(() => {
    if (!currentQuery) return null

    return getVisualizationOrFallback(
      currentQuery.visualizationSpec,
      currentQuery.results,
      currentQuery.question
    )
  }, [currentQuery])

  // Handle applying a template to current data
  const handleApplyTemplate = (templateId: string) => {
    if (!currentQuery) return
    const spec = applyTemplate(templateId)
    if (spec) {
      setCurrentQuery({
        ...currentQuery,
        visualizationSpec: spec,
      })
    }
  }

  // Handle deleting a template
  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate(templateId)
  }

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chart Gallery</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse recent charts and manage saved templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {queryHistory.length} Recent Charts
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {templates.length} Templates
          </Badge>
        </div>
      </div>

      {/* Current Visualization */}
      {currentQuery && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="border-b border-primary/10 bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-primary">Current Chart</span>
              <Badge variant="secondary" className="ml-auto">Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              <strong>Query:</strong> {currentQuery.question}
            </p>
            <PlotlyChart
              results={currentQuery.results}
              visualizationSpec={visualizationSpec || undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Saved Templates Section */}
      <Card className="border-2 border-accent/20">
        <CardHeader className="border-b border-accent/10 bg-accent/5">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <span className="text-accent">Saved Templates</span>
            <Badge variant="outline" className="ml-auto">{templates.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Templates Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Save a chart configuration from the Analytics tab to create a reusable template.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template: ChartTemplate) => (
                <div
                  key={template.id}
                  className="border border-border rounded-lg p-4 hover:border-accent/50 transition-colors group"
                >
                  {/* Template Thumbnail */}
                  <div className="aspect-video bg-muted rounded-md mb-3 overflow-hidden flex items-center justify-center">
                    {template.thumbnail ? (
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                  </div>

                  {/* Template Info */}
                  <h4 className="font-medium text-foreground truncate">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{template.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(template.createdAt)}
                  </p>

                  {/* Template Actions */}
                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyTemplate(template.id)}
                      disabled={!currentQuery}
                      className="flex-1 text-xs"
                    >
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Charts Section */}
      <Card className="border-2 border-secondary/20">
        <CardHeader className="border-b border-secondary/10 bg-secondary/5">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-secondary">Recent Charts</span>
            <Badge variant="outline" className="ml-auto">{queryHistory.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {queryHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Recent Charts</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Ask questions in the Analytics tab to generate charts. Your recent charts will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queryHistory.slice(-6).reverse().map((query, index) => (
                <div
                  key={query.queryId || index}
                  className="border border-border rounded-lg p-4 hover:border-secondary/50 transition-colors cursor-pointer"
                  onClick={() => setCurrentQuery(query)}
                >
                  {/* Chart Type Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {query.visualizationSpec?.chartType || 'chart'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {query.executionTimeMs}ms
                    </span>
                  </div>

                  {/* Query Question */}
                  <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                    {query.question}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{query.results.rowCount} rows</span>
                    <span>{query.results.columns.length} cols</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty State when no current query */}
      {!currentQuery && queryHistory.length === 0 && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
            <svg
              className="w-16 h-16 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-2">
            Start Exploring Data
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            Ask questions in the Analytics tab to generate visualizations.
            Save your favorite chart configurations as templates.
          </p>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Interactive charts with zoom, pan, and export
            </p>
            <p className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save templates for quick reuse
            </p>
            <p className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Edit charts with natural language
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

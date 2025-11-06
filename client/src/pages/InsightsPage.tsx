/**
 * Insights Page - Dynamic visualizations with AI analysis and annotations
 *
 * Features:
 * - AI-recommended chart types based on data
 * - Interactive visualizations with Recharts (Bar, Line, Pie, Scatter, Area, Radar)
 * - Export charts as PNG images
 * - LLM-powered chart styling suggestions
 * - Comments and annotations system
 * - Follow-up actions tracking
 */

import { useState, useCallback, useRef } from 'react'
import html2canvas from 'html2canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useAskQuestion } from '@/hooks/useGenie'
import type { AskQuestionResponse } from '@/types/genie'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Annotation {
  id: string
  text: string
  timestamp: string
  type: 'comment' | 'action' | 'insight'
}

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'radar'

const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function InsightsPage() {
  const [query, setQuery] = useState('')
  const [currentResult, setCurrentResult] = useState<AskQuestionResponse | null>(null)
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartColors, setChartColors] = useState<string[]>(DEFAULT_COLORS)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [newAnnotation, setNewAnnotation] = useState('')
  const [annotationType, setAnnotationType] = useState<'comment' | 'action' | 'insight'>('comment')
  const [styleSuggestion, setStyleSuggestion] = useState<string>('')
  const chartRef = useRef<HTMLDivElement>(null)
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
            // Auto-recommend chart type based on data
            if (data.results.columns.length === 2 && data.results.rowCount <= 10) {
              setChartType('pie')
            } else if (data.results.columns.some((col) => col.toLowerCase().includes('date') || col.toLowerCase().includes('month') || col.toLowerCase().includes('time'))) {
              setChartType('area')
            } else if (data.results.columns.length >= 3) {
              setChartType('scatter')
            } else {
              setChartType('bar')
            }

            // Generate AI style suggestion
            generateStyleSuggestion(data)
          },
        }
      )
    },
    [query, askQuestion]
  )

  const generateStyleSuggestion = (data: AskQuestionResponse) => {
    // AI-powered styling suggestion based on data characteristics
    const rowCount = data.results.rowCount
    const colCount = data.results.columns.length

    let suggestion = ''
    if (rowCount > 20) {
      suggestion = 'Consider using an Area chart for better trend visualization with this large dataset'
    } else if (colCount > 3) {
      suggestion = 'Scatter plot recommended to show relationships between multiple variables'
    } else if (rowCount <= 8) {
      suggestion = 'Pie chart works well for comparing these few categories'
    } else {
      suggestion = 'Bar chart provides clear comparison across categories'
    }

    setStyleSuggestion(suggestion)
  }

  const handleExportChart = useCallback(async () => {
    if (!chartRef.current) return

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
      })

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `chart_${Date.now()}.png`
        link.click()
        URL.revokeObjectURL(url)
      })
    } catch (error) {
      console.error('Failed to export chart:', error)
    }
  }, [])

  const handleAddAnnotation = useCallback(() => {
    if (!newAnnotation.trim()) return

    const annotation: Annotation = {
      id: Date.now().toString(),
      text: newAnnotation,
      timestamp: new Date().toLocaleString(),
      type: annotationType,
    }

    setAnnotations([...annotations, annotation])
    setNewAnnotation('')
  }, [newAnnotation, annotationType, annotations])

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      setAnnotations(annotations.filter((a) => a.id !== id))
    },
    [annotations]
  )

  const changeColorScheme = useCallback((scheme: 'default' | 'warm' | 'cool' | 'pastel') => {
    const schemes = {
      default: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'],
      warm: ['#FF6B6B', '#FFA500', '#FFD700', '#FF69B4', '#FF4500', '#DC143C'],
      cool: ['#4A90E2', '#50C878', '#00CED1', '#4169E1', '#6A5ACD', '#20B2AA'],
      pastel: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFD8B8', '#E0BBE4'],
    }
    setChartColors(schemes[scheme])
  }, [])

  // Transform query results for charts
  const chartData = currentResult?.results.rows.map((row, index) => {
    const obj: Record<string, any> = { name: row[0] || `Item ${index + 1}` }
    currentResult.results.columns.slice(1).forEach((col, i) => {
      obj[col] = parseFloat(row[i + 1] as string) || 0
    })
    return obj
  }) || []

  const renderChart = () => {
    if (!currentResult || chartData.length === 0) return null

    const dataKeys = currentResult.results.columns.slice(1)

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  fill={chartColors[index % chartColors.length]}
                  stroke={chartColors[index % chartColors.length]}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis type="number" dataKey={dataKeys[0]} name={dataKeys[0]} />
              <YAxis type="number" dataKey={dataKeys[1] || dataKeys[0]} name={dataKeys[1] || dataKeys[0]} />
              <ZAxis range={[60, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter
                name="Data Points"
                data={chartData}
                fill={chartColors[0]}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={chartColors[index % chartColors.length]}
                  fill={chartColors[index % chartColors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={dataKeys[0]}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={chartColors[index % chartColors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )
    }
  }

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'action':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        )
      case 'insight':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        )
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content - Visualization */}
      <div className="lg:col-span-2 space-y-6">
        {/* Query Input */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Smart Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="insights-query" className="text-sm font-medium text-foreground">
                  Ask a question to visualize:
                </label>
                <Input
                  id="insights-query"
                  type="text"
                  placeholder="e.g., Show top 5 products by revenue"
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
                {isPending ? 'Generating Insights...' : 'Generate Visualization'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Visualization */}
        {currentResult && (
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-secondary/5 border-b">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Visualization
                  </CardTitle>
                  <Button onClick={handleExportChart} size="sm" variant="outline">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export PNG
                  </Button>
                </div>

                {/* Chart Type Selector */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={chartType === 'bar' ? 'default' : 'outline'}
                    onClick={() => setChartType('bar')}
                  >
                    Bar
                  </Button>
                  <Button
                    size="sm"
                    variant={chartType === 'line' ? 'default' : 'outline'}
                    onClick={() => setChartType('line')}
                  >
                    Line
                  </Button>
                  <Button
                    size="sm"
                    variant={chartType === 'area' ? 'default' : 'outline'}
                    onClick={() => setChartType('area')}
                  >
                    Area
                  </Button>
                  <Button
                    size="sm"
                    variant={chartType === 'pie' ? 'default' : 'outline'}
                    onClick={() => setChartType('pie')}
                  >
                    Pie
                  </Button>
                  <Button
                    size="sm"
                    variant={chartType === 'scatter' ? 'default' : 'outline'}
                    onClick={() => setChartType('scatter')}
                  >
                    Scatter
                  </Button>
                  <Button
                    size="sm"
                    variant={chartType === 'radar' ? 'default' : 'outline'}
                    onClick={() => setChartType('radar')}
                  >
                    Radar
                  </Button>
                </div>

                {/* Color Scheme Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Colors:</span>
                  <Button size="sm" variant="outline" onClick={() => changeColorScheme('default')}>
                    Default
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => changeColorScheme('warm')}>
                    Warm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => changeColorScheme('cool')}>
                    Cool
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => changeColorScheme('pastel')}>
                    Pastel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Chart */}
              <div ref={chartRef}>
                {renderChart()}
              </div>

              {/* AI Style Suggestion */}
              {styleSuggestion && (
                <Alert className="mt-4 border-secondary/50 bg-secondary/5">
                  <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <div className="ml-2">
                    <p className="text-sm font-semibold mb-1">💡 AI Styling Tip:</p>
                    <p className="text-sm">{styleSuggestion}</p>
                  </div>
                </Alert>
              )}

              {/* AI Summary */}
              {currentResult.aiSummary && (
                <Alert className="mt-4 border-accent/50 bg-accent/5">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="ml-2">
                    <p className="text-sm font-semibold mb-1">AI Insights:</p>
                    <p className="text-sm">{currentResult.aiSummary}</p>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Sidebar - Annotations */}
      <div className="lg:col-span-1">
        <Card className="border-2 shadow-lg sticky top-8">
          <CardHeader className="bg-gradient-to-r from-secondary/5 to-accent/5 border-b">
            <CardTitle className="text-lg flex items-center gap-2 text-secondary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Annotations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Add Annotation */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={annotationType === 'comment' ? 'default' : 'outline'}
                  onClick={() => setAnnotationType('comment')}
                  className="flex-1"
                >
                  💬
                </Button>
                <Button
                  size="sm"
                  variant={annotationType === 'action' ? 'default' : 'outline'}
                  onClick={() => setAnnotationType('action')}
                  className="flex-1"
                >
                  ✅
                </Button>
                <Button
                  size="sm"
                  variant={annotationType === 'insight' ? 'default' : 'outline'}
                  onClick={() => setAnnotationType('insight')}
                  className="flex-1"
                >
                  💡
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add your note..."
                  value={newAnnotation}
                  onChange={(e) => setNewAnnotation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAnnotation()
                    }
                  }}
                />
                <Button onClick={handleAddAnnotation} size="sm">
                  Add
                </Button>
              </div>
            </div>

            {/* Annotations List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {annotations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No annotations yet. Add your first note!
                </p>
              ) : (
                annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getAnnotationIcon(annotation.type)}
                        <Badge variant={annotation.type === 'action' ? 'default' : 'secondary'}>
                          {annotation.type}
                        </Badge>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnotation(annotation.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm">{annotation.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">{annotation.timestamp}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * PlotlyChart Component - AI-driven interactive visualizations
 *
 * Renders Plotly charts based on Claude AI's visualization recommendations.
 * Supports multiple chart types optimized for analytical insights:
 * - Bar, Line, Scatter, Pie, Heatmap, Histogram, Box plots
 * - Interactive features: zoom, pan, hover, export
 * - Dynamic data transformation based on visualization spec
 *
 * Features:
 * - AI-recommended chart configurations
 * - Interactive Plotly charts with full interactivity
 * - Smart data transformation and aggregation
 * - Fallback logic for missing specs
 * - TypeScript strict typing
 */

import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import type { QueryResults } from '@/types'
import type { VisualizationSpec } from '@/stores/queryStore'

interface PlotlyChartProps {
  results: QueryResults
  visualizationSpec?: VisualizationSpec
  className?: string
}

/**
 * Transform QueryResults into Plotly data format based on visualization spec
 */
function transformToPlotlyData(
  results: QueryResults,
  spec: VisualizationSpec
): Plotly.Data[] {
  const { columns, rows } = results

  if (rows.length === 0 || columns.length === 0) {
    return []
  }

  const chartType = spec.chartType.toLowerCase()

  // Helper to get column index
  const getColumnIndex = (columnName: string): number => {
    const index = columns.findIndex(col =>
      col.toLowerCase() === columnName.toLowerCase()
    )
    return index >= 0 ? index : 0
  }

  // Extract column data
  const getColumnData = (columnName?: string): any[] => {
    if (!columnName) return []
    const index = getColumnIndex(columnName)
    return rows.map(row => row[index])
  }

  const xData = getColumnData(spec.xAxis?.column)
  const yData = getColumnData(spec.yAxis?.column)
  const zData = spec.zAxis ? getColumnData(spec.zAxis.column) : []

  // Common trace properties
  const baseTrace: Partial<Plotly.Data> = {
    name: spec.yAxis?.label || spec.yAxis?.column || 'Value',
    hovertemplate: '<b>%{x}</b><br>%{y}<extra></extra>',
  }

  // Chart-specific configurations
  switch (chartType) {
    case 'bar':
      return [{
        ...baseTrace,
        type: 'bar',
        x: xData,
        y: yData,
        marker: {
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
        },
      }]

    case 'line':
      return [{
        ...baseTrace,
        type: 'scatter',
        mode: 'lines+markers',
        x: xData,
        y: yData,
        line: {
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
          width: 2,
        },
        marker: {
          size: 6,
        },
      }]

    case 'scatter':
      return [{
        ...baseTrace,
        type: 'scatter',
        mode: 'markers',
        x: xData,
        y: yData,
        marker: {
          size: 8,
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
        },
      }]

    case 'pie':
      return [{
        type: 'pie',
        labels: xData,
        values: yData,
        hovertemplate: '<b>%{label}</b><br>%{value}<br>%{percent}<extra></extra>',
        marker: {
          colors: spec.colors,
        },
      }]

    case 'area':
      return [{
        ...baseTrace,
        type: 'scatter',
        mode: 'lines',
        x: xData,
        y: yData,
        fill: 'tozeroy',
        fillcolor: spec.colors?.[0] ?
          `${spec.colors[0]}40` :
          'rgba(55, 83, 109, 0.3)',
        line: {
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
          width: 2,
        },
      }]

    case 'histogram':
      return [{
        type: 'histogram',
        x: yData, // Use Y data as histogram input
        name: spec.yAxis?.label || 'Distribution',
        marker: {
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
        },
      }]

    case 'box':
      return [{
        type: 'box',
        y: yData,
        name: spec.yAxis?.label || spec.yAxis?.column || 'Value',
        marker: {
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
        },
        boxmean: 'sd',
      }]

    case 'heatmap':
      // For heatmap, we need a 2D matrix
      // Assume rows represent Y categories and we need to pivot the data
      const uniqueX = [...new Set(xData)]
      const uniqueY = [...new Set(yData)]

      // Create matrix
      const matrix: number[][] = []
      for (let i = 0; i < uniqueY.length; i++) {
        matrix[i] = new Array(uniqueX.length).fill(0)
      }

      // Fill matrix with values
      rows.forEach(row => {
        const xVal = row[getColumnIndex(spec.xAxis?.column || columns[0])]
        const yVal = row[getColumnIndex(spec.yAxis?.column || columns[1])]
        const zVal = row[getColumnIndex(spec.zAxis?.column || columns[2])]

        const xIdx = uniqueX.indexOf(xVal)
        const yIdx = uniqueY.indexOf(yVal)

        if (xIdx >= 0 && yIdx >= 0) {
          matrix[yIdx][xIdx] = typeof zVal === 'number' ? zVal : parseFloat(String(zVal)) || 0
        }
      })

      return [{
        type: 'heatmap',
        x: uniqueX,
        y: uniqueY,
        z: matrix,
        colorscale: 'Blues',
        hovertemplate: '<b>%{x}</b><br>%{y}<br>Value: %{z}<extra></extra>',
      }]

    case '3d-scatter':
      return [{
        type: 'scatter3d',
        mode: 'markers',
        x: xData,
        y: yData,
        z: zData,
        marker: {
          size: 5,
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
        },
      }]

    case 'bubble':
      // Use zData as size for bubble chart
      const sizes = zData.map(z =>
        typeof z === 'number' ? z : parseFloat(String(z)) || 10
      )

      return [{
        ...baseTrace,
        type: 'scatter',
        mode: 'markers',
        x: xData,
        y: yData,
        marker: {
          size: sizes,
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
          sizemode: 'diameter',
          sizeref: Math.max(...sizes) / 50,
        },
      }]

    default:
      // Fallback to bar chart
      return [{
        type: 'bar',
        x: xData,
        y: yData,
        marker: {
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
        },
      }]
  }
}

/**
 * Generate Plotly layout configuration
 */
function generateLayout(
  spec: VisualizationSpec,
  isDarkMode: boolean
): Partial<Plotly.Layout> {
  const bgColor = isDarkMode ? '#1a1a1a' : '#ffffff'
  const textColor = isDarkMode ? '#e5e5e5' : '#333333'
  const gridColor = isDarkMode ? '#333333' : '#e5e5e5'

  const baseLayout: Partial<Plotly.Layout> = {
    title: {
      text: spec.title || 'Data Visualization',
      font: {
        size: 18,
        color: textColor,
      },
    },
    paper_bgcolor: bgColor,
    plot_bgcolor: bgColor,
    font: {
      color: textColor,
    },
    hovermode: 'closest',
    showlegend: !['pie', 'histogram'].includes(spec.chartType.toLowerCase()),
    margin: {
      l: 60,
      r: 40,
      t: 80,
      b: 60,
    },
  }

  // Add axis configurations for charts that support them
  if (!['pie', '3d-scatter'].includes(spec.chartType.toLowerCase())) {
    baseLayout.xaxis = {
      title: spec.xAxis?.label || spec.xAxis?.column || '',
      gridcolor: gridColor,
      color: textColor,
      type: spec.xAxis?.type as any || 'category',
    }

    baseLayout.yaxis = {
      title: spec.yAxis?.label || spec.yAxis?.column || '',
      gridcolor: gridColor,
      color: textColor,
      type: spec.yAxis?.type as any || 'linear',
    }
  }

  // Add annotations if specified
  if (spec.annotations && spec.annotations.length > 0) {
    baseLayout.annotations = spec.annotations.map(ann => ({
      text: ann.text,
      x: ann.x,
      y: ann.y,
      showarrow: true,
      arrowhead: 2,
      font: {
        color: textColor,
      },
    }))
  }

  return baseLayout
}

/**
 * Plotly chart configuration
 */
const plotConfig: Partial<Plotly.Config> = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'chart',
    height: 800,
    width: 1200,
  },
  responsive: true,
}

export function PlotlyChart({
  results,
  visualizationSpec,
  className = ''
}: PlotlyChartProps) {
  // Check if dark mode is enabled (using CSS variable)
  const isDarkMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  }, [])

  // Generate chart data and layout
  const chartData = useMemo(() => {
    if (!visualizationSpec) return []
    return transformToPlotlyData(results, visualizationSpec)
  }, [results, visualizationSpec])

  const layout = useMemo(() => {
    if (!visualizationSpec) return {}
    return generateLayout(visualizationSpec, isDarkMode)
  }, [visualizationSpec, isDarkMode])

  // Early return if no data or spec
  if (!visualizationSpec || !results || results.rows.length === 0) {
    return (
      <div className={`rounded-lg border border-dashed border-border p-8 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          No visualization available. The AI will recommend a chart type when you ask a question.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${className}`}>
      <Plot
        data={chartData}
        layout={layout}
        config={plotConfig}
        className="w-full"
        style={{ width: '100%', height: '500px' }}
        useResizeHandler
      />

      {visualizationSpec.reasoning && (
        <div className="mt-4 rounded-md bg-muted p-3 text-sm">
          <p className="font-semibold text-foreground mb-1">Why this chart?</p>
          <p className="text-muted-foreground">{visualizationSpec.reasoning}</p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {results.rows.length} rows • {results.columns.length} columns
        </span>
        <span className="capitalize">
          {visualizationSpec.chartType} chart • Interactive
        </span>
      </div>
    </div>
  )
}

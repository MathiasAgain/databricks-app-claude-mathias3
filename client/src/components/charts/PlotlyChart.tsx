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
 * - Export to PNG, SVG, JSON
 * - Save as template
 * - Fallback logic for missing specs
 * - TypeScript strict typing
 */

import { useMemo, useRef, useState } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-basic-dist'
import { Button } from '@/components/ui/button'
import type { QueryResults } from '@/types'
import type { VisualizationSpec } from '@/stores/queryStore'

interface PlotlyChartProps {
  results: QueryResults
  visualizationSpec?: VisualizationSpec
  className?: string
  isModifying?: boolean
  onSaveTemplate?: (spec: VisualizationSpec, thumbnail?: string) => void
}

/**
 * Number format configuration for human-readable formats
 */
interface NumberFormatConfig {
  divisor: number
  suffix: string
  multiplier?: number
  prefix?: string
}

/**
 * Get number format configuration from human-readable format string
 */
function getNumberFormatConfig(format?: string): NumberFormatConfig | null {
  if (!format) return null

  const formatLower = format.toLowerCase()

  switch (formatLower) {
    case 'billions':
      return { divisor: 1e9, suffix: 'B' }
    case 'millions':
      return { divisor: 1e6, suffix: 'M' }
    case 'thousands':
      return { divisor: 1e3, suffix: 'K' }
    case 'percentage':
      return { divisor: 1, suffix: '%', multiplier: 100 }
    case 'currency':
      return { divisor: 1, suffix: '', prefix: '$' }
    case 'compact':
      // Compact format auto-selects based on value magnitude
      return null // Will be handled specially
    default:
      return null
  }
}

/**
 * Format a number using human-readable numberFormat
 */
function formatWithNumberFormat(value: number, format?: string, decimals: number = 0): string {
  const config = getNumberFormatConfig(format)

  if (!config) {
    // Handle 'compact' format - auto-select suffix based on magnitude
    if (format?.toLowerCase() === 'compact') {
      const absValue = Math.abs(value)
      if (absValue >= 1e9) {
        const formatted = (value / 1e9).toFixed(decimals)
        return formatted + 'B'
      } else if (absValue >= 1e6) {
        const formatted = (value / 1e6).toFixed(decimals)
        return formatted + 'M'
      } else if (absValue >= 1e3) {
        const formatted = (value / 1e3).toFixed(decimals)
        return formatted + 'K'
      }
      return value.toFixed(decimals)
    }
    return value.toLocaleString()
  }

  let displayValue = value / config.divisor
  if (config.multiplier) {
    displayValue *= config.multiplier
  }

  const formatted = displayValue.toFixed(decimals)
  return (config.prefix || '') + formatted + config.suffix
}

/**
 * Allowed Plotly trace properties for validation (security whitelist)
 */
const ALLOWED_TRACE_PROPS = new Set([
  'type', 'x', 'y', 'z', 'text', 'marker', 'line', 'mode', 'name',
  'hovertemplate', 'hoverinfo', 'textposition', 'textfont', 'textinfo',
  'fill', 'fillcolor', 'labels', 'values', 'colorscale', 'showlegend',
  'legendgroup', 'opacity', 'orientation', 'width', 'base', 'offset',
  'hole', 'pull', 'domain', 'texttemplate', 'insidetextorientation',
  'customdata', 'ids', 'error_x', 'error_y', 'connectgaps', 'stackgroup'
])

/**
 * Type guard to check if an object is a valid Plotly trace
 */
function isValidPlotlyTrace(obj: unknown): obj is Plotly.Data {
  if (typeof obj !== 'object' || obj === null) return false
  const trace = obj as Record<string, unknown>
  // Must have a type property that's a string
  return typeof trace.type === 'string' ||
    // Some traces like scatter don't require type
    (Array.isArray(trace.x) || Array.isArray(trace.y) || Array.isArray(trace.values))
}

/**
 * Validate and sanitize raw Plotly data from Claude
 * Security: Whitelists allowed properties to prevent malicious config
 */
function validatePlotlyData(data: unknown[]): Plotly.Data[] {
  if (!Array.isArray(data)) {
    console.error('[PlotlyChart] plotlyData is not an array')
    return []
  }

  return data
    .filter((trace, index) => {
      if (!isValidPlotlyTrace(trace)) {
        console.warn(`[PlotlyChart] Skipping invalid trace at index ${index}`)
        return false
      }
      return true
    })
    .map(trace => {
      const validatedTrace: Record<string, unknown> = {}
      const traceObj = trace as Record<string, unknown>

      for (const key of Object.keys(traceObj)) {
        // Only allow whitelisted properties
        if (ALLOWED_TRACE_PROPS.has(key)) {
          validatedTrace[key] = traceObj[key]
        } else {
          console.warn(`[PlotlyChart] Removed non-whitelisted trace property: ${key}`)
        }
      }

      return validatedTrace as Plotly.Data
    })
}

/**
 * Format a value using d3-format-like format string
 */
function formatValue(value: any, format?: string): string {
  if (value === null || value === undefined) return ''
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) return String(value)

  if (!format) return String(num)

  // Simple format handling for common cases
  if (format === '.0f') return Math.round(num).toString()
  if (format === '.1f') return num.toFixed(1)
  if (format === '.2f') return num.toFixed(2)
  if (format === ',.0f') return Math.round(num).toLocaleString()
  if (format === ',.2f') return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (format === '$,.0f') return '$' + Math.round(num).toLocaleString()
  if (format === '$,.2f') return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (format === '.0%') return Math.round(num * 100) + '%'
  if (format === '.1%') return (num * 100).toFixed(1) + '%'

  // Default fallback
  return String(num)
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

  // Data labels configuration
  const dataLabels = spec.dataLabels
  const showDataLabels = dataLabels?.show === true

  // Map position to Plotly textposition
  const mapTextPosition = (position?: string): string => {
    switch (position) {
      case 'inside': return 'inside'
      case 'outside': return 'outside'
      case 'top': return 'top'
      case 'bottom': return 'bottom'
      default: return 'auto'
    }
  }

  // Build text font from dataLabels config
  const textFont = showDataLabels && dataLabels?.font ? {
    size: dataLabels.font.size,
    family: dataLabels.font.family,
    color: dataLabels.font.color,
  } : undefined

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
        // Data labels
        ...(showDataLabels ? {
          text: yData.map(v => dataLabels?.format ?
            formatValue(v, dataLabels.format) : String(v)),
          textposition: mapTextPosition(dataLabels?.position),
          textfont: textFont,
        } : {}),
      }]

    case 'line':
      return [{
        ...baseTrace,
        type: 'scatter',
        mode: showDataLabels ? 'lines+markers+text' : 'lines+markers',
        x: xData,
        y: yData,
        line: {
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
          width: 2,
        },
        marker: {
          size: 6,
        },
        // Data labels
        ...(showDataLabels ? {
          text: yData.map(v => dataLabels?.format ?
            formatValue(v, dataLabels.format) : String(v)),
          textposition: mapTextPosition(dataLabels?.position) || 'top',
          textfont: textFont,
        } : {}),
      }]

    case 'scatter':
      return [{
        ...baseTrace,
        type: 'scatter',
        mode: showDataLabels ? 'markers+text' : 'markers',
        x: xData,
        y: yData,
        marker: {
          size: 8,
          color: spec.colors?.[0] || 'rgb(55, 83, 109)',
        },
        // Data labels
        ...(showDataLabels ? {
          text: yData.map(v => dataLabels?.format ?
            formatValue(v, dataLabels.format) : String(v)),
          textposition: mapTextPosition(dataLabels?.position) || 'top',
          textfont: textFont,
        } : {}),
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
        // Data labels for pie use textinfo
        textinfo: showDataLabels ? 'label+value+percent' : 'percent',
        textposition: showDataLabels ? (dataLabels?.position === 'outside' ? 'outside' : 'inside') : 'auto',
        textfont: textFont,
      }]

    case 'area':
      return [{
        ...baseTrace,
        type: 'scatter',
        mode: showDataLabels ? 'lines+text' : 'lines',
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
        // Data labels
        ...(showDataLabels ? {
          text: yData.map(v => dataLabels?.format ?
            formatValue(v, dataLabels.format) : String(v)),
          textposition: mapTextPosition(dataLabels?.position) || 'top',
          textfont: textFont,
        } : {}),
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
 * Generate tick values and text for human-readable numberFormat
 */
function generateFormattedTicks(
  dataValues: number[],
  numberFormat?: string,
  decimals: number = 0
): { tickvals: number[], ticktext: string[] } | null {
  if (!numberFormat) return null

  const config = getNumberFormatConfig(numberFormat)
  const isCompact = numberFormat.toLowerCase() === 'compact'

  if (!config && !isCompact) return null

  // Filter out NaN values and get numeric data
  const validValues = dataValues.filter(v => !isNaN(v) && v !== null && v !== undefined)
  if (validValues.length === 0) return null

  const minVal = Math.min(...validValues)
  const maxVal = Math.max(...validValues)
  const range = maxVal - minVal

  // Generate ~5-7 nice tick values
  const numTicks = 6
  const tickValues: number[] = []

  for (let i = 0; i <= numTicks; i++) {
    const value = minVal + (range * i / numTicks)
    tickValues.push(value)
  }

  // Format the tick labels
  const tickLabels = tickValues.map(val => {
    if (isCompact) {
      return formatWithNumberFormat(val, 'compact', decimals)
    }
    return formatWithNumberFormat(val, numberFormat, decimals)
  })

  return { tickvals: tickValues, ticktext: tickLabels }
}

/**
 * Generate Plotly layout configuration
 */
function generateLayout(
  spec: VisualizationSpec,
  isDarkMode: boolean,
  yDataValues?: number[]
): Partial<Plotly.Layout> {
  const bgColor = isDarkMode ? '#1a1a1a' : '#ffffff'
  const textColor = isDarkMode ? '#e5e5e5' : '#333333'
  const gridColor = isDarkMode ? '#333333' : '#e5e5e5'

  // Build title configuration with font customization
  const titleFont = spec.layout?.titleFont || {}
  const titleConfig: Partial<Plotly.Layout['title']> = {
    text: spec.title || 'Data Visualization',
    font: {
      size: titleFont.size || 18,
      family: titleFont.family,
      color: titleFont.color || textColor,
      // @ts-ignore - Plotly types don't include weight but it's valid
      weight: titleFont.weight,
    },
  }

  // Build margin configuration
  const margin = spec.layout?.margin || { l: 60, r: 40, t: 80, b: 60 }

  // Determine legend visibility and position
  const showlegend = spec.layout?.showlegend !== undefined
    ? spec.layout.showlegend
    : !['pie', 'histogram'].includes(spec.chartType.toLowerCase())

  // Map legend position string to Plotly format
  const legendPosition = spec.layout?.legendPosition || 'top-right'
  const legendConfig: Partial<Plotly.Legend> = {}

  if (legendPosition.includes('top')) {
    legendConfig.y = 1
    legendConfig.yanchor = 'top'
  } else if (legendPosition.includes('bottom')) {
    legendConfig.y = 0
    legendConfig.yanchor = 'bottom'
  }

  if (legendPosition.includes('right')) {
    legendConfig.x = 1
    legendConfig.xanchor = 'right'
  } else if (legendPosition.includes('left')) {
    legendConfig.x = 0
    legendConfig.xanchor = 'left'
  }

  const baseLayout: Partial<Plotly.Layout> = {
    title: titleConfig,
    paper_bgcolor: bgColor,
    plot_bgcolor: bgColor,
    font: {
      color: textColor,
    },
    hovermode: 'closest',
    showlegend,
    legend: legendConfig,
    margin,
    width: spec.layout?.width,
    height: spec.layout?.height,
  }

  // Add axis configurations for charts that support them
  if (!['pie', '3d-scatter'].includes(spec.chartType.toLowerCase())) {
    // X-Axis configuration with enhanced features
    const xAxisFont = spec.xAxis?.font || {}
    baseLayout.xaxis = {
      title: {
        text: spec.xAxis?.label || spec.xAxis?.column || '',
        font: {
          size: xAxisFont.size,
          family: xAxisFont.family,
          color: xAxisFont.color || textColor,
        },
      },
      gridcolor: spec.xAxis?.showGrid === false ? 'transparent' : gridColor,
      color: textColor,
      type: spec.xAxis?.type as any || 'category',
      range: spec.xAxis?.range as [number, number] | undefined,
      tickformat: spec.xAxis?.tickFormat,
      showgrid: spec.xAxis?.showGrid !== false,
    }

    // Y-Axis configuration with enhanced features and numberFormat support
    const yAxisFont = spec.yAxis?.font || {}
    const yNumberFormat = spec.yAxis?.numberFormat
    const yDecimals = spec.yAxis?.decimals ?? 0

    // Generate custom ticks if numberFormat is specified
    const yAxisTicks = yDataValues && yNumberFormat
      ? generateFormattedTicks(yDataValues, yNumberFormat, yDecimals)
      : null

    baseLayout.yaxis = {
      title: {
        text: spec.yAxis?.label || spec.yAxis?.column || '',
        font: {
          size: yAxisFont.size,
          family: yAxisFont.family,
          color: yAxisFont.color || textColor,
        },
      },
      gridcolor: spec.yAxis?.showGrid === false ? 'transparent' : gridColor,
      color: textColor,
      type: spec.yAxis?.type as any || 'linear',
      range: spec.yAxis?.range as [number, number] | undefined,
      // Use custom tick formatting when numberFormat is specified
      ...(yAxisTicks ? {
        tickmode: 'array',
        tickvals: yAxisTicks.tickvals,
        ticktext: yAxisTicks.ticktext,
      } : {
        tickformat: spec.yAxis?.tickFormat,
      }),
      showgrid: spec.yAxis?.showGrid !== false,
    }

    // Z-Axis configuration for 3D charts
    if (spec.zAxis) {
      const zAxisFont = spec.zAxis.font || {}
      baseLayout.scene = {
        zaxis: {
          title: {
            text: spec.zAxis.label || spec.zAxis.column || '',
            font: {
              size: zAxisFont.size,
              family: zAxisFont.family,
              color: zAxisFont.color || textColor,
            },
          },
          type: spec.zAxis.type as any || 'linear',
          range: spec.zAxis.range as [number, number] | undefined,
          tickformat: spec.zAxis.tickFormat,
        },
      }
    }
  }

  // Add enhanced annotations if specified
  if (spec.annotations && spec.annotations.length > 0) {
    baseLayout.annotations = spec.annotations.map(ann => {
      const annFont = ann.font || {}
      return {
        text: ann.text,
        x: ann.x,
        y: ann.y,
        xref: ann.xref || 'x',
        yref: ann.yref || 'y',
        showarrow: ann.showarrow !== false,
        arrowhead: ann.arrowhead !== undefined ? ann.arrowhead : 2,
        ax: ann.ax !== undefined ? ann.ax : 0,
        ay: ann.ay !== undefined ? ann.ay : -40,
        font: {
          size: annFont.size,
          family: annFont.family,
          color: annFont.color || textColor,
          // @ts-ignore - Plotly types don't include weight but it's valid
          weight: annFont.weight,
        },
        bgcolor: ann.bgcolor,
        bordercolor: ann.bordercolor,
      }
    })
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
  className = '',
  isModifying = false,
  onSaveTemplate,
}: PlotlyChartProps) {
  const plotRef = useRef<any>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Check if dark mode is enabled (using CSS variable)
  const isDarkMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  }, [])

  // Export functions
  const handleExportPNG = async () => {
    if (!plotRef.current?.el) return
    try {
      const dataUrl = await Plotly.toImage(plotRef.current.el, {
        format: 'png',
        width: 1200,
        height: 800,
      })
      const link = document.createElement('a')
      link.download = `chart-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to export PNG:', error)
    }
    setShowExportMenu(false)
  }

  const handleExportSVG = async () => {
    if (!plotRef.current?.el) return
    try {
      const dataUrl = await Plotly.toImage(plotRef.current.el, {
        format: 'svg',
        width: 1200,
        height: 800,
      })
      const link = document.createElement('a')
      link.download = `chart-${Date.now()}.svg`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to export SVG:', error)
    }
    setShowExportMenu(false)
  }

  const handleExportJSON = () => {
    if (!visualizationSpec) return
    const dataStr = JSON.stringify(visualizationSpec, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `chart-spec-${Date.now()}.json`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const handleSaveTemplate = async () => {
    if (!visualizationSpec || !onSaveTemplate) return
    // Generate thumbnail
    let thumbnail: string | undefined
    if (plotRef.current?.el) {
      try {
        thumbnail = await Plotly.toImage(plotRef.current.el, {
          format: 'png',
          width: 200,
          height: 150,
        })
      } catch (error) {
        console.error('Failed to generate thumbnail:', error)
      }
    }
    onSaveTemplate(visualizationSpec, thumbnail)
  }

  // Generate chart data and layout
  // When plotlyData is provided, use it directly (raw Plotly mode)
  // Otherwise, fall back to structured transformation
  const chartData = useMemo(() => {
    if (!visualizationSpec) return []

    try {
      // Raw Plotly mode: validate and use plotlyData
      if (visualizationSpec.plotlyData && visualizationSpec.plotlyData.length > 0) {
        console.log('[PlotlyChart] Using raw plotlyData from Claude')
        const validatedData = validatePlotlyData(visualizationSpec.plotlyData)
        if (validatedData.length > 0) {
          return validatedData
        }
        // Fall back to structured mode if validation fails
        console.warn('[PlotlyChart] Raw Plotly data validation failed, falling back to structured mode')
      }

      // Structured mode: transform using our logic
      return transformToPlotlyData(results, visualizationSpec)
    } catch (error) {
      console.error('[PlotlyChart] Failed to generate chart data:', error)
      return [] // Return empty array instead of crashing
    }
  }, [results, visualizationSpec])

  const layout = useMemo(() => {
    if (!visualizationSpec) return {}

    try {
      // Raw Plotly mode: use plotlyLayout directly
      if (visualizationSpec.plotlyLayout) {
        console.log('[PlotlyChart] Using raw plotlyLayout from Claude')
        const bgColor = isDarkMode ? '#1a1a1a' : '#ffffff'
        const textColor = isDarkMode ? '#e5e5e5' : '#333333'

        // Type-safe access to font color
        const rawLayout = visualizationSpec.plotlyLayout
        const fontObj = rawLayout.font && typeof rawLayout.font === 'object' ? rawLayout.font : {}
        const fontColor = 'color' in fontObj ? (fontObj as { color?: string }).color : undefined

        // Merge with theme colors for consistent appearance
        return {
          ...rawLayout,
          paper_bgcolor: rawLayout.paper_bgcolor || bgColor,
          plot_bgcolor: rawLayout.plot_bgcolor || bgColor,
          font: {
            ...fontObj,
            color: fontColor || textColor,
          },
        } as Partial<Plotly.Layout>
      }

      // Structured mode: generate layout from our logic
      // Extract Y data values for number formatting
      const yColumnName = visualizationSpec.yAxis?.column
      let yDataValues: number[] | undefined
      if (yColumnName && results.columns && results.rows) {
        const yIndex = results.columns.findIndex(col =>
          col.toLowerCase() === yColumnName.toLowerCase()
        )
        if (yIndex >= 0) {
          yDataValues = results.rows.map(row => {
            const val = row[yIndex]
            return typeof val === 'number' ? val : parseFloat(String(val))
          }).filter(v => !isNaN(v))
        }
      }
      return generateLayout(visualizationSpec, isDarkMode, yDataValues)
    } catch (error) {
      console.error('[PlotlyChart] Failed to generate layout:', error)
      return {} // Return empty layout instead of crashing
    }
  }, [visualizationSpec, isDarkMode, results])

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
    <div className={`rounded-lg border border-border bg-card p-4 relative ${className}`}>
      {/* Modification overlay */}
      {isModifying && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <div className="relative">
              <svg
                className="w-12 h-12 text-accent animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <svg
                className="w-6 h-6 text-accent absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-foreground">Updating visualization...</p>
            <p className="text-sm text-muted-foreground">AI is modifying your chart</p>
          </div>
        </div>
      )}

      <Plot
        ref={plotRef}
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

      {/* Action Bar */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className="text-xs text-muted-foreground">
          <span>
            Showing {results.rows.length} rows • {results.columns.length} columns
          </span>
          <span className="mx-2">•</span>
          <span className="capitalize">
            {visualizationSpec.chartType} chart
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Template Button */}
          {onSaveTemplate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTemplate}
              className="h-8 text-xs"
              title="Save as template"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save Template
            </Button>
          )}

          {/* Export Menu */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-8 text-xs"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-card border border-border rounded-md shadow-lg z-20">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  PNG
                </button>
                <button
                  onClick={handleExportSVG}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  SVG
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

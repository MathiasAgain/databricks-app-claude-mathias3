/**
 * Chart Recommendations Utility
 *
 * Provides fallback logic for generating visualization specifications
 * when the AI doesn't provide one. Analyzes data structure to recommend
 * the most appropriate chart type.
 *
 * This serves as a backup system and can also be used to validate
 * or enhance AI recommendations.
 */

import type { QueryResults } from '@/types'
import type { VisualizationSpec } from '@/stores/queryStore'

/**
 * Check if a value is numeric
 */
function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return !isNaN(value) && isFinite(value)
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return !isNaN(num) && isFinite(num)
  }
  return false
}

/**
 * Check if a column name or value suggests it's time-related
 */
function isTimeRelated(columnName: string, sampleValue?: unknown): boolean {
  const lower = columnName.toLowerCase()
  const timeKeywords = [
    'date',
    'time',
    'year',
    'month',
    'day',
    'quarter',
    'week',
    'period',
    'timestamp',
  ]

  // Check column name
  if (timeKeywords.some((keyword) => lower.includes(keyword))) {
    return true
  }

  // Check sample value
  if (typeof sampleValue === 'string') {
    // ISO date format
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(sampleValue)) return true
    // Month names
    if (/january|february|march|april|may|june|july|august|september|october|november|december/i.test(sampleValue)) return true
    // Quarter patterns
    if (/q[1-4]/i.test(sampleValue)) return true
    // Year patterns
    if (/\b(19|20)\d{2}\b/.test(sampleValue)) return true
  }

  return false
}

/**
 * Detect column types in the dataset
 */
function analyzeColumns(results: QueryResults): {
  numericColumns: string[]
  categoricalColumns: string[]
  timeColumns: string[]
  columnTypes: Map<string, 'numeric' | 'categorical' | 'time'>
} {
  const { columns, rows } = results

  const numericColumns: string[] = []
  const categoricalColumns: string[] = []
  const timeColumns: string[] = []
  const columnTypes = new Map<string, 'numeric' | 'categorical' | 'time'>()

  if (rows.length === 0) {
    return { numericColumns, categoricalColumns, timeColumns, columnTypes }
  }

  const firstRow = rows[0]

  columns.forEach((col, idx) => {
    const value = firstRow[idx]

    // Check if time-related
    if (isTimeRelated(col, value)) {
      timeColumns.push(col)
      columnTypes.set(col, 'time')
    }
    // Check if numeric
    else if (isNumeric(value)) {
      numericColumns.push(col)
      columnTypes.set(col, 'numeric')
    }
    // Otherwise categorical
    else {
      categoricalColumns.push(col)
      columnTypes.set(col, 'categorical')
    }
  })

  return { numericColumns, categoricalColumns, timeColumns, columnTypes }
}

/**
 * Calculate cardinality (number of unique values) for a column
 */
function getCardinality(results: QueryResults, columnName: string): number {
  const columnIndex = results.columns.indexOf(columnName)
  if (columnIndex < 0) return 0

  const uniqueValues = new Set(results.rows.map(row => row[columnIndex]))
  return uniqueValues.size
}

/**
 * Generate a recommended visualization spec based on data analysis
 */
export function generateVisualizationSpec(
  results: QueryResults,
  question?: string
): VisualizationSpec | null {
  const { columns, rows } = results

  // Not enough data to visualize
  if (rows.length === 0 || columns.length < 2) {
    return null
  }

  const analysis = analyzeColumns(results)
  const { numericColumns, categoricalColumns, timeColumns, columnTypes } = analysis

  // Not enough appropriate columns
  if (numericColumns.length === 0) {
    return null
  }

  // Scenario 1: Time series data (time column + numeric values)
  if (timeColumns.length > 0 && numericColumns.length > 0) {
    return {
      chartType: 'line',
      title: 'Trend Over Time',
      xAxis: {
        column: timeColumns[0],
        label: timeColumns[0],
        type: 'time',
      },
      yAxis: {
        column: numericColumns[0],
        label: numericColumns[0],
        type: 'linear',
      },
      reasoning: 'Line chart selected because data contains time-series information, ideal for showing trends.',
    }
  }

  // Scenario 2: Single categorical column + numeric values (bar chart)
  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    const catCol = categoricalColumns[0]
    const cardinality = getCardinality(results, catCol)

    // If few categories (<= 10), use bar chart
    if (cardinality <= 10) {
      return {
        chartType: 'bar',
        title: `${numericColumns[0]} by ${catCol}`,
        xAxis: {
          column: catCol,
          label: catCol,
          type: 'category',
        },
        yAxis: {
          column: numericColumns[0],
          label: numericColumns[0],
          type: 'linear',
        },
        reasoning: 'Bar chart selected for comparing values across categories.',
      }
    }

    // If many categories, use horizontal bar or histogram
    return {
      chartType: 'histogram',
      title: `Distribution of ${numericColumns[0]}`,
      yAxis: {
        column: numericColumns[0],
        label: numericColumns[0],
        type: 'linear',
      },
      reasoning: 'Histogram selected to show distribution with many categories.',
    }
  }

  // Scenario 3: Two numeric columns (scatter plot for correlation)
  if (numericColumns.length >= 2) {
    return {
      chartType: 'scatter',
      title: `${numericColumns[1]} vs ${numericColumns[0]}`,
      xAxis: {
        column: numericColumns[0],
        label: numericColumns[0],
        type: 'linear',
      },
      yAxis: {
        column: numericColumns[1],
        label: numericColumns[1],
        type: 'linear',
      },
      reasoning: 'Scatter plot selected to show relationship between two numeric variables.',
    }
  }

  // Scenario 4: Single numeric column (histogram for distribution)
  if (numericColumns.length === 1) {
    return {
      chartType: 'histogram',
      title: `Distribution of ${numericColumns[0]}`,
      yAxis: {
        column: numericColumns[0],
        label: numericColumns[0],
        type: 'linear',
      },
      reasoning: 'Histogram selected to show the distribution of values.',
    }
  }

  // Fallback: bar chart with first two columns
  return {
    chartType: 'bar',
    title: 'Data Visualization',
    xAxis: {
      column: columns[0],
      label: columns[0],
      type: columnTypes.get(columns[0]) === 'numeric' ? 'linear' : 'category',
    },
    yAxis: {
      column: columns[1],
      label: columns[1],
      type: 'linear',
    },
    reasoning: 'Bar chart selected as a general-purpose visualization.',
  }
}

/**
 * Validate and enhance an AI-provided visualization spec
 * Ensures all required fields are present and makes sense for the data
 */
export function validateVisualizationSpec(
  spec: VisualizationSpec,
  results: QueryResults
): VisualizationSpec {
  const { columns } = results
  const enhancedSpec = { ...spec }

  // Ensure xAxis column exists
  if (enhancedSpec.xAxis && !columns.includes(enhancedSpec.xAxis.column)) {
    // Try to find a similar column name
    const similarColumn = columns.find(col =>
      col.toLowerCase().includes(enhancedSpec.xAxis!.column.toLowerCase())
    )
    if (similarColumn) {
      enhancedSpec.xAxis.column = similarColumn
    } else {
      // Fallback to first column
      enhancedSpec.xAxis.column = columns[0]
    }
  }

  // Ensure yAxis column exists
  if (enhancedSpec.yAxis && !columns.includes(enhancedSpec.yAxis.column)) {
    const similarColumn = columns.find(col =>
      col.toLowerCase().includes(enhancedSpec.yAxis!.column.toLowerCase())
    )
    if (similarColumn) {
      enhancedSpec.yAxis.column = similarColumn
    } else {
      // Fallback to second column
      enhancedSpec.yAxis.column = columns[1] || columns[0]
    }
  }

  // Add default title if missing
  if (!enhancedSpec.title) {
    enhancedSpec.title = 'Data Visualization'
  }

  return enhancedSpec
}

/**
 * Get a fallback visualization spec if AI doesn't provide one
 */
export function getVisualizationOrFallback(
  aiSpec: VisualizationSpec | undefined | null,
  results: QueryResults,
  question?: string
): VisualizationSpec | null {
  // If AI provided a spec, validate and return it
  if (aiSpec) {
    return validateVisualizationSpec(aiSpec, results)
  }

  // Otherwise, generate a fallback spec
  return generateVisualizationSpec(results, question)
}

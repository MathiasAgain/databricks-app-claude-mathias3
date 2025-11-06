/**
 * DataChart Component - Intelligent data visualization
 *
 * Auto-detects the best chart type based on data structure:
 * - Bar charts for categorical comparisons
 * - Line charts for time series
 * - Area charts for cumulative data
 *
 * Features:
 * - Responsive design
 * - Smooth animations
 * - Accessibility support
 * - TypeScript strict typing
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { QueryResults } from '@/types/genie'

interface DataChartProps {
  data: QueryResults
  className?: string
}

type ChartType = 'bar' | 'line' | 'area'

/**
 * Auto-detect the best chart type based on data characteristics
 */
function detectChartType(columns: string[], rows: any[][]): ChartType {
  if (rows.length === 0) return 'bar'

  // Check if first column looks like a date/time
  const firstValue = rows[0][0]
  if (firstValue && (
    typeof firstValue === 'string' &&
    (firstValue.match(/^\d{4}/) || firstValue.includes('-') || firstValue.includes('/'))
  )) {
    return 'line'
  }

  // Check if last column name suggests cumulative data
  const lastColumn = columns[columns.length - 1]?.toLowerCase()
  if (lastColumn?.includes('total') || lastColumn?.includes('cumulative')) {
    return 'area'
  }

  // Default to bar chart for categorical data
  return 'bar'
}

/**
 * Transform query results into Recharts format
 */
function transformData(columns: string[], rows: any[][]) {
  return rows.slice(0, 20).map((row) => {  // Limit to 20 points for readability
    const dataPoint: Record<string, any> = {}
    columns.forEach((col, idx) => {
      dataPoint[col] = row[idx]
    })
    return dataPoint
  })
}

/**
 * Intelligent color palette for data visualization
 */
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(217, 91%, 60%)',
  'hsl(142, 76%, 36%)',
  'hsl(24, 100%, 50%)',
]

export function DataChart({ data, className = '' }: DataChartProps) {
  const { columns, rows, rowCount } = data

  const chartData = useMemo(() => transformData(columns, rows), [columns, rows])
  const chartType = useMemo(() => detectChartType(columns, rows), [columns, rows])

  // If no data or not chartable, return null
  if (rowCount === 0 || columns.length < 2) {
    return (
      <div className={`rounded-lg border border-dashed border-border p-8 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          Insufficient data for visualization. Need at least 2 columns and 1 row.
        </p>
      </div>
    )
  }

  // First column is X-axis, remaining are Y-axis metrics
  const xAxisKey = columns[0]
  const yAxisKeys = columns.slice(1)

  const commonProps = {
    width: 500,
    height: 300,
    data: chartData,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
  }

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${className}`}
      role="img"
      aria-label={`${chartType} chart showing ${yAxisKeys.join(', ')} over ${xAxisKey}`}
    >
      <ResponsiveContainer width="100%" height={300}>
        {chartType === 'bar' ? (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            {yAxisKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[idx % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            {yAxisKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            {yAxisKeys.map((key, idx) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {Math.min(20, rowCount)} of {rowCount} rows</span>
        <span className="capitalize">{chartType} chart</span>
      </div>
    </div>
  )
}

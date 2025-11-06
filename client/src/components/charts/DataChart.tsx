/**
 * DataChart Component - Intelligent data visualization
 *
 * Auto-detects the best chart type based on data structure:
 * - Bar charts for categorical comparisons
 * - Line charts for time series
 * - Area charts for cumulative data
 *
 * Features:
 * - Smart X-axis detection (uses first non-numeric column)
 * - Human-readable number formatting (converts scientific notation)
 * - Intelligent chart type detection
 * - Responsive design
 * - Smooth animations
 * - Accessibility support
 * - TypeScript strict typing
 */

import { useMemo } from "react";
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
} from "recharts";
import type { QueryResults } from "@/types/genie";

interface DataChartProps {
  results: QueryResults;
  className?: string;
}

type ChartType = "bar" | "line" | "area";

interface TransformedDataPoint {
  [key: string]: string | number | null;
}

/**
 * Format large numbers with K, M, B, T suffixes
 * Handles scientific notation and converts to human-readable format
 *
 * @example
 * formatNumber(2.42E10) // "24.2B"
 * formatNumber(1500000) // "1.5M"
 * formatNumber(5000) // "5K"
 * formatNumber(42.7) // "42.7"
 */
function formatNumber(value: number): string {
  // Handle scientific notation and very large numbers
  const absValue = Math.abs(value);

  if (absValue >= 1e12) {
    return `${(value / 1e12).toFixed(1)}T`;
  }
  if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }

  // For smaller numbers, show appropriate decimal places
  if (absValue < 1 && absValue > 0) {
    return value.toFixed(3);
  }
  if (absValue < 100) {
    return value.toFixed(2);
  }

  return value.toLocaleString();
}

/**
 * Check if a value looks like a date/time string
 *
 * @example
 * isDateLike("2024-01-15") // true
 * isDateLike("January") // true
 * isDateLike("Q4 2023") // true
 * isDateLike("Product A") // false
 */
function isDateLike(value: unknown): boolean {
  if (typeof value !== "string") return false;

  const str = value.toLowerCase();

  // Check for date patterns
  if (/^\d{4}[-/]/.test(value)) return true; // 2024-01-15, 2024/01/15
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(value)) return true; // 01-15-2024, 1/15/24

  // Check for month names
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  if (months.some((month) => str.includes(month))) return true;

  // Check for quarter patterns
  if (/q[1-4]/i.test(value)) return true;

  // Check for year patterns
  if (/\b(19|20)\d{2}\b/.test(value)) return true;

  return false;
}

/**
 * Check if a column name suggests time series data
 */
function isTimeColumn(columnName: string): boolean {
  const lower = columnName.toLowerCase();
  const timeKeywords = [
    "date",
    "time",
    "year",
    "month",
    "day",
    "quarter",
    "week",
    "period",
    "timestamp",
  ];
  return timeKeywords.some((keyword) => lower.includes(keyword));
}

/**
 * Check if a value is numeric
 */
function isNumeric(value: unknown): boolean {
  if (typeof value === "number") return !isNaN(value) && isFinite(value);
  if (typeof value === "string") {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }
  return false;
}

/**
 * Find the best column to use as X-axis
 * Priority:
 * 1. First column that looks like a date/time
 * 2. First non-numeric column
 * 3. First column (if all are numeric)
 *
 * @returns Object with columnIndex and columnName, or null if no data
 */
function findXAxisColumn(
  columns: string[],
  rows: unknown[][],
): { index: number; name: string } | null {
  if (rows.length === 0 || columns.length === 0) return null;

  // Check first row for column type detection
  const firstRow = rows[0];

  // Priority 1: Find time-related column (by name or value)
  for (let i = 0; i < columns.length; i++) {
    if (isTimeColumn(columns[i]) || isDateLike(firstRow[i])) {
      return { index: i, name: columns[i] };
    }
  }

  // Priority 2: Find first non-numeric column
  for (let i = 0; i < columns.length; i++) {
    const value = firstRow[i];
    if (!isNumeric(value)) {
      return { index: i, name: columns[i] };
    }
  }

  // Priority 3: Use first column as fallback
  return { index: 0, name: columns[0] };
}

/**
 * Detect which columns are numeric (for Y-axis)
 * Excludes the X-axis column
 */
function getNumericColumns(
  columns: string[],
  rows: unknown[][],
  xAxisIndex: number,
): string[] {
  if (rows.length === 0) return [];

  return columns.filter((col, idx) => {
    // Skip the X-axis column
    if (idx === xAxisIndex) return false;

    // Check if this column has numeric values
    const value = rows[0][idx];
    return isNumeric(value);
  });
}

/**
 * Auto-detect the best chart type based on data characteristics
 *
 * Detection logic:
 * - Line chart: Time series data, trend data, many data points
 * - Area chart: Cumulative data (total, sum, cumulative in column name)
 * - Bar chart: Categorical comparisons, few data points
 */
function detectChartType(
  columns: string[],
  rows: unknown[][],
  xAxisColumn: { index: number; name: string } | null,
): ChartType {
  if (rows.length === 0 || !xAxisColumn) return "bar";

  const xAxisValue = rows[0][xAxisColumn.index];
  const xAxisName = xAxisColumn.name.toLowerCase();

  // Check if X-axis is time-related (date, month, year, etc.)
  if (isTimeColumn(xAxisName) || isDateLike(xAxisValue)) {
    return "line";
  }

  // Check column names for cumulative indicators
  const columnNameStr = columns.join(" ").toLowerCase();
  if (
    columnNameStr.includes("total") ||
    columnNameStr.includes("cumulative") ||
    columnNameStr.includes("sum")
  ) {
    return "area";
  }

  // If many data points (>10), prefer line chart for trends
  if (rows.length > 10) {
    return "line";
  }

  // Check if data appears sequential/ordered
  if (typeof xAxisValue === "number") {
    // Sequential numeric data suggests a trend
    return "line";
  }

  // Default to bar chart for categorical comparisons
  return "bar";
}

/**
 * Transform query results into Recharts format
 * Uses smart X-axis detection instead of generic labels
 */
function transformData(
  columns: string[],
  rows: unknown[][],
  xAxisColumn: { index: number; name: string } | null,
): TransformedDataPoint[] {
  const maxPoints = 15; // Limit to 15 points for readability
  const limitedRows = rows.slice(0, maxPoints);

  return limitedRows.map((row, rowIndex) => {
    const dataPoint: TransformedDataPoint = {};

    // Add X-axis value (or fallback to row number)
    if (xAxisColumn) {
      const xValue = row[xAxisColumn.index];
      dataPoint["_xAxis"] =
        xValue !== null && xValue !== undefined
          ? String(xValue)
          : `#${rowIndex + 1}`;
    } else {
      dataPoint["_xAxis"] = `#${rowIndex + 1}`;
    }

    // Add all column values
    columns.forEach((col, idx) => {
      const value = row[idx];
      // Convert numeric strings and handle scientific notation
      if (typeof value === "string" && isNumeric(value)) {
        dataPoint[col] = parseFloat(value);
      } else if (typeof value === "number") {
        dataPoint[col] = value;
      } else {
        dataPoint[col] = value as string | null;
      }
    });

    return dataPoint;
  });
}

/**
 * Custom tooltip that shows all data with human-readable formatting
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TransformedDataPoint }>;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "0.5rem",
        padding: "0.75rem",
        maxWidth: "300px",
      }}
    >
      {Object.entries(data).map(([key, value]) => {
        // Skip internal keys
        if (key.startsWith("_")) return null;

        // Format values for display
        let displayValue: string;
        if (typeof value === "number") {
          displayValue = formatNumber(value);
        } else if (value === null || value === undefined) {
          displayValue = "N/A";
        } else {
          displayValue = String(value);
        }

        return (
          <div key={key} style={{ marginBottom: "0.25rem" }}>
            <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>
              {key}:
            </span>{" "}
            <span style={{ color: "hsl(var(--muted-foreground))" }}>
              {displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Intelligent color palette for data visualization
 */
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(24, 100%, 50%)",
];

export function DataChart({ results, className = "" }: DataChartProps) {
  // Early return if results is undefined or missing required properties
  if (!results || !results.columns || !results.rows) {
    return null;
  }

  const { columns, rows, rowCount } = results;

  // Memoized data processing
  const xAxisColumn = useMemo(
    () => findXAxisColumn(columns, rows),
    [columns, rows],
  );
  const numericColumns = useMemo(
    () => getNumericColumns(columns, rows, xAxisColumn?.index ?? -1),
    [columns, rows, xAxisColumn],
  );
  const chartData = useMemo(
    () => transformData(columns, rows, xAxisColumn),
    [columns, rows, xAxisColumn],
  );
  const chartType = useMemo(
    () => detectChartType(columns, rows, xAxisColumn),
    [columns, rows, xAxisColumn],
  );

  // If no data or not chartable, return null
  if (rowCount === 0 || numericColumns.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed border-border p-8 text-center ${className}`}
      >
        <p className="text-sm text-muted-foreground">
          {rowCount === 0
            ? "No data available for visualization."
            : "No numeric columns found for visualization."}
        </p>
      </div>
    );
  }

  const xAxisKey = "_xAxis";
  const xAxisLabel = xAxisColumn?.name ?? "Index";

  const commonProps = {
    width: 500,
    height: 300,
    data: chartData,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
  };

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${className}`}
      role="img"
      aria-label={`${chartType} chart showing ${numericColumns.join(", ")} by ${xAxisLabel}`}
    >
      <ResponsiveContainer width="100%" height={300}>
        {chartType === "bar" ? (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
              label={{
                value: xAxisLabel,
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {numericColumns.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[idx % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : chartType === "line" ? (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
              label={{
                value: xAxisLabel,
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {numericColumns.map((key, idx) => (
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
              tick={{ fill: "hsl(var(--foreground))" }}
              label={{
                value: xAxisLabel,
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {numericColumns.map((key, idx) => (
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
        <span>
          Showing top {Math.min(15, rowCount)} of {rowCount} rows
        </span>
        <span className="capitalize">
          {chartType} chart • Hover for details
        </span>
      </div>
    </div>
  );
}

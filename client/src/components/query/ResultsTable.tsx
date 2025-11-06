/**
 * Results Table Component
 *
 * Displays query results in a sortable, paginated table.
 * Uses TanStack Table for advanced table features.
 */

import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { QueryResults } from '@/types/genie'

interface ResultsTableProps {
  results: QueryResults
  sql?: string
}

// Helper function to format cell values
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  // Check if it's a number (including scientific notation)
  const numValue = Number(value)
  if (!isNaN(numValue) && typeof value !== 'boolean') {
    // Format large numbers with thousand separators
    if (Math.abs(numValue) >= 1000) {
      // If it has decimals, show up to 2 decimal places
      if (numValue % 1 !== 0) {
        return numValue.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      }
      // Integer formatting with thousand separators
      return numValue.toLocaleString('en-US')
    }
    // Small numbers - show as is with up to 2 decimals
    return numValue % 1 !== 0
      ? numValue.toFixed(2)
      : String(numValue)
  }

  // Return as string for non-numeric values
  return String(value)
}

export function ResultsTable({ results, sql }: ResultsTableProps) {
  // Create columns from query results
  const columns = useMemo<ColumnDef<any>[]>(() => {
    return results.columns.map((col, index) => ({
      accessorFn: (row) => row[index],
      id: col,
      header: col,
      cell: ({ getValue }) => {
        const value = getValue()
        return formatCellValue(value)
      },
    }))
  }, [results.columns])

  // Convert rows to objects for react-table
  const data = useMemo(() => results.rows, [results.rows])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card className="w-full border-2 border-primary/20 shadow-xl bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="border-b border-primary/10 bg-primary/5">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-primary">Query Results ({results.rowCount} rows)</span>
          </div>
          {results.truncated && (
            <div className="flex items-center gap-2 text-sm bg-accent/10 text-accent px-3 py-1 rounded-lg border border-accent/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Results limited to 1000 rows
            </div>
          )}
        </CardTitle>
        {sql && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Generated SQL</span>
            </div>
            <pre className="text-xs bg-primary/5 border border-primary/10 p-3 rounded-lg overflow-x-auto font-mono">
              {sql}
            </pre>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="rounded-lg border-2 border-border overflow-hidden shadow-inner">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-primary/10 backdrop-blur-sm z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b-2 border-primary/20 hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="whitespace-nowrap font-bold text-primary bg-primary/10 border-r border-primary/10 last:border-r-0"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className={`
                        ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                        hover:bg-primary/5 transition-colors smooth-transition
                      `}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="whitespace-nowrap border-r border-border/50 last:border-r-0 font-medium"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-32 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <svg className="w-12 h-12 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span className="font-medium">No results found</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

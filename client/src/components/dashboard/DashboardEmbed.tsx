/**
 * Dashboard Embed Component
 *
 * Renders the Databricks dashboard in a secure iframe.
 * Handles loading states, errors, and token refresh.
 */

import { useEffect, useRef } from 'react'
import { useDashboardConfig } from '@/hooks/useDashboard'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardEmbed() {
  const { data: config, isLoading, error } = useDashboardConfig()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Handle iframe load events
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      console.log('Dashboard loaded successfully')
    }

    const handleError = () => {
      console.error('Dashboard failed to load')
    }

    iframe.addEventListener('load', handleLoad)
    iframe.addEventListener('error', handleError)

    return () => {
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleError)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col gap-4 p-6 bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg border-2 border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg pulse-subtle">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-primary">Loading Dashboard...</h3>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full p-8 bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg border-2 border-destructive/20">
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg text-destructive mb-2">Dashboard Error</h3>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="w-full h-full p-8 bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg border-2 border-accent/20">
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div className="p-4 bg-accent/10 rounded-full">
            <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg text-accent mb-2">Dashboard Unavailable</h3>
            <p className="text-sm text-muted-foreground">
              No dashboard configuration available.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {/* Dashboard Preview Card with Open Button */}
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg border-2 border-border p-8">
        <div className="text-center space-y-6 max-w-md">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          {/* Title and Description */}
          <div>
            <h3 className="text-2xl font-bold text-primary mb-2">
              Nielsen Sales Analytics Dashboard
            </h3>
            <p className="text-muted-foreground">
              View your interactive dashboard with real-time sales metrics, trends, and insights.
            </p>
          </div>

          {/* Open Dashboard Button */}
          <a
            href={config.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Dashboard in New Tab
          </a>

          {/* Info Note */}
          <div className="text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg border border-border/50">
            <p>
              <strong>Note:</strong> Due to security policies, the dashboard opens in a new tab
              for the best experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

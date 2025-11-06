/**
 * Dashboard Controls Component
 *
 * Provides controls for refreshing and managing the dashboard view.
 */

import { Button } from '@/components/ui/button'
import { useRefreshDashboardToken } from '@/hooks/useDashboard'

interface DashboardControlsProps {
  onRefresh?: () => void
}

export function DashboardControls({ onRefresh }: DashboardControlsProps) {
  const { mutate: refreshToken, isPending } = useRefreshDashboardToken()

  const handleRefresh = () => {
    refreshToken()
    onRefresh?.()
  }

  return (
    <div className="flex items-center gap-2 p-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isPending}
      >
        {isPending ? 'Refreshing...' : 'Refresh Dashboard'}
      </Button>
    </div>
  )
}

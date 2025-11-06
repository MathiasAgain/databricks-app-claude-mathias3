import AnalyticsPage from "./pages/AnalyticsPage"
import DataExportPage from "./pages/DataExportPage"
import { DashboardEmbed } from "@/components/dashboard/DashboardEmbed"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header - Orkla Professional Design */}
      <header className="bg-gradient-to-r from-primary via-primary to-secondary border-b-4 border-accent shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="fade-in">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Nielsen Sales Analytics Assistant
              </h1>
              <p className="text-primary-foreground/90 mt-2 text-sm font-medium">
                Powered by Databricks Genie AI & Claude
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 fade-in">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <p className="text-xs text-white/80 uppercase tracking-wider font-semibold">
                  Orkla Data Intelligence
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
              </svg>
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsPage />
          </TabsContent>

          <TabsContent value="dashboard">
            <div className="bg-card rounded-xl border-2 border-border shadow-lg overflow-hidden h-[600px]">
              <DashboardEmbed />
            </div>
          </TabsContent>

          <TabsContent value="export">
            <DataExportPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App

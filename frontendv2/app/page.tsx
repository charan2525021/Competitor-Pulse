"use client"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { HomeView } from "@/components/views/home-view"
import { DashboardView } from "@/components/views/dashboard-view"
import { LeadGenView } from "@/components/views/leadgen-view"
import { FormFillerView } from "@/components/views/formfiller-view"
import { IntelDatabaseView } from "@/components/views/intel-database-view"
import { DocsView } from "@/components/views/docs-view"
import { StrategyEngine } from "@/components/dashboard/strategy-engine"
import { AgentView } from "@/components/dashboard/agent-view"
import { HistoryView } from "@/components/dashboard/history-view"
import { SettingsView } from "@/components/dashboard/settings-view"
import type { NavItem, AnalysisResult } from "@/lib/types"

export default function Home() {
  const [activeNavItem, setActiveNavItem] = useState<NavItem>("home")
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null)

  const handleAnalysisComplete = (result: unknown) => {
    setAnalysisData(result as AnalysisResult)
  }

  const handleNavigate = (view: string) => {
    setActiveNavItem(view as NavItem)
  }

  const renderView = () => {
    switch (activeNavItem) {
      case "home":
        return (
          <HomeView 
            onAnalysisComplete={handleAnalysisComplete}
            onNavigate={handleNavigate}
          />
        )
      case "dashboard":
        return (
          <DashboardView 
            analysisData={analysisData || undefined}
            onRefresh={() => {}}
            onExport={() => {}}
          />
        )
      case "agent":
        return <AgentView />
      case "strategy":
        return <StrategyEngine />
      case "leads":
        return <LeadGenView />
      case "forms":
        return <FormFillerView />
      case "intel":
        return <IntelDatabaseView />
      case "history":
        return <HistoryView />
      case "docs":
        return <DocsView />
      case "settings":
        return <SettingsView />
      default:
        return (
          <HomeView 
            onAnalysisComplete={handleAnalysisComplete}
            onNavigate={handleNavigate}
          />
        )
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        activeItem={activeNavItem} 
        onItemClick={setActiveNavItem} 
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-6">
          {renderView()}
        </div>
      </main>
    </div>
  )
}

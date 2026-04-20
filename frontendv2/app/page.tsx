"use client"

import { useState, useEffect } from "react"
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
import { LandingPage } from "@/components/views/landing-page"
import { LoginPage } from "@/components/views/login-page"
import { SignupPage } from "@/components/views/signup-page"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import type { NavItem, AnalysisResult } from "@/lib/types"

type AuthView = "landing" | "login" | "signup"

function AppContent() {
  const [activeNavItem, setActiveNavItem] = useState<NavItem>("home")
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null)
  const [authView, setAuthView] = useState<AuthView>("landing")
  const [verifiedStatus, setVerifiedStatus] = useState<string | null>(null)
  const { isAuthenticated, loading } = useAuth()

  // Check URL params for verification status or Google OAuth token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verified = params.get("verified")
    if (verified) {
      setVerifiedStatus(verified)
      setAuthView("login")
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (authView === "signup") {
      return (
        <SignupPage
          onSignupComplete={() => setAuthView("login")}
          onSwitchToLogin={() => setAuthView("login")}
        />
      )
    }

    if (authView === "login") {
      return (
        <LoginPage
          onLogin={() => setAuthView("landing")}
          onSwitchToSignup={() => setAuthView("signup")}
          verifiedStatus={verifiedStatus}
        />
      )
    }

    return <LandingPage onGetStarted={() => setAuthView("login")} />
  }

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
        <div className="min-h-full p-6">
          {renderView()}
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

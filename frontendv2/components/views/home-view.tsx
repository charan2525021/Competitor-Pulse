"use client"

import { useState } from "react"
import { ChatInput } from "@/components/chat-input"
import { LiveLogs, LogEntry } from "@/components/live-logs"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Sparkles, 
  Zap, 
  Shield, 
  BarChart3,
  Globe,
  Clock,
  CheckCircle2
} from "lucide-react"
import { useAgentLogs } from "@/hooks/use-agent-logs"

interface HomeViewProps {
  onAnalysisComplete?: (result: unknown) => void
  onNavigate?: (view: string) => void
}

export function HomeView({ onAnalysisComplete, onNavigate }: HomeViewProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { logs, isRunning, startAnalysis } = useAgentLogs()

  const handleSubmit = async (url: string) => {
    setIsAnalyzing(true)
    const result = await startAnalysis(url)
    setIsAnalyzing(false)
    if (result && onAnalysisComplete) {
      onAnalysisComplete(result)
      onNavigate?.("dashboard")
    }
  }

  const features = [
    {
      icon: Zap,
      title: "Real-time Analysis",
      description: "AI-powered browser agent extracts data in seconds",
    },
    {
      icon: Shield,
      title: "Comprehensive Intel",
      description: "Pricing, jobs, reviews, and strategic insights",
    },
    {
      icon: BarChart3,
      title: "Actionable Strategy",
      description: "GTM plans, market sizing, and positioning",
    },
  ]

  const recentAnalyses = [
    { domain: "stripe.com", time: "2 hours ago", status: "complete" },
    { domain: "notion.so", time: "5 hours ago", status: "complete" },
    { domain: "linear.app", time: "1 day ago", status: "complete" },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <ScrollReveal direction="up" delay={0}>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-8">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Powered Intelligence
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
              Understand Your Competition in{" "}
              <span className="text-primary">Minutes</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              CompetitorPulse uses advanced AI agents to automatically analyze competitor 
              websites, extract pricing data, job postings, reviews, and generate 
              strategic recommendations.
            </p>
          </div>
        </ScrollReveal>

        {/* Chat Input */}
        <ScrollReveal direction="up" delay={100} className="w-full max-w-2xl mx-auto mb-8">
          <ChatInput 
            onSubmit={handleSubmit}
            isLoading={isAnalyzing}
            placeholder="Enter competitor URL (e.g., stripe.com)"
          />
        </ScrollReveal>

        {/* Live Logs (shown during analysis) */}
        {(isRunning || logs.length > 0) && (
          <ScrollReveal direction="up" delay={200} className="w-full max-w-4xl mx-auto mb-8">
            <LiveLogs 
              logs={logs}
              isRunning={isRunning}
              title="Agent Analysis"
              maxHeight="300px"
            />
          </ScrollReveal>
        )}

        {/* Features */}
        {!isRunning && logs.length === 0 && (
          <ScrollReveal direction="up" delay={200} className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <Card 
                  key={feature.title}
                  className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* Recent Analyses */}
      {!isRunning && logs.length === 0 && (
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Analyses</h3>
              <button 
                className="text-sm text-primary hover:underline"
                onClick={() => onNavigate?.("history")}
              >
                View all
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {recentAnalyses.map((analysis) => (
                <button
                  key={analysis.domain}
                  onClick={() => handleSubmit(`https://${analysis.domain}`)}
                  className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm border border-border hover:border-primary/30 transition-colors"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{analysis.domain}</span>
                  <span className="text-muted-foreground">•</span>
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">{analysis.time}</span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

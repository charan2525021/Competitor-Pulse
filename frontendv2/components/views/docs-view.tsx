"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"
import {
  Book,
  Code,
  Zap,
  Shield,
  Globe,
  Database,
  FileText,
  ChevronRight,
  Search,
  ExternalLink,
  Terminal,
  Cpu,
  Layers
} from "lucide-react"

interface DocSection {
  id: string
  title: string
  description: string
  icon: React.ElementType
  articles: Array<{
    title: string
    description: string
    badge?: string
  }>
}

const docSections: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of CompetitorPulse",
    icon: Zap,
    articles: [
      { title: "Quick Start Guide", description: "Get up and running in 5 minutes", badge: "Popular" },
      { title: "Understanding the Dashboard", description: "Navigate the main interface" },
      { title: "Your First Analysis", description: "Run your first competitor analysis" },
      { title: "Interpreting Results", description: "Make sense of the data" },
    ],
  },
  {
    id: "features",
    title: "Core Features",
    description: "Deep dive into each feature",
    icon: Layers,
    articles: [
      { title: "AI Browser Agent", description: "How our AI navigates and extracts data" },
      { title: "Pricing Analysis", description: "Understand competitor pricing strategies" },
      { title: "Job Trend Tracking", description: "Monitor hiring patterns" },
      { title: "Review Sentiment", description: "Analyze customer feedback at scale" },
      { title: "Strategy Engine", description: "Generate actionable recommendations", badge: "New" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "Connect with your tools",
    icon: Database,
    articles: [
      { title: "API Reference", description: "Full REST API documentation" },
      { title: "Webhooks", description: "Real-time event notifications" },
      { title: "Slack Integration", description: "Get alerts in Slack" },
      { title: "Zapier Automation", description: "Connect to 5000+ apps" },
    ],
  },
  {
    id: "security",
    title: "Security & Privacy",
    description: "How we protect your data",
    icon: Shield,
    articles: [
      { title: "Data Handling", description: "How we collect and store data" },
      { title: "Compliance", description: "GDPR, SOC 2, and more" },
      { title: "Access Control", description: "Team permissions and roles" },
    ],
  },
]

const codeExamples = [
  {
    title: "Start Analysis",
    language: "javascript",
    code: `const result = await pulse.analyze({
  url: "https://competitor.com",
  options: {
    pricing: true,
    jobs: true,
    reviews: true
  }
});`,
  },
  {
    title: "Search Leads",
    language: "javascript",
    code: `const leads = await pulse.leads.search({
  company: "Acme Inc",
  role: "Engineering",
  limit: 50
});`,
  },
]

export function DocsView() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">Learn how to use CompetitorPulse effectively</p>
        </div>
        <Button variant="outline" size="sm">
          <ExternalLink className="mr-2 h-4 w-4" />
          API Reference
        </Button>
      </div>

      {/* Search */}
      <ScrollReveal delay={100}>
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Quick Links */}
      <ScrollReveal delay={150}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Terminal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Quick Start</h3>
                <p className="text-sm text-muted-foreground">5 minute setup guide</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Code className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">API Docs</h3>
                <p className="text-sm text-muted-foreground">Full reference</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Cpu className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold">AI Agent</h3>
                <p className="text-sm text-muted-foreground">How it works</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </div>
      </ScrollReveal>

      {/* Documentation Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {docSections.map((section, index) => (
          <ScrollReveal key={section.id} delay={200 + index * 50}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.articles.map((article) => (
                    <li key={article.title}>
                      <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm group-hover:text-primary transition-colors">
                              {article.title}
                            </span>
                            {article.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {article.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {article.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </ScrollReveal>
        ))}
      </div>

      {/* Code Examples */}
      <ScrollReveal delay={400}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Code Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {codeExamples.map((example) => (
                <div key={example.title} className="rounded-lg border bg-muted/30 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                    <span className="text-sm font-medium">{example.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {example.language}
                    </Badge>
                  </div>
                  <pre className="p-4 text-sm overflow-x-auto font-mono">
                    <code className="text-foreground/80">{example.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Help */}
      <ScrollReveal delay={450}>
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6 text-center">
            <Book className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="font-semibold text-lg mb-2">Need More Help?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Can&apos;t find what you&apos;re looking for? Our support team is here to help.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline">Join Discord</Button>
              <Button>Contact Support</Button>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  )
}

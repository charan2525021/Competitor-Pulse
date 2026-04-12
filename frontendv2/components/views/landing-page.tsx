"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollReveal } from "@/components/scroll-reveal"
import {
  Zap, Shield, BarChart3, Users, FileText, Target, Database,
  ArrowRight, CheckCircle2, Star, Globe, Bot, TrendingUp, Clock,
  Mail, Phone, MapPin, Send, Play, Sparkles,
  Search, DollarSign, Briefcase, MousePointer2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LandingPageProps {
  onGetStarted: () => void
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" })
  const [contactSent, setContactSent] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  // Auto-playing demo state — triggered on scroll into view
  const [demoPhase, setDemoPhase] = useState<"waiting" | "typing" | "clicking" | "scanning" | "running" | "done">("waiting")
  const [scanProgress, setScanProgress] = useState(0)
  const [scanText, setScanText] = useState("")
  const [demoTypedQuery, setDemoTypedQuery] = useState("")
  const [demoLogs, setDemoLogs] = useState<{ type: string; message: string; url?: string; timestamp: string }[]>([])
  const [demoCompetitors, setDemoCompetitors] = useState<{ name: string; domain: string; rating: number; pricing: string; jobs: number; color: string }[]>([])
  const [btnClicked, setBtnClicked] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const demoTimerRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const demoTerminalRef = useRef<HTMLDivElement>(null)
  const demoSectionRef = useRef<HTMLDivElement>(null)
  const demoStartedRef = useRef(false)

  const DEMO_COMPETITORS = [
    { name: "Microsoft Teams", domain: "microsoft.com/teams", rating: 4.3, pricing: "$4–$12.50/mo", jobs: 142, color: "border-blue-500/40 bg-blue-500/5" },
    { name: "Discord", domain: "discord.com", rating: 4.6, pricing: "Free / $9.99/mo", jobs: 23, color: "border-indigo-500/40 bg-indigo-500/5" },
    { name: "Zoom", domain: "zoom.us", rating: 4.4, pricing: "Free / $13.33/mo", jobs: 87, color: "border-sky-500/40 bg-sky-500/5" },
    { name: "Google Chat", domain: "chat.google.com", rating: 4.1, pricing: "$6–$18/mo", jobs: 56, color: "border-green-500/40 bg-green-500/5" },
    { name: "Webex", domain: "webex.com", rating: 4.2, pricing: "Free / $13.50/mo", jobs: 34, color: "border-teal-500/40 bg-teal-500/5" },
  ]

  const DEMO_PILLS = [
    { label: "AI Agent", icon: Bot, color: "text-primary bg-primary/10 border-primary/20" },
    { label: "Pricing Intel", icon: TrendingUp, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { label: "Job Tracker", icon: Briefcase, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    { label: "Strategy", icon: Target, color: "text-red-500 bg-red-500/10 border-red-500/20" },
    { label: "Lead Gen", icon: Users, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Form Filler", icon: FileText, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
    { label: "Dashboard", icon: BarChart3, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
    { label: "Intel DB", icon: Database, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
    { label: "History", icon: Clock, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  ]

  const DEMO_FEATURES = [
    { icon: Zap, title: "Real-time Analysis", desc: "AI-powered browser agent extracts data in seconds" },
    { icon: Shield, title: "Comprehensive Intel", desc: "Pricing, jobs, reviews, and strategic insights" },
    { icon: BarChart3, title: "Actionable Strategy", desc: "GTM plans, market sizing, and positioning" },
  ]

  // Auto-scroll terminal only (not the page)
  useEffect(() => {
    const el = demoTerminalRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [demoLogs])

  // Trigger demo when section scrolls into view
  useEffect(() => {
    const el = demoSectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !demoStartedRef.current) {
          demoStartedRef.current = true
          startDemoSequence()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => { observer.disconnect(); demoTimerRef.current.forEach(clearTimeout) }
  }, [])

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms)
    demoTimerRef.current.push(t)
    return t
  }

  const startDemoSequence = useCallback(() => {
    // Phase 1: Type "Slack" letter by letter
    const word = "Slack"
    setDemoPhase("typing")
    let charIdx = 0
    const typeInterval = setInterval(() => {
      charIdx++
      setDemoTypedQuery(word.slice(0, charIdx))
      if (charIdx >= word.length) {
        clearInterval(typeInterval)
        // Phase 2: "Click" the button
        addTimer(() => {
          setDemoPhase("clicking")
          setBtnClicked(true)
          // Phase 3: Show scanning animation
          addTimer(() => {
            setBtnClicked(false)
            setShowTerminal(true)
            setDemoPhase("scanning")
            // Animate scanning progress
            const scanSteps = [
              { text: "Connecting to AI engine...", pct: 10 },
              { text: "Analyzing \"Slack\" market position...", pct: 25 },
              { text: "Identifying competitor landscape...", pct: 45 },
              { text: "Mapping industry verticals...", pct: 65 },
              { text: "Preparing web agent for extraction...", pct: 85 },
              { text: "Agent ready — launching scan...", pct: 100 },
            ]
            scanSteps.forEach((step, i) => {
              addTimer(() => {
                setScanText(step.text)
                setScanProgress(step.pct)
                if (i === scanSteps.length - 1) {
                  // Phase 4: Start real logs
                  addTimer(() => {
                    setDemoPhase("running")
                    runAutoDemo()
                  }, 500)
                }
              }, i * 450)
            })
          }, 600)
        }, 500)
      }
    }, 140)
    demoTimerRef.current.push(typeInterval as unknown as ReturnType<typeof setTimeout>)
  }, [])

  const runAutoDemo = useCallback(() => {
    setDemoLogs([])
    setDemoCompetitors([])

    const fakeLogs: { type: string; message: string; url?: string; competitor?: number }[] = [
      { type: "info", message: "Initializing AI agent for \"Slack\"..." },
      { type: "action", message: "Planning analysis strategy with LLM...", url: "groq.com/api" },
      { type: "info", message: "Agent plan: identify competitors → extract pricing → scan jobs → collect reviews" },
      { type: "action", message: "Navigating to slack.com...", url: "slack.com" },
      { type: "info", message: "Extracting product positioning and feature list..." },
      { type: "success", message: "Identified 5 direct competitors via market analysis" },
      { type: "action", message: "Visiting microsoft.com/teams/pricing...", url: "microsoft.com/teams/pricing", competitor: 0 },
      { type: "success", message: "Microsoft Teams — 4 pricing tiers extracted ($4–$12.50/user/mo)" },
      { type: "action", message: "Navigating to discord.com/company...", url: "discord.com/company", competitor: 1 },
      { type: "success", message: "Discord — Free tier + Nitro $9.99/mo, 23 open positions" },
      { type: "action", message: "Scanning zoom.us/pricing...", url: "zoom.us/pricing", competitor: 2 },
      { type: "success", message: "Zoom — 4 plans from Free to $21.99/mo, 87 jobs posted" },
      { type: "action", message: "Visiting workspace.google.com...", url: "workspace.google.com", competitor: 3 },
      { type: "success", message: "Google Chat — Bundled with Workspace $6–$18/user/mo" },
      { type: "action", message: "Extracting data from webex.com...", url: "webex.com", competitor: 4 },
      { type: "success", message: "Webex — Free + 3 paid tiers, 34 open positions" },
      { type: "action", message: "Collecting reviews from G2 and Capterra...", url: "g2.com" },
      { type: "success", message: "Aggregated 847 reviews across all 5 competitors" },
      { type: "action", message: "Running strategic analysis with Groq LLM..." },
      { type: "info", message: "Generating competitive positioning matrix..." },
      { type: "success", message: "✓ Analysis complete — 5 competitors, 342 data points, 847 reviews" },
    ]

    fakeLogs.forEach((log, i) => {
      addTimer(() => {
        const entry = { type: log.type, message: log.message, url: log.url, timestamp: new Date().toLocaleTimeString() }
        setDemoLogs(prev => [...prev, entry])

        if (log.competitor !== undefined) {
          setDemoCompetitors(prev => {
            if (prev.length <= log.competitor!) {
              return [...DEMO_COMPETITORS.slice(0, log.competitor! + 1)]
            }
            return prev
          })
        }

        if (i === fakeLogs.length - 1) {
          setDemoPhase("done")
          setDemoCompetitors([...DEMO_COMPETITORS])
        }
      }, (i + 1) * 650)
    })
  }, [])

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setContactSent(true)
    setTimeout(() => setContactSent(false), 3000)
    setContactForm({ name: "", email: "", message: "" })
  }

  const features = [
    { icon: TrendingUp, title: "Pricing Analysis", desc: "Automatically extract and compare competitor pricing plans from real pricing pages.", color: "text-blue-500" },
    { icon: Users, title: "Job Postings Tracker", desc: "Monitor competitor hiring activity. Discover their strategic priorities.", color: "text-amber-500" },
    { icon: Star, title: "Review Intelligence", desc: "Scrape G2, Capterra, and other review sites. Understand strengths and weaknesses.", color: "text-emerald-500" },
    { icon: FileText, title: "Blog & News Monitor", desc: "Stay on top of competitor announcements, feature launches, and content strategy.", color: "text-violet-500" },
    { icon: Bot, title: "Autonomous Form Filler", desc: "Automatically fill demo requests, contact forms, and signups with AI.", color: "text-rose-500" },
    { icon: Target, title: "AI Strategy Engine", desc: "Generate market breakdowns, distribution plans, and competitor weakness maps.", color: "text-cyan-500" },
    { icon: Globe, title: "Social Media Discovery", desc: "Find and monitor competitor social profiles across all major platforms.", color: "text-pink-500" },
    { icon: Database, title: "Intel Data Store", desc: "All intelligence is stored, categorized, and searchable. Export anytime.", color: "text-teal-500" },
  ]

  const steps = [
    { step: "01", title: "Enter Your Query", desc: "Type a natural language prompt or paste competitor URLs directly.", icon: Zap },
    { step: "02", title: "AI Plans & Navigates", desc: "The LLM generates an execution plan, then the web agent navigates autonomously.", icon: Bot },
    { step: "03", title: "Real-time Streaming", desc: "Watch agent progress live via SSE. See every page visited and data extracted.", icon: Clock },
    { step: "04", title: "Get Structured Intel", desc: "Receive organized reports with pricing, jobs, reviews, and strategic insights.", icon: BarChart3 },
  ]

  const capabilityTabs = [
    {
      label: "Dynamic SPA Navigation",
      title: "Navigate Any Modern Website",
      desc: "Our agent handles JavaScript-heavy SPAs, pop-ups, cookie banners, infinite scroll, and multi-step navigation.",
      items: ["Handles dynamic SPAs and JavaScript rendering", "Dismisses pop-ups and cookie banners automatically", "Navigates multi-page flows and pagination", "Headless or visible browser execution modes"],
    },
    {
      label: "Smart Form Filling",
      title: "Autonomous Form Interactions",
      desc: "Request demos, fill contact forms, sign up for trials — all autonomously with AI-resolved field mapping.",
      items: ["7+ form types: demo, contact, newsletter, trial, etc.", "AI resolves company names and auto-fills fields", "Profile management for multiple identities", "Full form fill history and status tracking"],
    },
    {
      label: "Lead Generation",
      title: "Intelligent Lead Generation",
      desc: "Discover potential leads, generate personalized outreach, and manage your pipeline — all from one place.",
      items: ["LinkedIn-based prospect discovery", "Email suggestion and verification", "AI-generated outreach messages", "Bulk operations and export capability"],
    },
    {
      label: "Strategy Engine",
      title: "AI-Powered Strategy Tools",
      desc: "Go beyond data collection. Generate market breakdowns and competitor maps using LLM-powered analysis.",
      items: ["Market breakdown analysis", "Distribution plan generation", "Competitor weakness mapping", "Actionable strategic recommendations"],
    },
  ]

  const plans = [
    {
      name: "Starter", price: "Free", period: "forever", desc: "Perfect for trying out competitive intelligence.",
      features: ["3 competitor scans/day", "Basic pricing analysis", "Job posting tracker", "Community support"],
      highlight: false,
    },
    {
      name: "Pro", price: "$49", period: "/month", desc: "For teams serious about competitive intelligence.",
      features: ["Unlimited scans", "All intel categories", "Form filler & lead gen", "AI strategy engine", "Priority support", "Data export"],
      highlight: true,
    },
    {
      name: "Enterprise", price: "Custom", period: "", desc: "For organizations with advanced security and scale needs.",
      features: ["Everything in Pro", "Custom integrations", "SSO & SAML", "Dedicated account manager", "SLA guarantee", "On-premise option"],
      highlight: false,
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-semibold">CompetitorPulse</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
          <Button onClick={onGetStarted} size="sm">
            Sign In <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="mb-2">
            <Sparkles className="mr-1 h-3 w-3" />
            Built for the TinyFish Hackathon 2026
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Stop Researching Competitors.{" "}
            <span className="text-primary">Let AI Do It For You.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            CompetitorPulse is an autonomous competitive intelligence agent that navigates real websites,
            extracts pricing, jobs, reviews, and more — saving your team <strong className="text-foreground">10-20 hours per week</strong>.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button size="lg" onClick={onGetStarted}>
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth" })}>
              <Play className="mr-2 h-4 w-4" /> Watch Demo
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-2xl mx-auto">
            {[
              { value: "10-20h", label: "Saved Per Week" },
              { value: "6+", label: "Intel Categories" },
              { value: "Real-time", label: "Live Streaming" },
              { value: "100%", label: "Autonomous" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features Spotlight — Lead Gen, ICP Form Fill, Market Strategy */}
      <section className="py-20 px-6 border-b border-border/50">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal direction="up">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-3">
                <Sparkles className="mr-1 h-3 w-3" />
                Core Capabilities
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Beyond Intel — <span className="text-primary">Full Go-To-Market Arsenal</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                CompetitorPulse doesn&apos;t just gather data. It generates leads, fills forms autonomously, and builds winning strategies — all powered by AI.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lead Generation */}
            <ScrollReveal delay={0}>
              <Card className="h-full border-emerald-500/30 hover:border-emerald-500/60 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/10 transition-colors" />
                <CardContent className="p-6 relative">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI Lead Generation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Discover high-quality prospects from competitor ecosystems. Our AI agent crawls LinkedIn, company pages, and directories to build targeted lead lists.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "LinkedIn-based prospect discovery",
                      "Email suggestion & verification",
                      "AI-generated personalized outreach",
                      "ICP scoring & lead prioritization",
                      "Bulk export to CRM",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      <span>Average 3x more qualified leads</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* ICP Form Fill */}
            <ScrollReveal delay={120}>
              <Card className="h-full border-violet-500/30 hover:border-violet-500/60 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-violet-500/10 transition-colors" />
                <CardContent className="p-6 relative">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-violet-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Autonomous Form Filler</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Request demos, fill contact forms, and sign up for competitor trials — all autonomously. The AI agent maps fields and fills them with your ICP profiles.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "7+ form types: demo, contact, trial, newsletter",
                      "AI-resolved field mapping & auto-fill",
                      "Multiple ICP profile management",
                      "Full form fill history & status tracking",
                      "Smart CAPTCHA and popup handling",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-violet-500 text-sm font-medium">
                      <Bot className="h-4 w-4" />
                      <span>100% hands-free form interactions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Market Strategy */}
            <ScrollReveal delay={240}>
              <Card className="h-full border-cyan-500/30 hover:border-cyan-500/60 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-cyan-500/10 transition-colors" />
                <CardContent className="p-6 relative">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-cyan-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI Strategy Engine</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Go beyond data. Generate GTM playbooks, market breakdowns, competitor weakness maps, and distribution plans — all from your intel data.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Market breakdown & TAM analysis",
                      "Distribution & GTM plan generation",
                      "Competitor weakness mapping",
                      "Positioning & messaging frameworks",
                      "Exportable strategy documents",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-cyan-500 text-sm font-medium">
                      <Sparkles className="h-4 w-4" />
                      <span>LLM-powered strategic recommendations</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Live Auto-Playing Demo — mirrors the app home screen */}
      <section id="live-demo" className="py-20 px-6 bg-gradient-to-b from-background via-muted/20 to-muted/40">
        <div className="max-w-5xl mx-auto" ref={demoSectionRef}>
          <ScrollReveal direction="up">
            <div className="text-center mb-10">
              <Badge variant="secondary" className="mb-3">
                <Play className="mr-1 h-3 w-3" />
                Live Demo
              </Badge>
              <h2 className="text-3xl font-bold mb-3">Watch the Agent Work</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                See how CompetitorPulse autonomously discovers and analyzes competitors — no clicks required.
              </p>
            </div>
          </ScrollReveal>

          {/* Demo Section — mirrors the real app home screen */}
          <ScrollReveal direction="up" delay={100}>
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 shadow-2xl shadow-primary/5 overflow-hidden relative">
              <div className="p-8 md:p-12 space-y-6">
                {/* App Header — mimics home page */}
                <div className="text-center space-y-3">
                  <Badge variant="secondary">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI-Powered Intelligence
                  </Badge>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Understand Your Competition in{" "}
                    <span className="text-primary">Minutes</span>
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    Enter a company name or URL to start AI-powered analysis
                  </p>
                </div>

                {/* Search Input with auto-typing + Run Analysis button */}
                <div className="max-w-2xl mx-auto relative">
                  <div className={cn(
                    "flex items-center gap-2 rounded-full border-2 bg-background px-4 py-2 transition-all duration-500",
                    demoPhase === "typing" ? "border-primary shadow-lg shadow-primary/20" : "border-border",
                    btnClicked && "border-primary shadow-xl shadow-primary/30",
                  )}>
                    <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-sm min-h-[28px] flex items-center">
                      {demoTypedQuery ? (
                        <span>{demoTypedQuery}</span>
                      ) : (
                        <span className="text-muted-foreground">Enter company name or URL (e.g., Slack, stripe.com)</span>
                      )}
                      {demoPhase === "typing" && (
                        <span className="inline-block h-5 w-0.5 bg-foreground animate-pulse ml-0.5" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      className={cn(
                        "rounded-full gap-2 transition-all duration-300 shrink-0",
                        btnClicked && "scale-95 ring-4 ring-primary/30 bg-primary/90",
                      )}
                    >
                      <Send className="h-4 w-4" />
                      Run Analysis
                    </Button>
                  </div>

                  {/* Animated cursor pointer */}
                  {(demoPhase === "typing" || demoPhase === "clicking") && (
                    <div className={cn(
                      "absolute transition-all duration-700 ease-in-out pointer-events-none z-10",
                      demoPhase === "typing" && "bottom-3 left-[45%]",
                      demoPhase === "clicking" && "bottom-3 right-8",
                    )}>
                      <MousePointer2 className="h-5 w-5 text-primary drop-shadow-lg fill-primary/20" />
                    </div>
                  )}

                  <p className={cn(
                    "text-center text-xs text-muted-foreground mt-2 transition-opacity duration-300",
                    demoPhase !== "waiting" && demoPhase !== "typing" && "opacity-0",
                  )}>
                    Enter a competitor&apos;s website URL to start AI-powered analysis
                  </p>
                </div>

                {/* Quick Action Pills — fade out when terminal appears */}
                <div className={cn(
                  "flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto transition-all duration-500",
                  showTerminal ? "opacity-0 h-0 overflow-hidden -mt-4" : "opacity-100",
                )}>
                  {DEMO_PILLS.map((pill, i) => (
                    <div
                      key={pill.label}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                        pill.color,
                      )}
                      style={{
                        animationDelay: `${i * 60}ms`,
                      }}
                    >
                      <pill.icon className="h-3.5 w-3.5" />
                      {pill.label}
                    </div>
                  ))}
                </div>

                {/* Feature Cards — fade out when terminal appears */}
                <div className={cn(
                  "grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto transition-all duration-500",
                  showTerminal ? "opacity-0 h-0 overflow-hidden -mt-4" : "opacity-100",
                )}>
                  {DEMO_FEATURES.map((f) => (
                    <div
                      key={f.title}
                      className="flex items-start gap-3 rounded-xl border bg-card/50 p-4 hover:border-primary/30 transition-all"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <f.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{f.title}</h4>
                        <p className="text-xs text-muted-foreground">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Scanning Animation + Terminal + Cards — slides in after button click */}
                {showTerminal && (
                  <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-5">
                    {/* AI Scanning Animation — shown before logs */}
                    {demoPhase === "scanning" && (
                      <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in fade-in duration-500">
                        {/* Animated radar / scanning visual */}
                        <div className="relative w-24 h-24">
                          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                          <div className="absolute inset-2 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
                          <div className="absolute inset-4 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Bot className="h-8 w-8 text-primary animate-pulse" />
                          </div>
                          {/* Orbiting dots */}
                          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2 w-2 rounded-full bg-primary" />
                          </div>
                          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 h-2 w-2 rounded-full bg-emerald-500" />
                          </div>
                        </div>

                        <div className="text-center space-y-3 max-w-sm">
                          <p className="text-sm font-medium text-foreground">{scanText}</p>
                          <div className="w-64 h-1.5 rounded-full bg-muted overflow-hidden mx-auto">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500 ease-out"
                              style={{ width: `${scanProgress}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">{scanProgress}% — Initializing AI agent</p>
                        </div>
                      </div>
                    )}

                    {/* Terminal + Competitor Cards — equal halves */}
                    {(demoPhase === "running" || demoPhase === "done") && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Terminal */}
                        <div>
                          <div className="rounded-xl border bg-background/80 overflow-hidden shadow-inner h-full flex flex-col">
                            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-mono text-xs text-muted-foreground">agent-terminal</span>
                              {demoPhase === "running" && (
                                <Badge className="ml-auto gap-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Streaming
                                </Badge>
                              )}
                              {demoPhase === "done" && (
                                <Badge className="ml-auto gap-1.5 bg-primary/10 text-primary border-primary/20 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Complete
                                </Badge>
                              )}
                            </div>
                            <div ref={demoTerminalRef} className="flex-1 min-h-[340px] max-h-[340px] overflow-y-auto p-4 font-mono text-xs space-y-1.5">
                              {demoLogs.map((log, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 py-0.5 animate-in fade-in slide-in-from-bottom-1 duration-300"
                                >
                                  <span className="text-muted-foreground/40 shrink-0">[{log.timestamp}]</span>
                                  {log.type === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                                  {log.type === "action" && <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                                  {log.type === "info" && <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/20 shrink-0 mt-0.5" />}
                                  <div className="flex flex-col gap-0.5">
                                    <span className={cn(
                                      log.type === "success" && "text-emerald-500",
                                      log.type === "action" && "text-primary",
                                      log.type === "info" && "text-muted-foreground",
                                    )}>
                                      {log.message}
                                    </span>
                                    {log.url && (
                                      <span className="text-muted-foreground/30 text-[10px]">→ {log.url}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {demoPhase === "running" && (
                                <div className="flex items-center gap-2 py-0.5">
                                  <span className="text-muted-foreground/40">[{new Date().toLocaleTimeString()}]</span>
                                  <span className="inline-block h-4 w-1.5 animate-pulse bg-primary rounded-sm" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Competitor Discovery Cards */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Discovered Competitors</span>
                            {demoCompetitors.length > 0 && (
                              <Badge variant="secondary" className="ml-auto text-[10px]">{demoCompetitors.length}/5</Badge>
                            )}
                          </div>

                          <div className="flex-1 space-y-2 overflow-y-auto max-h-[340px]">
                            {demoCompetitors.length === 0 && (
                              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/40 text-sm rounded-lg border border-dashed">
                                <Bot className="h-6 w-6 mb-2 opacity-30 animate-pulse" />
                                <span>Scanning for competitors...</span>
                              </div>
                            )}

                            {demoCompetitors.map((comp, i) => (
                              <div
                                key={comp.name}
                                className={cn(
                                  "rounded-lg border p-3 transition-all duration-500 animate-in fade-in slide-in-from-right-4",
                                  comp.color
                                )}
                                style={{ animationDelay: `${i * 80}ms` }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <h4 className="font-semibold text-sm">{comp.name}</h4>
                                    <span className="text-[11px] text-muted-foreground">{comp.domain}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                    <span className="text-sm font-semibold">{comp.rating}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {comp.pricing}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {comp.jobs} jobs
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary stats + CTA — full width below both panels */}
                    {demoPhase === "done" && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { value: "5", label: "Competitors", color: "text-foreground" },
                            { value: "342", label: "Data Points", color: "text-emerald-500" },
                            { value: "847", label: "Reviews", color: "text-primary" },
                            { value: "<11s", label: "Duration", color: "text-amber-500" },
                          ].map(s => (
                            <div key={s.label} className="text-center p-3 rounded-lg bg-muted/50 border">
                              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                              <div className="text-[11px] text-muted-foreground">{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <p className="text-sm text-muted-foreground">
                            This was a simulated demo.
                          </p>
                          <Button size="sm" onClick={onGetStarted}>
                            Try It For Real <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-8 border-y border-border/50 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">Powered by cutting-edge AI technology</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["React 19", "TypeScript", "TinyFish API", "Groq LLM", "SSE Streaming", "Next.js"].map((t) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything You Need for Competitive Intelligence</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              One platform to monitor, analyze, and act on competitor data — fully autonomous.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 60}>
                <Card className="h-full hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <f.icon className={`h-8 w-8 mb-3 ${f.color}`} />
                    <h3 className="font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">From query to actionable intelligence in minutes, not hours.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 120}>
                <Card className="h-full text-center">
                  <CardContent className="p-6">
                    <div className="text-4xl font-bold text-primary/20 mb-2">{s.step}</div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Unlike Simple Chatbots or API Wrappers</h2>
            <p className="text-muted-foreground">CompetitorPulse uses a real web agent that interacts with live websites.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {capabilityTabs.map((tab, i) => (
              <Button
                key={tab.label}
                variant={activeFeature === i ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFeature(i)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <Card>
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold mb-2">{capabilityTabs[activeFeature].title}</h3>
              <p className="text-muted-foreground mb-4">{capabilityTabs[activeFeature].desc}</p>
              <ul className="space-y-2">
                {capabilityTabs[activeFeature].items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">Start free. Scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <ScrollReveal key={plan.name} delay={i * 120}>
                <Card className={`h-full relative ${plan.highlight ? "border-primary shadow-lg shadow-primary/10" : ""}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-6 pt-8">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <div className="mt-2 mb-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={onGetStarted}
                    >
                      {plan.highlight ? "Start Free Trial" : plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                    </Button>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Get In Touch</h2>
            <p className="text-muted-foreground">Have questions? We'd love to hear from you.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              {[
                { icon: Mail, title: "Email Us", value: "hello@competitorpulse.ai" },
                { icon: Phone, title: "Call Us", value: "+1 (555) 123-4567" },
                { icon: MapPin, title: "Visit Us", value: "San Francisco, CA 94105" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <Card>
              <CardContent className="p-6">
                <form className="space-y-4" onSubmit={handleContactSubmit}>
                  <Input
                    placeholder="Your Name"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm(p => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    type="email"
                    placeholder="Your Email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))}
                  />
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Your Message"
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm(p => ({ ...p, message: e.target.value }))}
                  />
                  <Button type="submit" className="w-full">
                    {contactSent ? (
                      <><CheckCircle2 className="mr-2 h-4 w-4" /> Sent!</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Send Message</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold">CompetitorPulse</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Autonomous Competitive Intelligence Agent<br />
                Powered by TinyFish Web Agent API
              </p>
            </div>
            <div className="flex gap-16">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Product</h4>
                <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground">Features</a>
                <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground">Pricing</a>
                <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground">How It Works</a>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Company</h4>
                <a href="#contact" className="block text-sm text-muted-foreground hover:text-foreground">Contact</a>
                <a href="#contact" className="block text-sm text-muted-foreground hover:text-foreground">Support</a>
                <a href="#contact" className="block text-sm text-muted-foreground hover:text-foreground">Careers</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 text-center">
            <p className="text-sm text-muted-foreground">&copy; 2026 CompetitorPulse. Built for the TinyFish Hackathon.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

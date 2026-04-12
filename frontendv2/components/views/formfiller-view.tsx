"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"
import { LiveLogs } from "@/components/live-logs"
import {
  Globe,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  Edit3,
  Clock,
  RefreshCw,
  Trash2,
  Play,
  Square,
  User,
  Building2,
  Mail,
  Phone,
  Briefcase,
  MessageSquare,
  Newspaper,
  Handshake,
  DollarSign,
  Rocket,
  Settings,
} from "lucide-react"
import { startFormFill, createFormLogStream, cancelFormFill, loadCollection, saveCollection } from "@/lib/api"

const FORM_TYPES = [
  { id: "demo-request", label: "Demo Request", icon: Play, color: "text-blue-500" },
  { id: "contact-us", label: "Contact Us", icon: MessageSquare, color: "text-emerald-500" },
  { id: "newsletter", label: "Newsletter", icon: Newspaper, color: "text-violet-500" },
  { id: "partnership", label: "Partnership", icon: Handshake, color: "text-amber-500" },
  { id: "pricing-inquiry", label: "Pricing Inquiry", icon: DollarSign, color: "text-cyan-500" },
  { id: "job-application", label: "Job Application", icon: Briefcase, color: "text-pink-500" },
  { id: "free-trial", label: "Free Trial", icon: Rocket, color: "text-orange-500" },
  { id: "custom", label: "Custom", icon: Settings, color: "text-gray-500" },
]

interface Profile {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  title: string
}

interface LogEntry {
  id: string
  type: "info" | "success" | "warning" | "error" | "action"
  message: string
  timestamp: string
}

interface FillHistoryItem {
  id: string
  company: string
  formType: string
  status: "success" | "failed" | "pending"
  timestamp: string
  details?: string
}

const DEFAULT_PROFILE: Profile = {
  id: "default",
  name: "Default Profile",
  firstName: "John",
  lastName: "Smith",
  email: "john@company.com",
  company: "Acme Inc",
  title: "Product Manager",
  phone: "+1 555-0100",
}

export function FormFillerView() {
  const [companyName, setCompanyName] = useState("")
  const [selectedFormType, setSelectedFormType] = useState("demo-request")
  const [instructions, setInstructions] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"fill" | "profiles" | "history">("fill")
  const [profiles, setProfiles] = useState<Profile[]>([DEFAULT_PROFILE])
  const [selectedProfile, setSelectedProfile] = useState<string>("default")
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<FillHistoryItem[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    loadCollection("formProfiles").then((data) => {
      if (data && data.length > 0) setProfiles(data as Profile[])
    })
    loadCollection("fillHistory").then((data) => {
      if (data && data.length > 0) setHistory(data as FillHistoryItem[])
    })
  }, [])

  const handleFill = async () => {
    if (!companyName) return
    setIsRunning(true)
    setLogs([])

    const profile = profiles.find(p => p.id === selectedProfile) || DEFAULT_PROFILE

    try {
      const res = await startFormFill(companyName, selectedFormType, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        company: profile.company,
        title: profile.title,
      }, instructions || undefined)

      if (res.runId) {
        setRunId(res.runId)
        const es = createFormLogStream(
          res.runId,
          (data) => {
            if (data.type === "log" || data.message) {
              setLogs(prev => [...prev, {
                id: `${Date.now()}-${Math.random()}`,
                type: data.level || data.type || "info",
                message: data.message || JSON.stringify(data),
                timestamp: new Date().toLocaleTimeString(),
              }])
            }
          },
          (result) => {
            setIsRunning(false)
            const entry: FillHistoryItem = {
              id: Date.now().toString(),
              company: companyName,
              formType: selectedFormType,
              status: result ? "success" : "failed",
              timestamp: new Date().toISOString(),
              details: result ? JSON.stringify(result) : undefined,
            }
            setHistory(prev => {
              const updated = [entry, ...prev]
              saveCollection("fillHistory", updated)
              return updated
            })
          }
        )
        esRef.current = es
      }
    } catch (err) {
      setLogs(prev => [...prev, {
        id: `${Date.now()}`,
        type: "error",
        message: `Failed to start: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toLocaleTimeString(),
      }])
      setIsRunning(false)
    }
  }

  const handleCancel = async () => {
    if (runId) {
      await cancelFormFill(runId)
      esRef.current?.close()
      setIsRunning(false)
      setLogs(prev => [...prev, {
        id: `${Date.now()}`,
        type: "warning",
        message: "Form fill cancelled by user",
        timestamp: new Date().toLocaleTimeString(),
      }])
    }
  }

  const saveProfile = (profile: Profile) => {
    const updated = profiles.some(p => p.id === profile.id)
      ? profiles.map(p => p.id === profile.id ? profile : p)
      : [...profiles, { ...profile, id: Date.now().toString() }]
    setProfiles(updated)
    saveCollection("formProfiles", updated)
    setEditingProfile(null)
  }

  const deleteProfile = (id: string) => {
    if (id === "default") return
    const updated = profiles.filter(p => p.id !== id)
    setProfiles(updated)
    saveCollection("formProfiles", updated)
    if (selectedProfile === id) setSelectedProfile("default")
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Form Filler</h1>
          <p className="text-muted-foreground">AI-powered autonomous form filling</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={activeTab === "fill" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("fill")}>
            <Edit3 className="mr-2 h-4 w-4" /> Fill Form
          </Button>
          <Button variant={activeTab === "profiles" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("profiles")}>
            <User className="mr-2 h-4 w-4" /> Profiles
          </Button>
          <Button variant={activeTab === "history" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("history")}>
            <Clock className="mr-2 h-4 w-4" /> History
          </Button>
        </div>
      </div>

      {activeTab === "fill" && (
        <>
          {/* Form Type Selection */}
          <ScrollReveal delay={50}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Form Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {FORM_TYPES.map((ft) => (
                    <button
                      key={ft.id}
                      onClick={() => setSelectedFormType(ft.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all",
                        selectedFormType === ft.id
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-card border-border hover:border-primary/30"
                      )}
                    >
                      <ft.icon className={cn("h-4 w-4", selectedFormType === ft.id ? "text-primary" : ft.color)} />
                      {ft.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Company Input & Profile */}
          <ScrollReveal delay={100}>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Company name (e.g., Salesforce, HubSpot)"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-10"
                      disabled={isRunning}
                      onKeyDown={(e) => e.key === "Enter" && !isRunning && handleFill()}
                    />
                  </div>
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    disabled={isRunning}
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  placeholder="Special instructions (optional)"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={isRunning}
                />
                <div className="flex justify-end gap-2">
                  {isRunning ? (
                    <Button variant="destructive" onClick={handleCancel}>
                      <Square className="mr-2 h-4 w-4" /> Stop
                    </Button>
                  ) : (
                    <Button onClick={handleFill} disabled={!companyName}>
                      <Play className="mr-2 h-4 w-4" /> Start Fill
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Live Logs */}
          {(isRunning || logs.length > 0) && (
            <ScrollReveal delay={150}>
              <LiveLogs
                logs={logs}
                isRunning={isRunning}
                title="form-filler"
                maxHeight="300px"
              />
            </ScrollReveal>
          )}
        </>
      )}

      {activeTab === "profiles" && (
        <ScrollReveal delay={100}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Form Profiles</CardTitle>
                <Button size="sm" onClick={() => setEditingProfile({
                  id: "", name: "New Profile", firstName: "", lastName: "", email: "", phone: "", company: "", title: ""
                })}>
                  <User className="mr-2 h-4 w-4" /> Add Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editingProfile && (
                <div className="mb-6 p-4 rounded-lg border bg-muted/30 space-y-3">
                  <Input placeholder="Profile Name" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="First Name" value={editingProfile.firstName} onChange={e => setEditingProfile({...editingProfile, firstName: e.target.value})} />
                    <Input placeholder="Last Name" value={editingProfile.lastName} onChange={e => setEditingProfile({...editingProfile, lastName: e.target.value})} />
                    <Input placeholder="Email" value={editingProfile.email} onChange={e => setEditingProfile({...editingProfile, email: e.target.value})} />
                    <Input placeholder="Phone" value={editingProfile.phone} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})} />
                    <Input placeholder="Company" value={editingProfile.company} onChange={e => setEditingProfile({...editingProfile, company: e.target.value})} />
                    <Input placeholder="Job Title" value={editingProfile.title} onChange={e => setEditingProfile({...editingProfile, title: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingProfile(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => saveProfile(editingProfile)}>Save Profile</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium">{profile.name}</p>
                      <p className="text-sm text-muted-foreground">{profile.firstName} {profile.lastName} &middot; {profile.email} &middot; {profile.company}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingProfile({...profile})}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {profile.id !== "default" && (
                        <Button variant="ghost" size="sm" onClick={() => deleteProfile(profile.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {activeTab === "history" && (
        <ScrollReveal delay={100}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Fill History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No form fills yet</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                      {item.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.company}</p>
                        <p className="text-xs text-muted-foreground">
                          {FORM_TYPES.find(f => f.id === item.formType)?.label || item.formType} &middot; {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        item.status === "success" && "text-emerald-500 border-emerald-500/30",
                        item.status === "failed" && "text-rose-500 border-rose-500/30",
                      )}>
                        {item.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  )
}

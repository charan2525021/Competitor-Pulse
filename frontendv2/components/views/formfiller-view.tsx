"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"
import {
  Globe,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  Edit3,
  Eye,
  Clock,
  RefreshCw,
  Trash2,
  Play
} from "lucide-react"
import type { FormSubmission } from "@/lib/types"

interface DetectedField {
  name: string
  type: string
  label: string
  required: boolean
  value: string
}

// Mock submission history
const mockHistory: FormSubmission[] = [
  {
    id: "1",
    url: "https://acme.com/contact",
    status: "success",
    submittedAt: new Date(Date.now() - 3600000),
    fields: { name: "John Doe", email: "john@company.com", message: "Interest in enterprise plan" },
  },
  {
    id: "2",
    url: "https://startup.io/demo",
    status: "success",
    submittedAt: new Date(Date.now() - 7200000),
    fields: { company: "TechCorp", role: "CTO", employees: "50-100" },
  },
  {
    id: "3",
    url: "https://competitor.app/waitlist",
    status: "failed",
    submittedAt: new Date(Date.now() - 86400000),
    fields: { email: "test@test.com" },
    error: "CAPTCHA detected"
  },
]

export function FormFillerView() {
  const [url, setUrl] = useState("")
  const [isDetecting, setIsDetecting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([])
  const [history, setHistory] = useState<FormSubmission[]>(mockHistory)
  const [activeTab, setActiveTab] = useState<"detect" | "history">("detect")

  const handleDetect = async () => {
    if (!url) return
    setIsDetecting(true)
    
    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect", url }),
      })
      
      const data = await response.json()
      
      if (data.forms && data.forms.length > 0) {
        // Use the first detected form's fields
        const form = data.forms[0]
        setDetectedFields(form.fields.map((f: { name: string; type: string; placeholder?: string; required: boolean }) => ({
          name: f.name,
          type: f.type || "text",
          label: f.placeholder || f.name,
          required: f.required,
          value: "",
        })))
      } else {
        // Fallback to default fields
        setDetectedFields([
          { name: "name", type: "text", label: "Full Name", required: true, value: "John Smith" },
          { name: "email", type: "email", label: "Work Email", required: true, value: "john@company.com" },
          { name: "company", type: "text", label: "Company", required: true, value: "Acme Inc" },
          { name: "role", type: "text", label: "Job Title", required: false, value: "Product Manager" },
          { name: "phone", type: "tel", label: "Phone Number", required: false, value: "" },
          { name: "message", type: "textarea", label: "Message", required: false, value: "" },
        ])
      }
    } catch (error) {
      console.error("Form detection error:", error)
      // Use fallback fields on error
      setDetectedFields([
        { name: "name", type: "text", label: "Full Name", required: true, value: "" },
        { name: "email", type: "email", label: "Email", required: true, value: "" },
        { name: "message", type: "textarea", label: "Message", required: false, value: "" },
      ])
    }
    
    setIsDetecting(false)
  }

  const handleFieldChange = (index: number, value: string) => {
    const newFields = [...detectedFields]
    newFields[index].value = value
    setDetectedFields(newFields)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    const profile = {
      firstName: detectedFields.find(f => f.name === "name")?.value?.split(" ")[0] || "",
      lastName: detectedFields.find(f => f.name === "name")?.value?.split(" ").slice(1).join(" ") || "",
      email: detectedFields.find(f => f.name === "email")?.value || "",
      company: detectedFields.find(f => f.name === "company")?.value || "",
      title: detectedFields.find(f => f.name === "role")?.value || "",
      phone: detectedFields.find(f => f.name === "phone")?.value || "",
      message: detectedFields.find(f => f.name === "message")?.value || "",
    }
    
    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formType: "contact",
          profile,
        }),
      })
      
      const data = await response.json()
      
      const newSubmission: FormSubmission = {
        id: Date.now().toString(),
        url,
        status: data.success ? "success" : "failed",
        submittedAt: new Date(),
        fields: detectedFields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {}),
        error: data.error,
      }
      
      setHistory([newSubmission, ...history])
    } catch (error) {
      const newSubmission: FormSubmission = {
        id: Date.now().toString(),
        url,
        status: "failed",
        submittedAt: new Date(),
        fields: detectedFields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {}),
        error: error instanceof Error ? error.message : "Submission failed",
      }
      setHistory([newSubmission, ...history])
    }
    
    setIsSubmitting(false)
    setDetectedFields([])
    setUrl("")
  }

  const getStatusIcon = (status: FormSubmission["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-rose-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Form Filler</h1>
          <p className="text-muted-foreground">Automatically detect and fill web forms</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "detect" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("detect")}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            New Form
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("history")}
          >
            <Clock className="mr-2 h-4 w-4" />
            History
          </Button>
        </div>
      </div>

      {activeTab === "detect" ? (
        <>
          {/* URL Input */}
          <ScrollReveal delay={100}>
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter form URL (e.g., https://company.com/contact)"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => e.key === "Enter" && handleDetect()}
                    />
                  </div>
                  <Button onClick={handleDetect} disabled={!url || isDetecting}>
                    {isDetecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Detect Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Detected Fields */}
          {detectedFields.length > 0 && (
            <ScrollReveal delay={200}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Detected Form Fields
                    </CardTitle>
                    <Badge variant="secondary">
                      {detectedFields.length} fields found
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {detectedFields.map((field, index) => (
                      <div key={field.name} className="flex items-start gap-4">
                        <div className="w-40 flex-shrink-0">
                          <label className="text-sm font-medium flex items-center gap-2">
                            {field.label}
                            {field.required && (
                              <span className="text-rose-500">*</span>
                            )}
                          </label>
                          <span className="text-xs text-muted-foreground">{field.type}</span>
                        </div>
                        <div className="flex-1">
                          {field.type === "textarea" ? (
                            <textarea
                              value={field.value}
                              onChange={(e) => handleFieldChange(index, e.target.value)}
                              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                            />
                          ) : (
                            <Input
                              type={field.type}
                              value={field.value}
                              onChange={(e) => handleFieldChange(index, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                            />
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <Button variant="outline" onClick={() => setDetectedFields([])}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Submit Form
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {/* Empty State */}
          {detectedFields.length === 0 && !isDetecting && (
            <ScrollReveal delay={200}>
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">No Form Detected</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Enter a URL above to automatically detect form fields. The AI agent will 
                    analyze the page and extract all fillable fields.
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}
        </>
      ) : (
        /* History Tab */
        <ScrollReveal delay={100}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Submission History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    {getStatusIcon(submission.status)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{submission.url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {submission.submittedAt.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(submission.fields).length} fields
                        </span>
                        {submission.error && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-rose-500">{submission.error}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Badge 
                      variant="outline" 
                      className={cn(
                        submission.status === "success" && "text-emerald-500 border-emerald-500/30",
                        submission.status === "failed" && "text-rose-500 border-rose-500/30",
                        submission.status === "pending" && "text-amber-500 border-amber-500/30"
                      )}
                    >
                      {submission.status}
                    </Badge>

                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No submissions yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  )
}

"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Globe, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Send,
  Scan
} from "lucide-react"
import type { FormSubmission, FormField } from "@/lib/types"

export function FormsView() {
  const [url, setUrl] = React.useState("")
  const [isDetecting, setIsDetecting] = React.useState(false)
  const [forms, setForms] = React.useState<FormSubmission[]>([])
  const [submittingForms, setSubmittingForms] = React.useState<Set<string>>(new Set())

  const detectForms = async () => {
    if (!url) return
    
    setIsDetecting(true)
    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect", url })
      })
      const data = await response.json()
      setForms(data.forms || [])
    } catch (error) {
      console.error("Failed to detect forms:", error)
    } finally {
      setIsDetecting(false)
    }
  }

  const updateFieldValue = (formId: string, fieldName: string, value: string) => {
    setForms(forms.map(form => {
      if (form.id === formId) {
        return {
          ...form,
          fields: form.fields.map(field => 
            field.name === fieldName ? { ...field, value } : field
          )
        }
      }
      return form
    }))
  }

  const submitForm = async (formId: string) => {
    const form = forms.find(f => f.id === formId)
    if (!form) return

    setSubmittingForms(prev => new Set(prev).add(formId))
    
    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "submit", 
          formId, 
          fields: form.fields 
        })
      })
      const data = await response.json()
      
      setForms(forms.map(f => 
        f.id === formId 
          ? { ...f, status: data.success ? "submitted" : "failed", submittedAt: data.submittedAt }
          : f
      ))
    } catch (error) {
      console.error("Failed to submit form:", error)
      setForms(forms.map(f => 
        f.id === formId ? { ...f, status: "failed" } : f
      ))
    } finally {
      setSubmittingForms(prev => {
        const newSet = new Set(prev)
        newSet.delete(formId)
        return newSet
      })
    }
  }

  const getStatusBadge = (status: FormSubmission["status"]) => {
    switch (status) {
      case "submitted":
        return (
          <Badge className="gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Submitted
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            Pending
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Form Filler</h1>
          <p className="text-sm text-muted-foreground">
            Autonomous form detection and submission
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {forms.length} Forms Detected
        </Badge>
      </div>

      {/* URL Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Detect Forms</CardTitle>
          <CardDescription>Enter a URL to find and fill forms automatically</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="https://example.com/contact"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && detectForms()}
              />
            </div>
            <Button onClick={detectForms} disabled={isDetecting || !url} className="gap-2">
              {isDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scan className="h-4 w-4" />
              )}
              Detect Forms
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detected Forms */}
      {forms.map((form) => (
        <Card key={form.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">{form.formName}</CardTitle>
              {getStatusBadge(form.status)}
            </div>
            <CardDescription className="text-xs">{form.url}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {form.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={`${form.id}-${field.name}`} className="flex items-center gap-1">
                    {field.placeholder || field.name}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={`${form.id}-${field.name}`}
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(e) => updateFieldValue(form.id, field.name, e.target.value)}
                      disabled={form.status === "submitted"}
                    />
                  ) : (
                    <Input
                      id={`${form.id}-${field.name}`}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(e) => updateFieldValue(form.id, field.name, e.target.value)}
                      disabled={form.status === "submitted"}
                    />
                  )}
                </div>
              ))}
            </div>
            
            {form.status !== "submitted" && (
              <Button 
                onClick={() => submitForm(form.id)}
                disabled={submittingForms.has(form.id)}
                className="gap-2"
              >
                {submittingForms.has(form.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Form
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {forms.length === 0 && !isDetecting && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">No forms detected</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a URL to detect and fill forms
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

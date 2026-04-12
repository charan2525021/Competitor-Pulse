"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Play, Globe } from "lucide-react"

interface TopBarProps {
  onRunAnalysis: (url: string) => void
  isAnalyzing: boolean
}

export function TopBar({ onRunAnalysis, isAnalyzing }: TopBarProps) {
  const [url, setUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onRunAnalysis(url)
    }
  }

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center gap-4">
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3 max-w-2xl">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="Enter competitor URL to analyze..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground h-10"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isAnalyzing || !url.trim()}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Analysis
            </>
          )}
        </Button>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Search className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}

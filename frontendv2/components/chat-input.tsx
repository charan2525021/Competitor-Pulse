"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, Globe, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSubmit: (url: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export function ChatInput({ 
  onSubmit, 
  isLoading = false, 
  placeholder = "Enter competitor URL to analyze...",
  className 
}: ChatInputProps) {
  const [url, setUrl] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim() && !isLoading) {
      onSubmit(url.trim())
    }
  }

  const isValidUrl = (input: string) => {
    try {
      new URL(input.startsWith("http") ? input : `https://${input}`)
      return true
    } catch {
      return input.length > 0
    }
  }

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus()
  }, [])

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-2xl border bg-card p-2 transition-all duration-300",
          isFocused 
            ? "border-primary/50 shadow-lg shadow-primary/10 ring-2 ring-primary/20" 
            : "border-border hover:border-primary/30"
        )}
      >
        {/* URL Icon */}
        <div className="flex items-center justify-center pl-3">
          <Globe className={cn(
            "h-5 w-5 transition-colors duration-200",
            isFocused ? "text-primary" : "text-muted-foreground"
          )} />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            "flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground/60",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />

        {/* AI Badge */}
        {url.length > 0 && isValidUrl(url) && (
          <div className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI Analysis</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          disabled={!url.trim() || isLoading}
          className={cn(
            "rounded-xl px-6 transition-all duration-200",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Analyzing...</span>
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Run Analysis</span>
            </>
          )}
        </Button>
      </div>

      {/* Helper Text */}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Enter a competitor&apos;s website URL to start AI-powered analysis
      </p>
    </form>
  )
}

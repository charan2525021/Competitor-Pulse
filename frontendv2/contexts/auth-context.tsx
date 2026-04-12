"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface UserProfile {
  id: string
  username: string
  role: "admin" | "user"
  email: string
  phone?: string
  company?: string
  provider?: string
  loginTime: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: UserProfile | null
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithToken: (token: string) => Promise<boolean>
  signup: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string; emailSent?: boolean }>
  logout: () => void
  updateProfile: (updates: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "cp_token"
const PROFILE_KEY = "cp_profile"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const setAuthState = (token: string, profile: UserProfile) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    setUser(profile)
    setIsAuthenticated(true)
  }

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)
    setUser(null)
    setIsAuthenticated(false)
  }

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const savedProfile = localStorage.getItem(PROFILE_KEY)

    if (token && savedProfile) {
      // Validate token with backend
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (!res.ok) throw new Error()
          return res.json()
        })
        .then(data => {
          const profile: UserProfile = {
            id: data.user.id,
            username: data.user.username,
            role: data.user.role as "admin" | "user",
            email: data.user.email,
            provider: data.user.provider,
            loginTime: new Date().toISOString(),
          }
          // Merge stored extras (phone, company)
          try {
            const saved = JSON.parse(savedProfile)
            if (saved.phone) profile.phone = saved.phone
            if (saved.company) profile.company = saved.company
          } catch {}
          setUser(profile)
          setIsAuthenticated(true)
        })
        .catch(() => clearAuth())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Handle Google OAuth token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    if (token) {
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname)
      loginWithToken(token)
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }

      const profile: UserProfile = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role as "admin" | "user",
        email: data.user.email,
        provider: data.user.provider,
        loginTime: new Date().toISOString(),
      }

      setAuthState(data.token, profile)
      return { success: true }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  const loginWithToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return false
      const data = await res.json()

      const profile: UserProfile = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role as "admin" | "user",
        email: data.user.email,
        provider: data.user.provider,
        loginTime: new Date().toISOString(),
      }

      setAuthState(token, profile)
      setLoading(false)
      return true
    } catch {
      return false
    }
  }, [])

  const signup = useCallback(async (email: string, username: string, password: string): Promise<{ success: boolean; error?: string; emailSent?: boolean }> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      })

      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }

      return { success: true, emailSent: data.emailSent }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  const logout = useCallback(() => {
    clearAuth()
  }, [])

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...updates }
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isAdmin: user?.role === "admin",
        loading,
        login,
        loginWithToken,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

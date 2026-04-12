"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface UserProfile {
  username: string
  role: "admin" | "user"
  phone?: string
  email?: string
  company?: string
  loginTime: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: UserProfile | null
  isAdmin: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
  updateProfile: (updates: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "cp_auth"
const PROFILE_KEY = "cp_profile"

// Default admin credentials
const VALID_CREDENTIALS = {
  admin: "admin",
  user: "user123"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)

  // Load auth state on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem(STORAGE_KEY)
    const savedProfile = localStorage.getItem(PROFILE_KEY)
    
    if (savedAuth === "true" && savedProfile) {
      try {
        const profile = JSON.parse(savedProfile) as UserProfile
        setUser(profile)
        setIsAuthenticated(true)
      } catch {
        sessionStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(PROFILE_KEY)
      }
    }
  }, [])

  const login = (username: string, password: string): boolean => {
    const validPassword = VALID_CREDENTIALS[username as keyof typeof VALID_CREDENTIALS]
    
    if (validPassword && validPassword === password) {
      const profile: UserProfile = {
        username,
        role: username === "admin" ? "admin" : "user",
        loginTime: new Date().toISOString()
      }
      
      // Try to restore saved profile data
      const savedProfile = localStorage.getItem(`${PROFILE_KEY}_${username}`)
      if (savedProfile) {
        try {
          const saved = JSON.parse(savedProfile)
          profile.phone = saved.phone
          profile.email = saved.email
          profile.company = saved.company
        } catch {
          // Ignore parse errors
        }
      }
      
      setUser(profile)
      setIsAuthenticated(true)
      sessionStorage.setItem(STORAGE_KEY, "true")
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
      
      return true
    }
    
    return false
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(PROFILE_KEY)
  }

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return
    
    const updatedProfile = { ...user, ...updates }
    setUser(updatedProfile)
    sessionStorage.setItem(STORAGE_KEY, "true")
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile))
    localStorage.setItem(`${PROFILE_KEY}_${user.username}`, JSON.stringify(updatedProfile))
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isAdmin: user?.role === "admin",
        login,
        logout,
        updateProfile
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

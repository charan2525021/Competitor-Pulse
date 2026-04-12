"use client"

import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/auth-context"
import { 
  LayoutDashboard, 
  Target, 
  History, 
  Zap,
  Bot,
  Users,
  FileText,
  Database,
  Settings,
  Book,
  Home,
  LogOut
} from "lucide-react"
import type { NavItem } from "@/lib/types"

interface SidebarProps {
  activeItem: NavItem
  onItemClick: (item: NavItem) => void
}

const navItems: { id: NavItem; label: string; icon: typeof LayoutDashboard; section?: string }[] = [
  { id: "home", label: "Home", icon: Home, section: "main" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { id: "agent", label: "Agent", icon: Bot, section: "main" },
  { id: "strategy", label: "Strategy", icon: Target, section: "analysis" },
  { id: "leads", label: "Lead Gen", icon: Users, section: "analysis" },
  { id: "forms", label: "Forms", icon: FileText, section: "analysis" },
  { id: "intel", label: "Intel DB", icon: Database, section: "data" },
  { id: "history", label: "History", icon: History, section: "data" },
  { id: "docs", label: "Docs", icon: Book, section: "help" },
  { id: "settings", label: "Settings", icon: Settings, section: "help" },
]

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground tracking-tight">
              CompetitorPulse
            </h1>
            <p className="text-xs text-muted-foreground">AI Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                {user?.username?.slice(0, 2).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.username || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role === "admin" ? "Admin" : "Pro Plan"}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

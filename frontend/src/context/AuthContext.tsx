import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface UserProfile {
  username: string;
  role: string;
  phone: string;
  loginTime: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (username: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({ isAuthenticated: false, user: null, login: () => {}, logout: () => {}, updateProfile: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem("cp_auth") === "true");
  const [user, setUser] = useState<UserProfile | null>(() => {
    try { const u = sessionStorage.getItem("cp_user"); return u ? JSON.parse(u) : null; } catch { return null; }
  });

  const login = useCallback((username: string) => {
    // Restore previously saved profile edits from localStorage, only update loginTime
    let profile: UserProfile;
    try {
      const saved = localStorage.getItem("cp_profile_" + username);
      if (saved) {
        profile = { ...JSON.parse(saved), loginTime: new Date().toISOString() };
      } else {
        profile = { username, role: "Admin", phone: "+1 (555) 123-4567", loginTime: new Date().toISOString() };
      }
    } catch {
      profile = { username, role: "Admin", phone: "+1 (555) 123-4567", loginTime: new Date().toISOString() };
    }
    sessionStorage.setItem("cp_auth", "true");
    sessionStorage.setItem("cp_user", JSON.stringify(profile));
    setUser(profile);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("cp_auth");
    sessionStorage.removeItem("cp_user");
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const oldUsername = prev.username;
      const updated = { ...prev, ...updates };
      sessionStorage.setItem("cp_user", JSON.stringify(updated));
      // Save under both old and new username keys so login lookup always works
      localStorage.setItem("cp_profile_" + oldUsername, JSON.stringify(updated));
      if (updated.username !== oldUsername) {
        localStorage.setItem("cp_profile_" + updated.username, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

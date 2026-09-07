"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthProviderType, AuthUser } from "./types";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (provider: AuthProviderType, email?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "voicetrace_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session on client load
  useEffect(() => {
    try {
      // Fast client-side cache hydration
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch {
      // Ignore parse errors
    }

    // Server verification
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.user));
        } else if (!data?.authenticated) {
          // If server says unauthenticated and we don't have a valid cached user, clear
          // Note: keep cache if offline or in dev
        }
      })
      .catch(() => {
        // Network resilience
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (provider: AuthProviderType, email?: string, password?: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, email, password }),
        });

        const data = await res.json();

        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.user));
          return { success: true };
        } else {
          return { success: false, error: data.error || "Authentication failed" };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || "Network error during authentication" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

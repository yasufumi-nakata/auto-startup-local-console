"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { APIError, getSession, login as loginRequest, logout as logoutRequest } from "@/lib/api";
import type { SessionPayload, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  expiresAt: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function applySession(loader: Promise<SessionPayload>) {
    const session = await loader;
    setUser(session.user);
    setExpiresAt(session.expires_at);
  }

  async function refresh() {
    try {
      await applySession(getSession());
    } catch (error) {
      if (error instanceof APIError && error.status === 401) {
        setUser(null);
        setExpiresAt(null);
      } else {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    await applySession(loginRequest(email, password));
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
    setExpiresAt(null);
  }

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const session = await getSession();
        if (!active) {
          return;
        }
        setUser(session.user);
        setExpiresAt(session.expires_at);
      } catch (error) {
        if (!active) {
          return;
        }
        if (error instanceof APIError && error.status === 401) {
          setUser(null);
          setExpiresAt(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, expiresAt, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

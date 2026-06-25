import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError, setStoredToken, getStoredToken, isDemoSession } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = checking, false = unauth, object = user
  const [user, setUser] = useState(null);
  const [demoMode, setDemoMode] = useState(isDemoSession());

  const refresh = useCallback(async () => {
    if (!getStoredToken()) {
      const runtimeConfig = window.GL_MODEL_ACADEMY_CONFIG || {};
      if (
        runtimeConfig.PREVIEW_AUTO_LOGIN === true &&
        runtimeConfig.DEMO_ADMIN_EMAIL &&
        runtimeConfig.DEMO_ADMIN_PASSWORD
      ) {
        try {
          const { data } = await api.post("/auth/login", {
            email: runtimeConfig.DEMO_ADMIN_EMAIL,
            password: runtimeConfig.DEMO_ADMIN_PASSWORD,
          });
          if (data.access_token) setStoredToken(data.access_token);
          setUser(data);
          setDemoMode(isDemoSession());
          if (runtimeConfig.PREVIEW_START_PATH && window.location.pathname === "/") {
            window.history.replaceState({}, "", runtimeConfig.PREVIEW_START_PATH);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
          return data;
        } catch {
          /* preview falls back to the normal login screen */
        }
      }
      setUser(false);
      return null;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      setDemoMode(isDemoSession());
      return data;
    } catch (e) {
      setStoredToken(null);
      setUser(false);
      setDemoMode(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onDemoMode = () => setDemoMode(true);
    window.addEventListener("gl-demo-mode", onDemoMode);
    return () => window.removeEventListener("gl-demo-mode", onDemoMode);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) setStoredToken(data.access_token);
    setUser(data);
    setDemoMode(isDemoSession());
    return data;
  };

  const register = async (email, password, name, accessCode = "", teamRoles = [], onboarding = {}) => {
    const normalizedRoles = Array.isArray(teamRoles) ? teamRoles : [teamRoles].filter(Boolean);
    const { data } = await api.post("/auth/register", {
      email,
      password,
      name,
      access_code: accessCode,
      team_role: normalizedRoles[0] || "",
      team_roles: normalizedRoles,
      experience: onboarding.experience || "",
      goal: onboarding.goal || "",
      challenge: onboarding.challenge || "",
    });
    if (data.access_token) {
      setStoredToken(data.access_token);
      setUser(data);
    } else {
      setStoredToken(null);
      setUser(false);
    }
    setDemoMode(isDemoSession());
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      /* noop */
    }
    setStoredToken(null);
    setUser(false);
    setDemoMode(false);
  };

  const saveOnboarding = async (payload) => {
    const { data } = await api.post("/user/onboarding", payload);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, demoMode, login, register, logout, refresh, saveOnboarding, formatApiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

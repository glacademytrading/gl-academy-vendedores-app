import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserRoleKeys } from "@/lib/glAcademyContent";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="gl-text-muted text-sm tracking-wide" data-testid="auth-loading">
          Carregando sessão…
        </div>
      </div>
    );
  }

  if (user === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const needsRole =
    user.role !== "admin" &&
    user.onboarding?.role !== "gestao" &&
    getUserRoleKeys(user).length === 0;
  if ((!user.has_onboarded || needsRole) && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

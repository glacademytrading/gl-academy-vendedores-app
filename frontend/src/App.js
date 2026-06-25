import React from "react";
import "@/index.css";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Legal from "@/pages/Legal";
import Onboarding from "@/pages/Onboarding";
import RoleTrack from "@/pages/RoleTrack";
import ModulePage from "@/pages/Module";
import Knowledge from "@/pages/Knowledge";
import Updates from "@/pages/Updates";
import Products from "@/pages/Products";
import Performance from "@/pages/Performance";
import Report from "@/pages/Report";
import Admin from "@/pages/Admin";
import Account from "@/pages/Account";
import ImportantLinks from "@/pages/ImportantLinks";

function Inside({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster theme="dark" position="top-right" richColors closeButton />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/termos" element={<Legal type="terms" />} />
          <Route path="/privacidade" element={<Legal type="privacy" />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/novidades" replace />} />
          <Route path="/novidades" element={<Inside><Updates /></Inside>} />
          <Route path="/trilha" element={<Navigate to="/novidades" replace />} />
          <Route path="/recrutadores" element={<Inside><RoleTrack roleKey="recrutador" /></Inside>} />
          <Route path="/vendedor-ativo" element={<Inside><RoleTrack roleKey="ativo" /></Inside>} />
          <Route path="/vendedor-tecnico" element={<Inside><RoleTrack roleKey="tecnico" /></Inside>} />
          <Route path="/modulo/:id" element={<Inside><ModulePage /></Inside>} />
          <Route path="/conhecimento" element={<Inside><Knowledge /></Inside>} />
          <Route path="/materiais" element={<Navigate to="/novidades" replace />} />
          <Route path="/mercado" element={<Navigate to="/novidades" replace />} />
          <Route path="/diario" element={<Navigate to="/novidades" replace />} />
          <Route path="/desempenho" element={<Inside><Performance /></Inside>} />
          <Route path="/relatorio" element={<Inside><Report /></Inside>} />
          <Route path="/produtos" element={<Inside><Products /></Inside>} />
          <Route path="/links-importantes" element={<Inside><ImportantLinks /></Inside>} />
          <Route path="/conta" element={<Inside><Account /></Inside>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AppLayout><Admin /></AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

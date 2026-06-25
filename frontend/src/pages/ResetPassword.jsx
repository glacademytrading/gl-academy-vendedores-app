import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const token = params.get("token") || "";

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Senha precisa ter no minimo 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas nao conferem.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm", { token, password });
      toast.success("Senha atualizada. Entre novamente.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md gl-panel p-7 lg:p-9 gl-fade-in" data-testid="reset-password-form">
        <span className="gl-eyebrow">Nova senha</span>
        <h1 className="text-3xl sm:text-4xl mt-1">Crie uma senha segura.</h1>
        <p className="gl-text-muted text-sm mt-3">
          O link expira por seguranca. Se nao funcionar, solicite uma nova recuperacao.
        </p>

        {!token && (
          <div className="gl-feedback bad mt-4">
            Link sem token de recuperacao.
          </div>
        )}

        <div className="grid gap-3 mt-6">
          <label className="grid gap-1.5">
            <span className="gl-label">Nova senha</span>
            <input type="password" className="gl-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="grid gap-1.5">
            <span className="gl-label">Confirmar senha</span>
            <input type="password" className="gl-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
        </div>

        <button type="submit" className="gl-primary-btn w-full mt-5" disabled={loading || !token}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>

        <div className="mt-5 text-center text-sm gl-text-muted">
          <Link to="/forgot-password" className="gl-text-gold font-bold hover:underline">Pedir novo link</Link>
        </div>
      </form>
    </div>
  );
}

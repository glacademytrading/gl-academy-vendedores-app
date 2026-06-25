import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Bem-vindo, ${user.name?.split(" ")[0] || "colaborador"}.`);
      const from = location.state?.from?.pathname;
      if (!user.has_onboarded && user.role !== "admin") navigate("/onboarding", { replace: true });
      else navigate(from || "/", { replace: true });
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gl-login-screen">
      <header className="gl-login-topbar">
        <div className="gl-login-brand-mini">
          <img src="/assets/gl-academy-emblem-transparent.png" alt="GL Academy" />
          <div>
            <strong>GL Academy</strong>
            <span>Sales Training</span>
          </div>
        </div>
        <div className="gl-login-pill">
          <ShieldCheck size={15} /> Treinamento interno, metas e evolução
        </div>
      </header>

      <main className="gl-login-main">
        <section className="gl-login-universe" aria-label="GL Academy Sales Training">
          <div className="gl-login-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
            <img className="gl-login-emblem" src="/assets/gl-academy-emblem-transparent.png" alt="" />
          </div>
          <h1>GL Sales Training</h1>
          <p>
            Formação prática para recrutadores, vendedores ativos e vendedores técnicos crescerem com processo.
          </p>
        </section>

        <form onSubmit={submit} className="gl-login-panel gl-fade-in" data-testid="login-form">
          <span className="gl-eyebrow flex items-center gap-2">
            <LockKeyhole size={14} /> Portal do colaborador
          </span>
          <h2>Entre no seu dia de execução.</h2>
          <p>
            Continue sua formação por cargo, acompanhe metas, responda aos questionários e envie seus relatórios.
          </p>
          <p className="gl-text-soft text-xs mt-3">
            A gestão entra normalmente por esta tela. Novos colaboradores devem criar a conta, responder as quatro
            perguntas e somente depois aguardar a aprovação.
          </p>

          <div className="mt-6 grid gap-3">
            <label className="grid gap-1.5">
              <span className="gl-label">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="gl-input"
                placeholder="seu@email.com"
                data-testid="login-email"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="gl-label">Senha</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="gl-input"
                placeholder="mínimo 8 caracteres"
                data-testid="login-password"
              />
            </label>
          </div>

          <button
            type="submit"
            className="gl-primary-btn w-full mt-5"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? "Entrando..." : "Entrar no app"} <ArrowRight size={14} />
          </button>

          <div className="gl-login-links">
            <Link to="/forgot-password" data-testid="link-to-forgot">Esqueci minha senha</Link>
            <span />
            <Link to="/register" data-testid="link-to-register">Criar conta e responder perguntas</Link>
          </div>

          <div className="gl-login-legal">
            <Link to="/termos">Termos</Link>
            <span>-</span>
            <Link to="/privacidade">Privacidade</Link>
          </div>
        </form>
      </main>
    </div>
  );
}

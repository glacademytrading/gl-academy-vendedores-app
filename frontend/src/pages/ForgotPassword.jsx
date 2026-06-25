import React, { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/password-reset/request", { email });
      setSent(true);
      if (data.reset_link) {
        toast.success("Link de teste gerado. Use apenas em ambiente de desenvolvimento.");
        console.info("GL Academy reset link:", data.reset_link);
      } else if (data.email_configured) {
        toast.success("Enviamos as instrucoes para o seu e-mail.");
      } else {
        toast.info("Se este e-mail existir, a gestão receberá o pedido de recuperação.");
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md gl-panel p-7 lg:p-9 gl-fade-in" data-testid="forgot-password-form">
        <span className="gl-eyebrow">Recuperar acesso</span>
        <h1 className="text-3xl sm:text-4xl mt-1">Redefinir senha.</h1>
        <p className="gl-text-muted text-sm mt-3">
          Informe o e-mail da sua conta. Se o e-mail estiver cadastrado, enviaremos um link seguro de recuperacao.
        </p>

        <label className="grid gap-1.5 mt-6">
          <span className="gl-label">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="gl-input"
            placeholder="seu@email.com"
            data-testid="forgot-email"
          />
        </label>

        <button type="submit" className="gl-primary-btn w-full mt-5" disabled={loading} data-testid="forgot-submit">
          {loading ? "Enviando..." : sent ? "Enviar novamente" : "Enviar link"}
        </button>

        <div className="mt-5 text-center text-sm gl-text-muted">
          <Link to="/login" className="gl-text-gold font-bold hover:underline">Voltar para login</Link>
        </div>
      </form>
    </div>
  );
}

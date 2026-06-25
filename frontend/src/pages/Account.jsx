import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ShieldCheck } from "lucide-react";
import api, { formatApiError, setStoredToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const deleteAccount = async () => {
    if (confirm !== "EXCLUIR") {
      toast.error("Digite EXCLUIR para confirmar.");
      return;
    }
    setLoading(true);
    try {
      await api.delete("/user/account");
      setStoredToken(null);
      toast.success("Conta excluida.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 gl-fade-in">
      <header className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow flex items-center gap-2"><ShieldCheck size={14} /> Conta e privacidade</span>
        <h1 className="text-3xl sm:text-4xl mt-1">Seu acesso GL Academy</h1>
        <p className="gl-text-muted text-sm mt-2 max-w-2xl">
          Gerencie dados essenciais da conta e solicite exclusao quando necessario.
        </p>
      </header>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="gl-panel p-5">
          <span className="gl-eyebrow">Dados da conta</span>
          <div className="grid gap-3 mt-4 text-sm">
            <Info label="Nome" value={user?.name || "-"} />
            <Info label="E-mail" value={user?.email || "-"} />
            <Info label="Perfil" value={user?.role || "student"} />
          </div>
        </div>

        <div className="gl-panel p-5" style={{ borderColor: "rgba(255,106,95,0.34)" }}>
          <span className="gl-eyebrow gl-text-red flex items-center gap-2"><Trash2 size={14} /> Exclusao de dados</span>
          <h2 className="text-2xl mt-1">Excluir minha conta</h2>
          <p className="gl-text-muted text-sm mt-2">
            Esta acao remove progresso, respostas, badges e diario. Contas admin nao podem ser excluidas por este fluxo.
          </p>
          <label className="grid gap-1.5 mt-4">
            <span className="gl-label">Digite EXCLUIR</span>
            <input className="gl-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button className="gl-danger-btn mt-4" onClick={deleteAccount} disabled={loading}>
            <Trash2 size={14} /> {loading ? "Excluindo..." : "Excluir conta"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="gl-panel-soft p-3">
      <span className="gl-text-soft text-xs">{label}</span>
      <strong className="block mt-1">{value}</strong>
    </div>
  );
}

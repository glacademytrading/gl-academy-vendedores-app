import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { NEWS_UPDATES } from "@/lib/glAcademyContent";
import { getPushConfig, pushSupported, sendTestNotification, subscribeToPush } from "@/lib/pushNotifications";
import { Bell, BellRing, CheckCircle2, ExternalLink, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Updates() {
  const [items, setItems] = useState(NEWS_UPDATES);
  const [pushConfig, setPushConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    (async () => {
      try {
        const [{ data }, cfg] = await Promise.all([api.get("/content/news"), getPushConfig()]);
        if (Array.isArray(data) && data.length) setItems(data);
        setPushConfig(cfg);
      } catch {
        setPushConfig(await getPushConfig());
      }
    })();
  }, []);

  const activatePush = async () => {
    setBusy(true);
    try {
      const result = await subscribeToPush();
      if (result.ok) toast.success("Alertas ativados neste dispositivo.");
      else toast.warning(result.reason || "Nao foi possivel ativar alertas agora.");
    } finally {
      setBusy(false);
    }
  };

  const testPush = async () => {
    setBusy(true);
    try {
      const result = await sendTestNotification();
      if (result.ok) toast.success("Teste de notificacao enviado.");
      else toast.warning(result.reason || "Teste nao enviado.");
    } finally {
      setBusy(false);
    }
  };

  const openAction = (url) => {
    if (!url) return;
    if (url.startsWith("/")) navigate(url);
    else window.open(url, "_blank", "noreferrer");
  };

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="updates-page">
      <header className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow flex items-center gap-2">
          <Megaphone size={14} /> Mural GL Academy
        </span>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-1">
          <div>
            <h1 className="text-3xl sm:text-4xl">Avisos, campanhas e vitorias da equipe</h1>
            <p className="gl-text-muted text-sm mt-2 max-w-2xl">
              Central para recordes de comissao, campanhas novas, scripts atualizados, alertas de mercado e comunicados internos.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="gl-primary-btn"
              onClick={activatePush}
              disabled={busy || !pushSupported()}
              data-testid="activate-push"
            >
              <BellRing size={14} /> Ativar alertas
            </button>
            {isAdmin && (
              <button type="button" className="gl-ghost-btn" onClick={testPush} disabled={busy} data-testid="test-push">
                <Send size={14} /> Testar
              </button>
            )}
          </div>
        </div>
        <div className="gl-panel-soft p-3 mt-4 flex items-center gap-2 text-xs gl-text-muted">
          {pushConfig?.enabled ? <CheckCircle2 size={14} className="gl-text-green" /> : <Bell size={14} className="gl-text-gold" />}
          <span>
            {pushConfig?.enabled
              ? "Alertas prontos para receber comunicados, campanhas e aulas novas neste dispositivo."
              : "Ative os alertas para ser avisado quando campanhas, scripts ou comunicados entrarem no app."}
          </span>
        </div>
      </header>

      <section className={`grid ${isAdmin ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""} gap-4`}>
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="gl-panel p-4 lg:p-5" data-testid={`news-${item.id}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="gl-tag gl-tag-gold">{item.tag || "Atualizacao"}</span>
                <span className="text-xs gl-text-soft">
                  {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "sem data"}
                </span>
              </div>
              <h2 className="text-2xl mt-3">{item.title}</h2>
              <p className="gl-text-muted text-sm mt-2 leading-relaxed">{item.body}</p>
              {item.action_url && (
                <button type="button" className="gl-secondary-btn mt-4" onClick={() => openAction(item.action_url)}>
                  Abrir novidade <ExternalLink size={14} />
                </button>
              )}
            </article>
          ))}
        </div>

        {isAdmin && (
          <aside className="gl-panel-soft p-4 h-fit">
            <div className="flex items-center justify-between gap-2">
              <span className="gl-eyebrow">Nota interna da gestão</span>
              <span className="gl-tag gl-tag-gold">admin</span>
            </div>
            <div className="grid gap-3 mt-3 text-sm gl-text-muted">
              <p><strong className="gl-text-gold">Campanha:</strong> publicar quando mudar oferta, script ou condicao comercial.</p>
              <p><strong className="gl-text-gold">Vitoria:</strong> reconhecer venda, entrevista aprovada ou recorde de atividade.</p>
              <p><strong className="gl-text-gold">Mercado:</strong> usar como argumento educacional, sempre sem promessa de resultado.</p>
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}

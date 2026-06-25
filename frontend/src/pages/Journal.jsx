import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { smartPt } from "@/lib/utils";
import { toast } from "sonner";
import { Download, Plus, Trash2, NotebookPen, TrendingUp, Minus } from "lucide-react";

const EMPTY = {
  operacional: "",
  contexto: "",
  zona: "",
  confluencias: "",
  gatilho: "",
  stop: "",
  alvo: "",
  risco_r: 3,
  resultado_r: 0,
  erro_tecnico: "",
  emocional: "",
  licao: "",
};

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const draftKey = user?.id ? `gl_sales_journal_draft:${user.id}` : null;

  const load = async () => {
    try {
      const { data } = await api.get("/journal");
      setEntries(data || []);
    } catch {
      toast.error("Nao foi possivel carregar o diario");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        setForm({ ...EMPTY, ...JSON.parse(raw) });
        setOpen(true);
      }
    } catch {
      /* noop */
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      if (hasDraftData(form)) localStorage.setItem(draftKey, JSON.stringify(form));
      else localStorage.removeItem(draftKey);
    } catch {
      /* noop */
    }
  }, [draftKey, form]);

  const set = (k) => (e) => {
    const v = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const exportBackup = async () => {
    try {
      const { data } = await api.get("/journal/export");
      const payload = Array.isArray(data) ? data : entries;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `diario-comercial-gl-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup do diario baixado.");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.operacional?.trim()) {
      toast.warning("Escolha o tipo de atividade.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/journal", form);
      if (draftKey) localStorage.removeItem(draftKey);
      toast.success("Registro salvo no Diario Disciplinar.");
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Apagar este registro?")) return;
    try {
      await api.delete(`/journal/${id}`);
      toast.success("Registro removido.");
      load();
    } catch {
      toast.error("Falha ao remover");
    }
  };

  const totalResult = entries.reduce((acc, e) => acc + (Number(e.resultado_r) || 0), 0);
  const positive = entries.filter((e) => Number(e.resultado_r) > 0).length;
  const avgFocus = entries.length
    ? (entries.reduce((acc, e) => acc + (Number(e.risco_r) || 0), 0) / entries.length).toFixed(1)
    : "0.0";

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="journal-page">
      <header className="gl-panel p-5 lg:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="gl-eyebrow flex items-center gap-2">
              <NotebookPen size={14} /> Diario Disciplinar
            </span>
            <h1 className="text-3xl sm:text-4xl mt-1">Autogerenciamento da operacao comercial.</h1>
            <p className="gl-text-muted text-sm mt-2 max-w-2xl">
              Registre atividade, canal, script, objecao, resultado e licao. O objetivo e enxergar padroes de trabalho, nao depender de memoria.
            </p>
          </div>
          <button className="gl-ghost-btn" onClick={exportBackup} data-testid="journal-export">
            <Download size={14} /> Exportar backup
          </button>
          <button className="gl-primary-btn" onClick={() => setOpen((v) => !v)} data-testid="journal-toggle-form">
            <Plus size={14} /> {open ? "Fechar formulario" : "Registrar atividade"}
          </button>
        </div>

        <div className="grid sm:grid-cols-4 gap-3" data-testid="journal-stats">
          <Stat label="Total de registros" value={entries.length} />
          <Stat label="Resultado reportado" value={totalResult} color={totalResult >= 0 ? "var(--gl-green)" : "var(--gl-red)"} />
          <Stat label="Registros positivos" value={positive} />
          <Stat label="Foco medio (1-5)" value={avgFocus} />
        </div>
      </header>

      {open && (
        <form onSubmit={submit} className="gl-panel p-5 lg:p-6 gl-fade-in" data-testid="journal-form">
          <span className="gl-eyebrow">Novo registro</span>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Field label="Atividade" required>
              <select className="gl-input" value={form.operacional} onChange={set("operacional")} data-testid="j-operacional">
                <option value="">Escolha...</option>
                <option value="recrutamento">Recrutamento / entrevista</option>
                <option value="prospeccao">Prospecao ativa</option>
                <option value="diagnostico">Diagnostico comercial</option>
                <option value="fechamento">Fechamento / proposta</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </Field>
            <Field label="Meta do bloco">
              <input className="gl-input" placeholder="Ex: 50 contatos, 3 entrevistas, 2 fechamentos" value={form.contexto} onChange={set("contexto")} data-testid="j-contexto" />
            </Field>
            <Field label="Canal / lista">
              <input className="gl-input" placeholder="WhatsApp, Instagram, LinkedIn, CRM..." value={form.zona} onChange={set("zona")} data-testid="j-zona" />
            </Field>
            <Field label="Volume executado">
              <input className="gl-input" placeholder="Quantos contatos, entrevistas, propostas..." value={form.confluencias} onChange={set("confluencias")} data-testid="j-confluencias" />
            </Field>
            <Field label="Script / abordagem">
              <input className="gl-input" placeholder="Qual abordagem voce usou?" value={form.gatilho} onChange={set("gatilho")} data-testid="j-gatilho" />
            </Field>
            <Field label="Objecao ou trava">
              <input className="gl-input" placeholder="Caro, pensar, sem tempo, sem resposta..." value={form.stop} onChange={set("stop")} data-testid="j-stop" />
            </Field>
            <Field label="Proxima acao">
              <input className="gl-input" placeholder="Follow-up, proposta, entrevista, handoff..." value={form.alvo} onChange={set("alvo")} data-testid="j-alvo" />
            </Field>
            <Field label="Foco / energia (1-5)">
              <input type="number" min="1" max="5" step="1" className="gl-input" value={form.risco_r} onChange={set("risco_r")} data-testid="j-risco_r" />
            </Field>
            <Field label="Resultado numerico">
              <input type="number" step="1" className="gl-input" value={form.resultado_r} onChange={set("resultado_r")} data-testid="j-resultado_r" />
            </Field>
            <Field label="Falha do processo">
              <input className="gl-input" placeholder="Ex: sem follow-up, script longo, lead sem status..." value={form.erro_tecnico} onChange={set("erro_tecnico")} data-testid="j-erro_tecnico" />
            </Field>
            <Field label="Estado emocional">
              <input className="gl-input" placeholder="Calmo, ansioso, confiante, disperso..." value={form.emocional} onChange={set("emocional")} data-testid="j-emocional" />
            </Field>
            <Field label="Licao" full>
              <textarea className="gl-input gl-textarea" placeholder="O que voce vai ajustar no proximo bloco?" value={form.licao} onChange={set("licao")} data-testid="j-licao" />
            </Field>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <button type="button" className="gl-ghost-btn" onClick={() => setOpen(false)} data-testid="journal-cancel">Cancelar</button>
            <button type="submit" className="gl-primary-btn" disabled={saving} data-testid="journal-save">
              {saving ? "Salvando..." : "Salvar registro"}
            </button>
          </div>
        </form>
      )}

      <section className="grid gap-3" data-testid="journal-entries">
        {entries.length === 0 ? (
          <div className="gl-panel p-7 text-center gl-text-muted text-sm">
            Sem registros ainda. Comece pela primeira atividade do dia.
          </div>
        ) : (
          entries.map((e) => {
            const result = Number(e.resultado_r) || 0;
            return (
              <div key={e.id} className="gl-panel p-5" data-testid={`entry-${e.id}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="gl-tag gl-tag-gold">{smartPt(e.operacional)}</span>
                      <span className="gl-text-soft text-xs">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <h3 className="text-lg mt-1">{smartPt(e.contexto) || "Sem meta informada"}</h3>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md font-bold text-sm"
                    style={{
                      background: result > 0 ? "rgba(53,208,143,0.13)" : "rgba(244,241,231,0.06)",
                      color: result > 0 ? "var(--gl-green)" : "var(--gl-muted)",
                    }}
                  >
                    {result > 0 ? <TrendingUp size={14} /> : <Minus size={14} />}
                    {result}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 mt-3 text-sm">
                  <Item k="Canal" v={e.zona} />
                  <Item k="Script" v={e.gatilho} />
                  <Item k="Proxima acao" v={e.alvo} />
                  <Item k="Volume" v={e.confluencias} />
                  <Item k="Objecao" v={e.stop} />
                  <Item k="Foco" v={e.risco_r} />
                  <Item k="Falha do processo" v={e.erro_tecnico} />
                  <Item k="Emocional" v={e.emocional} />
                </div>
                {e.licao && (
                  <div className="gl-decision-quote mt-3 text-sm">
                    <span className="gl-eyebrow block mb-1">Licao</span>
                    {smartPt(e.licao)}
                  </div>
                )}
                <div className="flex justify-end mt-3">
                  <button onClick={() => remove(e.id)} className="gl-danger-btn !min-h-[36px] !px-3" data-testid={`entry-delete-${e.id}`}>
                    <Trash2 size={14} /> Apagar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function Field({ label, children, full = false, required = false }) {
  return (
    <label className={`grid gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="gl-label">{label}{required && <span className="text-[var(--gl-red)]"> *</span>}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="gl-panel-soft p-4">
      <span className="gl-text-soft text-xs">{label}</span>
      <strong className="block mt-1 text-xl" style={{ color: color || "var(--gl-gold-2)" }}>
        {value}
      </strong>
    </div>
  );
}

function hasDraftData(form) {
  return Object.entries(form).some(([key, value]) => {
    if (key === "risco_r") return Number(value) !== Number(EMPTY.risco_r);
    if (key === "resultado_r") return Number(value) !== Number(EMPTY.resultado_r);
    return String(value || "").trim().length > 0;
  });
}

function Item({ k, v }) {
  return (
    <div className="flex gap-2">
      <span className="gl-text-soft text-xs uppercase tracking-wider min-w-[120px]">{k}</span>
      <span className="gl-text-muted text-sm">{smartPt(v) || "-"}</span>
    </div>
  );
}

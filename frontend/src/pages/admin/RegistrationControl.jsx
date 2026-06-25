import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock3,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";

const emptyCodeForm = {
  code: "",
  label: "",
  code_type: "turma",
  max_uses: "",
  expires_at: "",
  active: true,
  auto_approve: false,
  entitlement: "",
  notes: "",
};

function statusLabel(status) {
  if (status === "pending") return "pendente";
  if (status === "blocked") return "bloqueado";
  return "ativo";
}

function statusClass(status) {
  if (status === "pending") return "gl-tag-gold";
  if (status === "blocked") return "gl-tag-red";
  return "gl-tag-green";
}

function formatDate(value) {
  if (!value) return "sem data";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

function shortAgent(value = "") {
  if (!value) return "sem dispositivo";
  return value.replace(/\s+/g, " ").slice(0, 96);
}

export default function RegistrationControl() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState("");
  const [codeForm, setCodeForm] = useState(emptyCodeForm);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/registrations");
      setData(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const students = data?.students || [];
  const pending = data?.pending_students || [];
  const blocked = data?.blocked_students || [];
  const codes = data?.codes || [];
  const events = data?.events || [];

  const sortedStudents = [...students].sort((a, b) => {
    const order = { pending: 0, blocked: 1, active: 2 };
    return (order[a.account_status || "active"] ?? 2) - (order[b.account_status || "active"] ?? 2);
  });

  const action = async (student, type) => {
    const id = student.id;
    const label = `${type}:${id}`;
    setBusy(label);
    try {
      if (type === "delete") {
        const ok = window.confirm(`Remover ${student.email}? Isso apaga progresso, diario, respostas e acesso.`);
        if (!ok) return;
        await api.delete(`/admin/students/${id}`);
        toast.success("Aluno removido.");
      } else {
        await api.post(`/admin/students/${id}/${type}`, { reason });
        toast.success(type === "approve" ? "Aluno aprovado." : type === "block" ? "Aluno bloqueado." : "Aluno reativado.");
      }
      setReason("");
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy("");
    }
  };

  const createCode = async () => {
    if (!codeForm.label.trim()) {
      toast.error("Informe um nome para o codigo.");
      return;
    }
    setBusy("create-code");
    try {
      const payload = {
        ...codeForm,
        code: codeForm.code.trim() || undefined,
        max_uses: codeForm.max_uses ? Number(codeForm.max_uses) : null,
        expires_at: codeForm.expires_at || null,
      };
      const { data: created } = await api.post("/admin/access-codes", payload);
      toast.success(`Codigo criado: ${created.code}`);
      setCodeForm(emptyCodeForm);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy("");
    }
  };

  const patchCode = async (code, patch) => {
    setBusy(`code:${code.id}`);
    try {
      await api.patch(`/admin/access-codes/${code.id}`, patch);
      toast.success("Codigo atualizado.");
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy("");
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Codigo copiado.");
    } catch {
      toast.message(code);
    }
  };

  if (loading && !data) {
    return <div className="gl-panel p-6 text-sm gl-text-muted">Carregando controle de cadastros...</div>;
  }

  return (
    <section className="grid gap-4" data-testid="registrations-tab">
      <div className="gl-panel p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="gl-eyebrow flex items-center gap-2">
              <ShieldCheck size={14} /> Controle de Cadastros
            </span>
            <h2 className="text-2xl mt-1">Aprovacao, bloqueio, codigos e auditoria</h2>
            <p className="gl-text-muted text-sm mt-2 max-w-3xl">
              Use esta area quando o codigo vazar, quando uma turma nova abrir ou quando voce quiser aprovar cada aluno antes
              de liberar a plataforma.
            </p>
          </div>
          <button onClick={load} className="gl-ghost-btn" disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3 mt-4">
          <MiniStat icon={Clock3} label="Pendentes" value={data?.stats?.pending || 0} tone="gold" />
          <MiniStat icon={UserCheck} label="Ativos" value={data?.stats?.active || 0} tone="green" />
          <MiniStat icon={ShieldOff} label="Bloqueados" value={data?.stats?.blocked || 0} tone="red" />
          <MiniStat icon={KeyRound} label="Codigos" value={data?.stats?.codes || 0} tone="gold" />
          <MiniStat icon={ShieldAlert} label="Eventos auditados" value={data?.stats?.events || 0} tone="green" />
        </div>
        <div className="gl-feedback warn mt-4 text-sm">
          Novos cadastros ficam pendentes por padrao. Para liberar automaticamente uma campanha especifica, crie um codigo
          com autoaprovacao ligada.
        </div>
      </div>

      <section className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-4">
        <div className="gl-panel p-4">
          <span className="gl-eyebrow">Aprovacao manual - {pending.length}</span>
          <div className="grid gap-2 mt-3">
            {pending.length === 0 && <div className="gl-panel-soft p-4 text-sm gl-text-muted">Nenhum aluno aguardando aprovacao.</div>}
            {pending.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                busy={busy}
                onApprove={() => action(student, "approve")}
                onBlock={() => action(student, "block")}
                onDelete={() => action(student, "delete")}
              />
            ))}
          </div>
        </div>

        <div className="gl-panel p-4">
          <span className="gl-eyebrow">Motivo interno</span>
          <p className="gl-text-muted text-sm mt-2">
            O motivo fica salvo no aluno/evento para voce lembrar por que aprovou, bloqueou ou reativou alguem.
          </p>
          <textarea
            className="gl-input gl-textarea mt-3"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: comprador confirmado, e-mail nao encontrado na lista, suspeita de codigo vazado..."
          />
        </div>
      </section>

      <section className="gl-panel p-4">
        <span className="gl-eyebrow">Todos os alunos</span>
        <div className="grid gap-2 mt-3 max-h-[560px] overflow-auto pr-1">
          {sortedStudents.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              busy={busy}
              onApprove={() => action(student, "approve")}
              onBlock={() => action(student, "block")}
              onUnblock={() => action(student, "unblock")}
              onDelete={() => action(student, "delete")}
            />
          ))}
        </div>
      </section>

      <section className="grid xl:grid-cols-[420px_minmax(0,1fr)] gap-4">
        <div className="gl-panel p-4">
          <span className="gl-eyebrow flex items-center gap-2">
            <KeyRound size={14} /> Criar codigo
          </span>
          <div className="grid gap-3 mt-4">
            <Field label="Nome interno">
              <input className="gl-input" value={codeForm.label} onChange={(e) => setCodeForm({ ...codeForm, label: e.target.value })} placeholder="Turma Junho 2026" />
            </Field>
            <Field label="Codigo opcional">
              <input className="gl-input" value={codeForm.code} onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })} placeholder="Deixe vazio para gerar automatico" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className="gl-input" value={codeForm.code_type} onChange={(e) => setCodeForm({ ...codeForm, code_type: e.target.value })}>
                  <option value="turma">Turma</option>
                  <option value="individual">Individual</option>
                  <option value="produto">Produto</option>
                </select>
              </Field>
              <Field label="Limite de usos">
                <input className="gl-input" type="number" min="1" value={codeForm.max_uses} onChange={(e) => setCodeForm({ ...codeForm, max_uses: e.target.value })} placeholder="Sem limite" />
              </Field>
            </div>
            <Field label="Validade">
              <input className="gl-input" type="datetime-local" value={codeForm.expires_at} onChange={(e) => setCodeForm({ ...codeForm, expires_at: e.target.value })} />
            </Field>
            <Field label="Entitlement opcional">
              <input className="gl-input" value={codeForm.entitlement} onChange={(e) => setCodeForm({ ...codeForm, entitlement: e.target.value })} placeholder="gl_risk_auto se quiser liberar pacote premium" />
            </Field>
            <Field label="Notas">
              <textarea className="gl-input gl-textarea" value={codeForm.notes} onChange={(e) => setCodeForm({ ...codeForm, notes: e.target.value })} placeholder="Origem da venda, campanha, lote..." />
            </Field>
            <label className="flex items-center gap-2 text-sm gl-text-muted">
              <input type="checkbox" checked={codeForm.active} onChange={(e) => setCodeForm({ ...codeForm, active: e.target.checked })} />
              Codigo ativo
            </label>
            <label className="flex items-center gap-2 text-sm gl-text-muted">
              <input type="checkbox" checked={codeForm.auto_approve} onChange={(e) => setCodeForm({ ...codeForm, auto_approve: e.target.checked })} />
              Autoaprovar quem usar este codigo
            </label>
            <button className="gl-primary-btn justify-self-start" onClick={createCode} disabled={busy === "create-code"}>
              <KeyRound size={14} /> Criar codigo
            </button>
          </div>
        </div>

        <div className="gl-panel p-4">
          <span className="gl-eyebrow">Codigos ativos e historico de uso</span>
          <div className="grid gap-2 mt-3 max-h-[680px] overflow-auto pr-1">
            {codes.length === 0 && <div className="gl-panel-soft p-4 text-sm gl-text-muted">Nenhum codigo criado ainda. O codigo legado do Render continua aceito como fallback.</div>}
            {codes.map((code) => (
              <div key={code.id} className="gl-panel-soft p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <strong>{code.label}</strong>
                      <span className={`gl-tag ${code.usable ? "gl-tag-green" : "gl-tag-red"}`}>{code.usable ? "usavel" : "travado"}</span>
                      {code.auto_approve && <span className="gl-tag gl-tag-gold">autoaprova</span>}
                    </div>
                    <div className="text-sm gl-text-gold mt-1">{code.code}</div>
                    <div className="text-xs gl-text-muted mt-1">
                      {code.code_type} - usos {code.uses_count}{code.max_uses ? `/${code.max_uses}` : ""} - validade {code.expires_at ? formatDate(code.expires_at) : "sem validade"}
                    </div>
                    {code.notes && <p className="text-xs gl-text-soft mt-1">{code.notes}</p>}
                  </div>
                  <button className="gl-ghost-btn !min-h-[34px] !px-2" onClick={() => copyCode(code.code)} title="Copiar codigo">
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap mt-3">
                  <button className="gl-ghost-btn !min-h-[34px]" disabled={busy === `code:${code.id}`} onClick={() => patchCode(code, { active: !code.active })}>
                    {code.active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />} {code.active ? "Desativar" : "Ativar"}
                  </button>
                  <button className="gl-ghost-btn !min-h-[34px]" disabled={busy === `code:${code.id}`} onClick={() => patchCode(code, { auto_approve: !code.auto_approve })}>
                    <UserCheck size={14} /> {code.auto_approve ? "Exigir aprovacao" : "Autoaprovar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gl-panel p-4">
        <span className="gl-eyebrow">Historico completo de acesso</span>
        <div className="grid gap-2 mt-3 max-h-[520px] overflow-auto pr-1">
          {events.map((event) => (
            <div key={event.id} className="gl-panel-soft p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <strong className="text-sm">{event.email || "sem e-mail"}</strong>
                  <div className="text-xs gl-text-muted">
                    {event.event_type} - {event.success === false ? "falha/bloqueio" : "ok"} - {event.reason || "sem motivo"}
                  </div>
                  <div className="text-xs gl-text-soft mt-1">IP: {event.ip || "n/a"} - {shortAgent(event.user_agent)}</div>
                </div>
                <span className="text-xs gl-text-soft">{formatDate(event.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function StudentRow({ student, busy, onApprove, onBlock, onUnblock, onDelete }) {
  const status = student.account_status || "active";
  return (
    <div className="gl-panel-soft p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <strong className="text-sm">{student.name || "Aluno"}</strong>
            <span className={`gl-tag ${statusClass(status)}`}>{statusLabel(status)}</span>
          </div>
          <div className="text-xs gl-text-soft break-all">{student.email}</div>
          <div className="text-xs gl-text-muted mt-1">
            Criado: {formatDate(student.created_at)} - Ultimo login: {formatDate(student.last_login_at)}
          </div>
          <div className="text-xs gl-text-soft mt-1">
            Codigo: {student.registration_code_label || "legado/nao informado"} {student.registration_code ? `(${student.registration_code})` : ""}
          </div>
          <div className="text-xs gl-text-soft mt-1">
            IP cadastro: {student.registration_ip || "n/a"} - {shortAgent(student.registration_user_agent)}
          </div>
          {student.onboarding && (
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              <ProfileInfo label="Funções" value={(student.onboarding.roles || []).join(", ") || student.onboarding.role} />
              <ProfileInfo label="Experiência" value={student.onboarding.experience} />
              <ProfileInfo label="Objetivo" value={student.onboarding.goal} />
              <ProfileInfo label="Desafio" value={student.onboarding.challenge} />
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {status !== "active" && (
            <button className="gl-secondary-btn !min-h-[34px]" disabled={busy.includes(student.id)} onClick={onApprove}>
              <UserCheck size={14} /> Aprovar
            </button>
          )}
          {status === "blocked" && (
            <button className="gl-ghost-btn !min-h-[34px]" disabled={busy.includes(student.id)} onClick={onUnblock}>
              <CheckCircle2 size={14} /> Reativar
            </button>
          )}
          {status !== "blocked" && (
            <button className="gl-ghost-btn !min-h-[34px]" disabled={busy.includes(student.id)} onClick={onBlock}>
              <UserX size={14} /> Bloquear
            </button>
          )}
          <button className="gl-ghost-btn !min-h-[34px]" disabled={busy.includes(student.id)} onClick={onDelete}>
            <Trash2 size={14} /> Remover
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }) {
  const colorClass = tone === "green" ? "gl-text-green" : tone === "red" ? "gl-text-red" : "gl-text-gold";
  return (
    <div className="gl-panel-soft p-4">
      <div className="flex items-center gap-2 gl-text-soft text-xs">
        <Icon size={14} /> {label}
      </div>
      <strong className={`block mt-1 text-2xl ${colorClass}`}>{value}</strong>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="gl-label">{label}</span>
      {children}
    </label>
  );
}

function ProfileInfo({ label, value }) {
  return (
    <div className="rounded-md border px-3 py-2" style={{ borderColor: "var(--gl-line)" }}>
      <span className="block text-[10px] uppercase tracking-wider gl-text-soft">{label}</span>
      <strong className="block text-xs mt-1">{value || "Não informado"}</strong>
    </div>
  );
}

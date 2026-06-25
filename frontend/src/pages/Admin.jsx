import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import RegistrationControl from "@/pages/admin/RegistrationControl";
import CommissionApproval from "@/pages/admin/CommissionApproval";
import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Mail,
  Megaphone,
  Newspaper,
  Pencil,
  PlusCircle,
  Save,
  Send,
  Shield,
  ShoppingBag,
  Users,
  KeyRound,
  X,
} from "lucide-react";

export default function Admin() {
  const [tab, setTab] = useState("students");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/stats");
        setStats(data);
      } catch (e) {}
    })();
  }, []);

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="admin-page">
      <header className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow flex items-center gap-2">
          <Shield size={14} /> Painel de Gestão - Admin
        </span>
        <h1 className="text-3xl sm:text-4xl mt-1">Central da gestão</h1>
        <p className="gl-text-muted text-sm mt-2 max-w-2xl">
          Acompanhe o avanço de cada colaborador, confira vídeos assistidos e questionários, edite aulas e gerencie a operação.
        </p>

        {stats && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3 mt-4">
            <Stat label="Colaboradores" value={stats.students} icon={Users} />
            <Stat label="Onboarded" value={stats.onboarded} icon={Users} />
            <Stat label="Respostas" value={stats.total_attempts} icon={BarChart3} />
            <Stat label="Diario Disciplinar" value={stats.journal_entries} icon={BookOpen} />
            <Stat label="Logins" value={stats.logins || 0} icon={BarChart3} />
            <Stat label="Falhas login" value={stats.failed_logins || 0} icon={Shield} />
          </div>
        )}
        {stats?.last_access_events?.length > 0 && (
          <div className="gl-panel-soft p-3 mt-4">
            <span className="gl-eyebrow">Ultimos acessos</span>
            <div className="grid gap-1 mt-2">
              {stats.last_access_events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 text-xs gl-text-muted">
                  <span>{event.email || "sem e-mail"} - {event.event_type}</span>
                  <span className="gl-text-soft">{new Date(event.created_at).toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-wrap gap-2" data-testid="admin-tabs">
        <button onClick={() => setTab("students")} className={`gl-tab-btn ${tab === "students" ? "active" : ""}`} data-testid="admin-tab-students">
          <Users size={14} /> Progresso da equipe
        </button>
        <button onClick={() => setTab("registrations")} className={`gl-tab-btn ${tab === "registrations" ? "active" : ""}`} data-testid="admin-tab-registrations">
          <KeyRound size={14} /> Cadastros
        </button>
        <button onClick={() => setTab("commissions")} className={`gl-tab-btn ${tab === "commissions" ? "active" : ""}`} data-testid="admin-tab-commissions">
          <BadgeDollarSign size={14} /> Comissões
        </button>
        <button onClick={() => setTab("modules")} className={`gl-tab-btn ${tab === "modules" ? "active" : ""}`} data-testid="admin-tab-modules">
          <Pencil size={14} /> Modulos
        </button>
        <button onClick={() => setTab("updates")} className={`gl-tab-btn ${tab === "updates" ? "active" : ""}`} data-testid="admin-tab-updates">
          <Megaphone size={14} /> Novidades
        </button>
        <button onClick={() => setTab("system")} className={`gl-tab-btn ${tab === "system" ? "active" : ""}`} data-testid="admin-tab-system">
          <Mail size={14} /> SMTP e push
        </button>
        <button onClick={() => setTab("upsells")} className={`gl-tab-btn ${tab === "upsells" ? "active" : ""}`} data-testid="admin-tab-upsells">
          <ExternalLink size={14} /> Diagnostico comercial
        </button>
      </div>

      {tab === "students" && <StudentsTab />}
      {tab === "registrations" && <RegistrationControl />}
      {tab === "commissions" && <CommissionApproval />}
      {tab === "modules" && <ModulesTab />}
      {tab === "updates" && <UpdatesAdminTab />}
      {tab === "system" && <SystemTab />}
      {tab === "upsells" && <UpsellsTab />}
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="gl-panel-soft p-4">
      <div className="flex items-center gap-2 gl-text-soft text-xs">
        <Icon size={14} /> {label}
      </div>
      <strong className="block mt-1 text-2xl gl-text-gold">{value}</strong>
    </div>
  );
}

function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [active, setActive] = useState(null);
  const [tagLabels, setTagLabels] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [s, cfg] = await Promise.all([api.get("/admin/students"), api.get("/content/app-config")]);
        setStudents(s.data);
        setTagLabels(cfg.data?.tag_labels || {});
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, []);

  const openStudent = async (id) => {
    try {
      const { data } = await api.get(`/admin/students/${id}`);
      setActive(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <section className="grid lg:grid-cols-[1fr_minmax(0,420px)] gap-4" data-testid="students-tab">
      <div className="gl-panel p-3">
        <span className="gl-eyebrow px-2">Progresso dos colaboradores - {students.length}</span>
        <div className="grid gap-2 mt-2 max-h-[700px] overflow-auto pr-1">
          {students.length === 0 && (
            <div className="text-sm gl-text-muted p-4 text-center">Sem colaboradores cadastrados ainda.</div>
          )}
          {students.map((s) => (
            <button
              key={s.user.id}
              onClick={() => openStudent(s.user.id)}
              className={`gl-panel-soft text-left p-3 gl-card-hover ${active?.user?.id === s.user.id ? "gl-glow-gold" : ""}`}
              data-testid={`student-row-${s.user.id}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <strong className="text-sm">{s.user.name}</strong>
                  <div className="text-xs gl-text-soft break-all">{s.user.email}</div>
                  <div className="text-xs gl-text-soft">
                    Ultimo login: {s.user.last_login_at ? new Date(s.user.last_login_at).toLocaleString("pt-BR") : "ainda nao entrou"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs gl-text-soft">Lv {s.level} - {s.points} pts</div>
                  <div className="text-sm font-bold gl-text-gold">{s.overall_accuracy}%</div>
                  <div className="text-xs gl-text-soft mt-1">
                    Aulas {s.learning?.completed_modules || 0}/{s.learning?.total_modules || 0}
                  </div>
                </div>
              </div>
              {(s.learning?.total_modules || 0) > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] gl-text-soft mb-1">
                    <span>Avanço das trilhas</span>
                    <span className="gl-text-gold">{s.learning.percent || 0}%</span>
                  </div>
                  <div className="gl-progress"><span style={{ width: `${s.learning.percent || 0}%` }} /></div>
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {(s.weak_tags || []).map((t) => (
                  <span key={t.tag} className="gl-tag gl-tag-red text-[10px]">
                    {tagLabels[t.tag] || t.tag} {t.accuracy}%
                  </span>
                ))}
                {s.weak_tags?.length === 0 && (s.strong_tags || []).slice(0, 2).map((t) => (
                  <span key={t.tag} className="gl-tag gl-tag-green text-[10px]">
                    {tagLabels[t.tag] || t.tag} {t.accuracy}%
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="gl-panel p-4" data-testid="student-detail">
        {!active ? (
          <div className="gl-text-muted text-sm text-center py-12">
            Selecione um colaborador para ver o detalhe.
          </div>
        ) : (
          <div>
            <span className="gl-eyebrow">Detalhe do colaborador</span>
            <h3 className="text-xl mt-1">{active.user.name}</h3>
            <p className="gl-text-muted text-xs break-all">{active.user.email}</p>
            {active.user.onboarding && (
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <Info k="Funções" v={(active.user.onboarding.roles || []).join(", ") || active.user.onboarding.role} />
                <Info k="Experiencia" v={active.user.onboarding.experience} />
                <Info k="Objetivo" v={active.user.onboarding.goal} />
                <Info k="Desafio" v={active.user.onboarding.challenge} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Mini label="Pontos" value={active.metrics.points} />
              <Mini label="Nivel" value={`${active.metrics.level}/5`} />
              <Mini label="Taxa" value={`${active.metrics.overall_accuracy}%`} />
            </div>
            <StudentLearningProgress learning={active.learning} />
            <div className="mt-4">
              <span className="gl-eyebrow gl-text-red">Tags fracas</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(active.metrics.weak_tags || []).length === 0 && (
                  <span className="text-xs gl-text-muted">Nenhuma destacada.</span>
                )}
                {(active.metrics.weak_tags || []).map((t) => (
                  <span key={t.tag} className="gl-tag gl-tag-red">
                    {tagLabels[t.tag] || t.tag} - {t.accuracy}%
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <span className="gl-eyebrow gl-text-green">Tags fortes</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(active.metrics.strong_tags || []).length === 0 && (
                  <span className="text-xs gl-text-muted">Nenhuma destacada ainda.</span>
                )}
                {(active.metrics.strong_tags || []).map((t) => (
                  <span key={t.tag} className="gl-tag gl-tag-green">
                    {tagLabels[t.tag] || t.tag} - {t.accuracy}%
                  </span>
                ))}
              </div>
            </div>
            {active.suggested_upsells?.length > 0 && (
              <div className="mt-4">
                <span className="gl-eyebrow">Sugestão interna da gestão</span>
                <div className="grid gap-2 mt-2">
                  {active.suggested_upsells.map((u) => (
                    <div key={u.id} className="gl-panel-soft p-3">
                      <strong className="text-sm">{u.offer_title}</strong>
                      <p className="text-xs gl-text-muted mt-1">{u.offer_description}</p>
                      <div className="text-xs gl-text-soft mt-1">cupom: <span className="gl-text-gold">{u.coupon_code}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 text-xs gl-text-soft">
              Diario Disciplinar: {active.journal_count} registros.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StudentLearningProgress({ learning }) {
  if (!learning) return null;
  const trackNames = {
    recrutador: "Recrutador",
    ativo: "Vendedor Ativo",
    tecnico: "Vendedor Técnico",
  };
  const statusCopy = {
    completed: { label: "Concluída", className: "gl-tag-green" },
    quiz_pending: { label: "Questionário pendente", className: "gl-tag-gold" },
    video_pending: { label: "Vídeo pendente", className: "gl-tag-red" },
  };
  return (
    <div className="mt-5" data-testid="student-learning-progress">
      <span className="gl-eyebrow flex items-center gap-2">
        <BookOpen size={14} /> Avanço nas aulas
      </span>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Mini label="Aulas concluídas" value={`${learning.completed_modules || 0}/${learning.total_modules || 0}`} />
        <Mini label="Vídeos assistidos" value={`${learning.videos_completed || 0}/${learning.total_modules || 0}`} />
        <Mini label="Progresso" value={`${learning.percent || 0}%`} />
      </div>
      <div className="gl-progress mt-3"><span style={{ width: `${learning.percent || 0}%` }} /></div>
      <div className="grid gap-3 mt-4">
        {(learning.tracks || []).map((track) => (
          <div key={track.track} className="gl-panel-soft p-3" data-testid={`student-track-${track.track}`}>
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm">{trackNames[track.track] || track.track}</strong>
              <span className="gl-tag gl-tag-gold">{track.completed_modules}/{track.total_modules} aulas · {track.percent}%</span>
            </div>
            <div className="grid gap-2 mt-3">
              {(track.modules || []).map((module) => {
                const status = statusCopy[module.status] || statusCopy.video_pending;
                return (
                  <div key={module.id} className="p-3 rounded-lg border" style={{ borderColor: "var(--gl-border)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="gl-text-soft text-[10px] uppercase tracking-wider">Aula {String(module.order).padStart(2, "0")}</span>
                        <strong className="block text-sm mt-0.5">{module.title}</strong>
                      </div>
                      <span className={`gl-tag ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs gl-text-muted mt-2">
                      <span>Vídeo: {module.video_completed ? "assistido" : "não concluído"}</span>
                      <span>Perguntas: {module.questions_correct}/{module.total_questions}</span>
                      {module.video_completed_at && (
                        <span>Concluído em: {new Date(module.video_completed_at).toLocaleString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {(learning.tracks || []).length === 0 && (
          <div className="gl-panel-soft p-3 text-sm gl-text-muted">
            Este colaborador ainda não possui uma função de treinamento vinculada.
          </div>
        )}
      </div>
    </div>
  );
}

function ModulesTab() {
  const [modules, setModules] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/content/modules");
      setModules(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (m) => {
    setEditing(m.id);
    setForm({
      title: m.title,
      objective: m.objective,
      summary: m.summary,
      video_url: m.lesson?.video_url || "",
      lesson_text: m.lesson?.text || "",
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/modules/${editing}`, form);
      toast.success("Modulo atualizado.");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-3" data-testid="modules-tab">
      {modules.map((m) => (
        <div key={m.id} className="gl-panel p-4" data-testid={`admin-module-${m.id}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span className="gl-eyebrow">Modulo {String(m.order).padStart(2, "0")} - {m.stage}</span>
              <h3 className="text-lg mt-1">{m.title}</h3>
              <p className="text-sm gl-text-muted mt-1 max-w-2xl">{m.objective}</p>
              {m.locked && <span className="gl-tag gl-tag-gold mt-2">premium - {m.required_entitlement}</span>}
              {m.release_status === "recording" && !m.lesson?.video_url && <span className="gl-tag gl-tag-gold mt-2">em gravacao</span>}
              {m.lesson?.video_url && (
                <a href={m.lesson.video_url} target="_blank" rel="noreferrer" className="text-xs gl-text-gold mt-2 inline-flex items-center gap-1">
                  <ExternalLink size={12} /> Video configurado
                </a>
              )}
            </div>
            {editing === m.id ? (
              <button onClick={() => setEditing(null)} className="gl-ghost-btn !min-h-[34px]" data-testid={`cancel-edit-${m.id}`}>
                <X size={14} /> Cancelar
              </button>
            ) : (
              <button onClick={() => startEdit(m)} className="gl-secondary-btn !min-h-[34px]" data-testid={`edit-module-${m.id}`}>
                <Pencil size={14} /> Editar
              </button>
            )}
          </div>

          {editing === m.id && (
            <div className="grid gap-3 mt-4">
              <Field label="Titulo"><input className="gl-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Objetivo"><textarea className="gl-input gl-textarea" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} /></Field>
              <Field label="Resumo"><textarea className="gl-input gl-textarea" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
              <Field label="URL do video (YouTube / Vimeo / MP4)">
                <input className="gl-input" placeholder="https://www.youtube.com/watch?v=..." value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} data-testid={`edit-video-url-${m.id}`} />
              </Field>
              <Field label="Texto da aula (resumo curto)">
                <textarea className="gl-input gl-textarea" value={form.lesson_text} onChange={(e) => setForm({ ...form, lesson_text: e.target.value })} />
              </Field>
              <div className="flex justify-end">
                <button onClick={save} disabled={saving} className="gl-primary-btn" data-testid={`save-module-${m.id}`}>
                  <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function UpdatesAdminTab() {
  const [news, setNews] = useState([]);
  const [reports, setReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newsForm, setNewsForm] = useState({
    tag: "Atualizacao",
    title: "",
    body: "",
    action_url: "/novidades",
    send_push: true,
  });
  const [reportForm, setReportForm] = useState({
    period: "Diario",
    title: "",
    tone: "neutro",
    bullets: "",
    watchlist: "ES, NQ, SPY, QQQ, VIX, DXY",
    send_push: false,
  });

  const load = async () => {
    try {
      const [n, r] = await Promise.all([api.get("/content/news"), api.get("/content/market-reports")]);
      setNews(n.data || []);
      setReports(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveNews = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/admin/news", newsForm);
      toast.success(data?.push?.sent ? `Novidade publicada e ${data.push.sent} push enviados.` : "Novidade publicada.");
      setNewsForm({ tag: "Atualizacao", title: "", body: "", action_url: "/novidades", send_push: true });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const saveReport = async () => {
    setSaving(true);
    try {
      const payload = {
        ...reportForm,
        bullets: reportForm.bullets.split(/\n+/).map((x) => x.trim()).filter(Boolean),
        watchlist: reportForm.watchlist.split(",").map((x) => x.trim()).filter(Boolean),
      };
      const { data } = await api.post("/admin/market-reports", payload);
      toast.success(data?.push?.sent ? `Relatorio publicado e ${data.push.sent} push enviados.` : "Relatorio publicado.");
      setReportForm({ period: "Diario", title: "", tone: "neutro", bullets: "", watchlist: "ES, NQ, SPY, QQQ, VIX, DXY", send_push: false });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid xl:grid-cols-2 gap-4" data-testid="updates-admin-tab">
      <div className="gl-panel p-4">
        <span className="gl-eyebrow flex items-center gap-2"><Megaphone size={14} /> Publicar novidade</span>
        <div className="grid gap-3 mt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tag"><input className="gl-input" value={newsForm.tag} onChange={(e) => setNewsForm({ ...newsForm, tag: e.target.value })} /></Field>
            <Field label="Link de acao"><input className="gl-input" value={newsForm.action_url} onChange={(e) => setNewsForm({ ...newsForm, action_url: e.target.value })} /></Field>
          </div>
          <Field label="Titulo"><input className="gl-input" value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} /></Field>
          <Field label="Mensagem"><textarea className="gl-input gl-textarea" value={newsForm.body} onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm gl-text-muted">
            <input type="checkbox" checked={newsForm.send_push} onChange={(e) => setNewsForm({ ...newsForm, send_push: e.target.checked })} />
            Enviar push para dispositivos inscritos
          </label>
          <button className="gl-primary-btn justify-self-start" disabled={saving || !newsForm.title || !newsForm.body} onClick={saveNews}>
            <Send size={14} /> Publicar novidade
          </button>
        </div>
      </div>

      <div className="gl-panel p-4">
        <span className="gl-eyebrow flex items-center gap-2"><Newspaper size={14} /> Publicar relatorio de mercado</span>
        <div className="grid gap-3 mt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Periodo"><input className="gl-input" value={reportForm.period} onChange={(e) => setReportForm({ ...reportForm, period: e.target.value })} /></Field>
            <Field label="Tom"><input className="gl-input" value={reportForm.tone} onChange={(e) => setReportForm({ ...reportForm, tone: e.target.value })} /></Field>
          </div>
          <Field label="Titulo"><input className="gl-input" value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} /></Field>
          <Field label="Pontos do relatorio (um por linha)"><textarea className="gl-input gl-textarea" value={reportForm.bullets} onChange={(e) => setReportForm({ ...reportForm, bullets: e.target.value })} /></Field>
          <Field label="Watchlist separada por virgula"><input className="gl-input" value={reportForm.watchlist} onChange={(e) => setReportForm({ ...reportForm, watchlist: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm gl-text-muted">
            <input type="checkbox" checked={reportForm.send_push} onChange={(e) => setReportForm({ ...reportForm, send_push: e.target.checked })} />
            Enviar push avisando novo relatorio
          </label>
          <button className="gl-secondary-btn justify-self-start" disabled={saving || !reportForm.title || !reportForm.bullets} onClick={saveReport}>
            <PlusCircle size={14} /> Publicar relatorio
          </button>
        </div>
      </div>

      <div className="gl-panel p-4">
        <span className="gl-eyebrow">Ultimas novidades</span>
        <div className="grid gap-2 mt-3">
          {news.slice(0, 5).map((item) => (
            <div key={item.id} className="gl-panel-soft p-3">
              <strong className="text-sm">{item.title}</strong>
              <p className="text-xs gl-text-muted mt-1">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="gl-panel p-4">
        <span className="gl-eyebrow">Ultimos relatorios</span>
        <div className="grid gap-2 mt-3">
          {reports.slice(0, 5).map((item) => (
            <div key={item.id} className="gl-panel-soft p-3">
              <strong className="text-sm">{item.title}</strong>
              <p className="text-xs gl-text-muted mt-1">{(item.bullets || []).slice(0, 2).join(" ")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SystemTab() {
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/system-status");
      setStatus(data);
      setEmail(data?.admin_email || "");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const testPasswordReset = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/admin/system/password-reset-test", { email });
      if (data?.email_configured) toast.success("Email de recuperacao enviado.");
      else toast.warning("Fluxo gerou o link, mas SMTP ainda nao esta configurado no Render.");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid lg:grid-cols-[1fr_1fr] gap-4" data-testid="system-tab">
      <div className="gl-panel p-4">
        <span className="gl-eyebrow flex items-center gap-2"><Mail size={14} /> Recuperacao de senha</span>
        <h2 className="text-2xl mt-2">SMTP</h2>
        <p className="gl-text-muted text-sm mt-2">
          O app ja tem troca de senha por link seguro. No Render gratuito, use Brevo com porta 2525 e informe host, usuario, senha e remetente.
        </p>
        <div className="grid gap-2 mt-4 text-sm">
          <StatusLine ok={status?.smtp?.configured} label="SMTP configurado" />
          <StatusLine ok={status?.smtp?.has_host} label="Host informado" />
          <StatusLine ok={status?.smtp?.has_user || status?.smtp?.allows_no_auth} label="Usuario/autenticacao" />
          <StatusLine ok={status?.smtp?.has_sender} label="Remetente configurado" />
        </div>
        <div className="grid gap-3 mt-4">
          <Field label="Enviar teste para">
            <input className="gl-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@dominio.com" />
          </Field>
          <button className="gl-primary-btn justify-self-start" disabled={busy || !email} onClick={testPasswordReset}>
            <Send size={14} /> Testar recuperacao
          </button>
        </div>
      </div>

      <div className="gl-panel p-4">
        <span className="gl-eyebrow flex items-center gap-2"><Bell size={14} /> Push e interacao</span>
        <h2 className="text-2xl mt-2">Notificacoes</h2>
        <p className="gl-text-muted text-sm mt-2">
          Alunos recebem push depois de ativarem alertas na pagina Novidades. O mentor publica pelo painel de novidades.
        </p>
        <div className="grid gap-2 mt-4 text-sm">
          <StatusLine ok={status?.push?.configured} label="VAPID configurado" />
          <StatusLine ok={status?.push?.webpush_available} label="Biblioteca push ativa no backend" />
          <StatusLine ok={(status?.push?.subscriptions || 0) > 0} label={`${status?.push?.subscriptions || 0} dispositivos inscritos`} />
        </div>
        <button className="gl-ghost-btn mt-4" onClick={load}>
          <CheckCircle2 size={14} /> Atualizar status
        </button>
      </div>
    </section>
  );
}

function StatusLine({ ok, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`gl-tag ${ok ? "gl-tag-green" : "gl-tag-red"}`}>{ok ? "ok" : "pendente"}</span>
      <span className="gl-text-muted">{label}</span>
    </div>
  );
}

function UpsellsTab() {
  const [rules, setRules] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/upsells");
      setRules(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const start = (r) => {
    setEditing(r.id);
    setForm({
      offer_title: r.offer_title || "",
      offer_description: r.offer_description || "",
      coupon_code: r.coupon_code || "",
      payment_url: r.payment_url || "",
      schedule_url: r.schedule_url || "",
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/upsells/${editing}`, form);
      toast.success("Regra atualizada.");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-3" data-testid="upsells-tab">
      <div className="gl-panel-soft p-4">
        <span className="gl-eyebrow flex items-center gap-2"><ShoppingBag size={14} /> Produtos x diagnostico</span>
        <p className="gl-text-muted text-sm mt-2">
          A vitrine de ofertas fica na pagina Produtos. Esta aba apenas controla sugestoes internas que aparecem no diagnostico quando uma tag do aluno esta fraca.
        </p>
      </div>

      {rules.map((r) => (
        <div key={r.id} className="gl-panel p-4" data-testid={`admin-upsell-${r.id}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span className="gl-eyebrow">tag-gatilho - {r.trigger_tag}</span>
              <h3 className="text-lg mt-1">{r.offer_title}</h3>
              <p className="text-sm gl-text-muted mt-1 max-w-2xl">{r.offer_description}</p>
              <div className="text-xs gl-text-soft mt-2">
                Cupom: <span className="gl-text-gold">{r.coupon_code}</span> - Acionado quando taxa for ate {r.max_accuracy_percent}% apos no minimo {r.min_attempts} respostas.
              </div>
            </div>
            {editing === r.id ? (
              <button onClick={() => setEditing(null)} className="gl-ghost-btn !min-h-[34px]">
                <X size={14} /> Cancelar
              </button>
            ) : (
              <button onClick={() => start(r)} className="gl-secondary-btn !min-h-[34px]" data-testid={`edit-upsell-${r.id}`}>
                <Pencil size={14} /> Editar
              </button>
            )}
          </div>
          {editing === r.id && (
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <Field label="Titulo da sugestao"><input className="gl-input" value={form.offer_title} onChange={(e) => setForm({ ...form, offer_title: e.target.value })} /></Field>
              <Field label="Cupom"><input className="gl-input" value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} /></Field>
              <Field label="Descricao" full><textarea className="gl-input gl-textarea" value={form.offer_description} onChange={(e) => setForm({ ...form, offer_description: e.target.value })} /></Field>
              <Field label="Link de pagamento"><input className="gl-input" value={form.payment_url} onChange={(e) => setForm({ ...form, payment_url: e.target.value })} data-testid={`payment-url-${r.id}`} /></Field>
              <Field label="Link de agendamento"><input className="gl-input" value={form.schedule_url} onChange={(e) => setForm({ ...form, schedule_url: e.target.value })} data-testid={`schedule-url-${r.id}`} /></Field>
              <div className="sm:col-span-2 flex justify-end">
                <button onClick={save} className="gl-primary-btn" disabled={saving} data-testid={`save-upsell-${r.id}`}>
                  <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function Field({ label, children, full = false }) {
  return (
    <label className={`grid gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="gl-label">{label}</span>
      {children}
    </label>
  );
}

function Info({ k, v }) {
  return (
    <div className="gl-panel-soft p-2">
      <span className="gl-text-soft text-[10px] uppercase tracking-wider">{k}</span>
      <strong className="block text-sm">{v}</strong>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="gl-panel-soft p-3 text-center">
      <span className="gl-text-soft text-[10px] uppercase tracking-wider block">{label}</span>
      <strong className="block text-base mt-1 gl-text-gold">{value}</strong>
    </div>
  );
}

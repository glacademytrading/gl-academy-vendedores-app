import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  DAILY_FOCUS,
  ROLE_TRACKS,
  STUDENT_MATERIALS,
  canAccessRole,
  getRoleTrack,
  getRoleTracks,
  getUserRoleKey,
  isModuleForUser,
} from "@/lib/glAcademyContent";
import { smartPt } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Flame,
  Map,
  Megaphone,
  Newspaper,
  NotebookPen,
  PhoneCall,
  PlayCircle,
  Target,
  Trophy,
  Users,
} from "lucide-react";

function isModuleLocked(module) {
  return !!(module?.release_locked || module?.progress_locked || module?.sequence_locked || module?.premium_preview || module?.locked);
}

function isModuleComplete(module) {
  const totalQuestions = module?.progress?.total_questions || 0;
  if (totalQuestions === 0) return !!module?.progress?.lesson_done;
  return (module?.progress?.percent || 0) >= 100;
}

export default function Today() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [perf, setPerf] = useState(null);
  const [report, setReport] = useState(null);
  const [journal, setJournal] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [m, p, r, j] = await Promise.all([
          api.get("/content/modules"),
          api.get("/user/performance"),
          api.get("/user/report"),
          api.get("/journal"),
        ]);
        setModules(m.data || []);
        setPerf(p.data);
        setReport(r.data);
        setJournal(j.data || []);
      } catch {
        /* noop */
      }
    })();
  }, []);

  const userModules = modules.filter((module) => isModuleForUser(module, user));
  const availableModules = userModules.filter((m) => !isModuleLocked(m));
  const nextModule = availableModules.find((m) => !isModuleComplete(m)) || availableModules[0] || userModules[0];
  const completedModules = availableModules.filter(isModuleComplete).length;
  const firstName = user?.name?.split(" ")[0] || "time";
  const reviewFocus = report?.review_plan?.[0];
  const roleKey = getUserRoleKey(user);
  const userRole = getRoleTrack(user);
  const userRoles = getRoleTracks(user);
  const visibleFocus =
    roleKey === "gestao"
      ? DAILY_FOCUS
      : DAILY_FOCUS.filter((item) => userRoles.some((role) => role.route === item.route));
  const reviewRoute = reviewFocus?.knowledge_page_id?.startsWith("playbook-")
    ? userRole?.route || "/trilha"
    : `/conhecimento${reviewFocus?.knowledge_page_id ? `?page=${reviewFocus.knowledge_page_id}` : ""}`;

  return (
    <div className="grid gap-5 gl-fade-in">
      <section className="gl-home-hero" data-testid="today-hero">
        <div className="gl-home-topline">
          <div className="flex items-center gap-3">
            <img src="/assets/gl-academy-emblem-transparent.png" alt="GL Academy" className="gl-home-mini-logo" />
            <div>
              <strong>GL Academy</strong>
              <span>Sales Training</span>
            </div>
          </div>
          <div className="gl-home-pill">
            <Target size={15} /> Meta clara, execucao registrada
          </div>
        </div>

        <div className="gl-home-center">
          <div className="gl-home-orbit" aria-hidden="true">
            <span />
            <span />
            <img src="/assets/gl-academy-emblem-transparent.png" alt="" />
          </div>

          <button type="button" className="gl-home-entry" onClick={() => nextModule && navigate(`/modulo/${nextModule.id}`)}>
            <Flame size={16} /> Continuar treinamento
          </button>
          <h1>GL Sales Training</h1>
          <p>
            Olá, {firstName}. Hoje o objetivo é simples: dar o seu melhor para concluir suas metas e contar sempre
            com a gente!
          </p>
          <div className="gl-home-actions flex gap-2 flex-wrap justify-center mt-5">
            <button className="gl-primary-btn" onClick={() => nextModule && navigate(`/modulo/${nextModule.id}`)}>
              Próxima aula <ArrowRight size={14} />
            </button>
            <button className="gl-ghost-btn" onClick={() => navigate("/relatorio")}>
              Relatório <FileText size={14} />
            </button>
            <button className="gl-ghost-btn" onClick={() => navigate("/novidades")}>
              Mural <Megaphone size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4 gl-stagger" data-testid="daily-goals">
        {visibleFocus.map((item) => (
          <button key={item.role} type="button" className="gl-panel gl-card-hover p-5 text-left" onClick={() => navigate(item.route)}>
            <span className="gl-tag gl-tag-gold">{item.role}</span>
            <strong className="block text-2xl mt-3">{item.goal}</strong>
            <p className="gl-text-muted text-sm mt-2">{item.body}</p>
            <span className="flex justify-end mt-4 gl-text-gold text-sm font-bold items-center gap-1">
              Abrir trilha <ArrowRight size={14} />
            </span>
          </button>
        ))}
      </section>

      <section className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="gl-panel p-5 lg:p-6">
          <span className="gl-eyebrow">Foco de aprendizado</span>
          <div className="flex items-start justify-between gap-4 flex-wrap mt-1">
            <div>
              <h2 className="text-2xl">
                {nextModule ? `${String(nextModule.order).padStart(2, "0")} - ${smartPt(nextModule.title)}` : "Escolha sua trilha"}
              </h2>
              <p className="gl-text-muted text-sm mt-2 max-w-2xl">
                {smartPt(nextModule?.objective) ||
                  "Entre pela trilha do seu cargo para estudar video, resumo e questionario antes de avancar."}
              </p>
            </div>
            <button className="gl-secondary-btn" onClick={() => nextModule && navigate(`/modulo/${nextModule.id}`)}>
              Abrir aula <PlayCircle size={14} />
            </button>
          </div>
          <div className="gl-decision-quote mt-5 text-[15px]">
            Quem e meu alvo hoje, qual dor vou diagnosticar, qual proximo passo vou registrar e qual numero vou reportar?
          </div>
        </div>

        <div className="gl-panel p-5">
          <span className="gl-eyebrow">Revisao sugerida</span>
          <h3 className="text-xl mt-1 leading-tight">{smartPt(reviewFocus?.tag_label) || "Cultura GL"}</h3>
          <p className="gl-text-muted text-sm mt-2">
            {smartPt(reviewFocus?.focus) || "Revise scripts, objecoes e produto antes de acelerar o volume."}
          </p>
          <button
            className="gl-ghost-btn mt-4 w-full"
            onClick={() => navigate(reviewRoute)}
          >
            Abrir conhecimento <BookOpen size={14} />
          </button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 gl-stagger" data-testid="today-metrics">
        <Metric icon={Target} label="Taxa geral dos quizzes" value={`${perf?.overall_accuracy ?? 0}%`} accent="green" />
        <Metric icon={Flame} label="Pontos de treinamento" value={perf?.points ?? 0} accent="gold" />
        <Metric icon={Trophy} label="Nivel" value={`${perf?.level ?? 1} / 5`} accent="gold" />
        <Metric icon={CheckCircle2} label="Aulas concluidas" value={`${completedModules} / ${availableModules.length || modules.length}`} accent="cyan" />
      </section>

      <section className="gl-panel p-5 lg:p-6" data-testid="role-shortcuts">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="gl-eyebrow">Onboarding por cargo</span>
            <h2 className="text-2xl mt-1">
              {userRoles.length
                ? `Suas funções: ${userRoles.map((role) => role.shortTitle).join(", ")}`
                : "Acompanhe as funções da equipe"}
            </h2>
          </div>
          <span className="gl-tag gl-tag-gold">{journal.length} registros no diario</span>
        </div>
        <div className="grid gap-3 mt-4 md:grid-cols-3">
          <RoleCard icon={Users} role={ROLE_TRACKS.recrutador} locked={!canAccessRole(user, "recrutador")} />
          <RoleCard icon={PhoneCall} role={ROLE_TRACKS.ativo} locked={!canAccessRole(user, "ativo")} />
          <RoleCard icon={Target} role={ROLE_TRACKS.tecnico} locked={!canAccessRole(user, "tecnico")} />
        </div>
      </section>

      <MaterialsPanel user={user} />

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 gl-stagger">
        <QuickLink to="/trilha" icon={Map} title="Trilha completa" desc="Todas as aulas e progresso." />
        <QuickLink to="/novidades" icon={Megaphone} title="Novidades" desc="Mural de avisos e campanhas." />
        <QuickLink to="/mercado" icon={Newspaper} title="Mercado" desc="Briefing matinal para abordagem." />
        <QuickLink to="/conhecimento" icon={BookOpen} title="Conhecimento" desc="Objecoes, produtos e cultura." />
        <QuickLink to="/materiais" icon={Download} title="Materiais" desc="Playbooks e guias." />
        <QuickLink to="/diario" icon={NotebookPen} title="Diario" desc="Autogerenciamento diario." />
        <QuickLink to="/desempenho" icon={BarChart3} title="Desempenho" desc="Quizzes, tags e evolucao." />
        <QuickLink to="/relatorio" icon={FileText} title="Relatório" desc="Relatórios e comissões." />
        <QuickLink to="/links-importantes" icon={Download} title="Links importantes" desc="Canais e pagamentos oficiais." />
      </section>
    </div>
  );
}

function RoleCard({ icon: Icon, role, locked = false }) {
  const navigate = useNavigate();
  return (
    <button type="button" className={`gl-panel-soft p-4 text-left gl-card-hover ${locked ? "opacity-70" : ""}`} onClick={() => navigate(role.route)}>
      <Icon size={18} className="gl-text-gold" />
      <strong className="block mt-3 text-base">{role.shortTitle}</strong>
      {locked && <span className="gl-tag mt-2">Acesso bloqueado</span>}
      <span className="gl-eyebrow block mt-3">Metas mensais</span>
      <p className="gl-text-muted text-sm mt-1">{role.dailyGoal} - {role.secondaryGoal}</p>
    </button>
  );
}

function MaterialsPanel({ user }) {
  const roleKey = getUserRoleKey(user);
  const roles = getRoleTracks(user);
  const materials = STUDENT_MATERIALS.filter((item) => {
    if (roleKey === "gestao") return true;
    if (!item.id.startsWith("playbook-")) return true;
    return roles.some((role) => item.id === role.materialId);
  });
  return (
    <section className="gl-panel p-5 lg:p-6" data-testid="student-materials-panel">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="gl-eyebrow">Materiais da equipe</span>
          <h2 className="text-2xl mt-1">Playbooks para consulta rapida</h2>
          <p className="gl-text-muted text-sm mt-2 max-w-2xl">
            Use os guias junto com as aulas, scripts e relatorio diario.
          </p>
        </div>
        <a className="gl-secondary-btn" href="/materials/equipe/Guia_Colaborador_GL_Sales_Training.md" download>
          Baixar guia <Download size={14} />
        </a>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4 gl-stagger">
        {materials.map((item) => (
          <a key={item.id} href={item.href} download className="gl-material-card gl-card-hover" data-testid={`material-${item.id}`}>
            <span className="gl-tag gl-tag-gold w-fit">{item.stage}</span>
            <strong>{smartPt(item.title)}</strong>
            <span>{smartPt(item.description)}</span>
            <small>Baixar material <Download size={12} /></small>
          </a>
        ))}
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value, accent }) {
  const color =
    accent === "gold" ? "var(--gl-gold-2)" : accent === "green" ? "var(--gl-green)" : accent === "cyan" ? "var(--gl-cyan)" : "var(--gl-text)";
  return (
    <div className="gl-panel p-4">
      <div className="flex items-center gap-2 gl-text-soft text-xs">
        <Icon size={14} /> {label}
      </div>
      <strong className="block mt-2 text-2xl lg:text-3xl" style={{ color }}>
        {value}
      </strong>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, desc }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)} className="gl-panel gl-card-hover p-4 text-left">
      <Icon size={18} className="gl-text-gold" />
      <strong className="block mt-2 text-base">{title}</strong>
      <span className="gl-text-muted text-sm mt-1 block">{desc}</span>
    </button>
  );
}

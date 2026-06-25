import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { smartPt } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleTracks, getUserRoleKey, isModuleForUser } from "@/lib/glAcademyContent";
import { ChevronRight, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";

const PREMIUM_MODULE_ID = "m20_risk_auto_prop";

const stageColor = {
  Comece: "var(--gl-gold-2)",
  Recrutador: "var(--gl-cyan)",
  "Vendedor Ativo": "var(--gl-green)",
  "Vendedor Tecnico": "var(--gl-gold-2)",
  Evoluir: "var(--gl-violet)",
};

export default function Trail() {
  const [modules, setModules] = useState([]);
  const [stages, setStages] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const [m, s] = await Promise.all([api.get("/content/modules"), api.get("/content/journey-stages")]);
      setModules((m.data || []).filter((module) => isModuleForUser(module, user)));
      setStages(s.data);
    })();
  }, [user]);

  const getModule = (id) => modules.find((m) => m.id === id);
  const roles = getRoleTracks(user);
  const roleKey = getUserRoleKey(user);
  const visibleStages = stages
    .map((stage) => ({
      ...stage,
      modules: (stage.modules || []).filter((moduleId) => !!getModule(moduleId)),
    }))
    .filter((stage) => stage.modules.length > 0);
  const totalQ = modules.reduce((acc, m) => acc + (m.progress?.total_questions || 0), 0);
  const resolved = modules.reduce((acc, m) => acc + (m.progress?.resolved || 0), 0);
  const overall = totalQ ? Math.round((resolved / totalQ) * 100) : 0;
  const canAccessPremium = user?.role === "admin" || (user?.entitlements || []).includes("gl_risk_auto");
  const isPremiumLocked = (module) =>
    (module?.premium_preview || module?.locked || module?.id === PREMIUM_MODULE_ID) && !canAccessPremium;
  const isProgressLocked = (module) => !!module?.progress_locked;
  const isSequenceLocked = (module) => !!module?.sequence_locked;
  const isReleaseLocked = (module) => !!module?.release_locked;
  const isLocked = (module) => isPremiumLocked(module) || isProgressLocked(module) || isReleaseLocked(module) || isSequenceLocked(module);
  const openModule = (module) => {
    if (!module) return;
    if (isPremiumLocked(module)) {
      navigate("/workshop-gl-risk-auto");
      return;
    }
    if (isReleaseLocked(module)) {
      toast.info("Esta aula esta em gravacao e sera liberada quando o video oficial entrar na plataforma.");
      return;
    }
    if (isSequenceLocked(module)) {
      toast.info("Conclua a aula anterior para liberar esta etapa da trilha.");
      return;
    }
    navigate(`/modulo/${module.id}`);
  };

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="trail-page">
      <header
        className="p-5 lg:p-6 rounded-md gl-panel"
        style={{ border: "1px solid rgba(216, 180, 92, 0.18)" }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="gl-eyebrow">Trilha personalizada</span>
            <h1 className="text-3xl sm:text-4xl mt-1">
              {roleKey === "gestao"
                ? "Jornada da equipe GL Academy"
                : roles.length === 1
                  ? roles[0].title
                  : "Suas trilhas de formação"}
            </h1>
            <p className="gl-text-muted text-sm mt-2 max-w-2xl">
              {roleKey === "gestao"
                ? "A gestão pode visualizar todas as trilhas da equipe e acompanhar a estrutura completa de formação."
                : `Esta área reúne somente o conteúdo liberado para suas funções: ${roles.map((role) => role.shortTitle).join(", ")}. Avance pelas aulas, resumos e questionários das suas trilhas.`}
            </p>
          </div>
          <div className="min-w-[240px]">
            <div className="flex justify-between text-xs gl-text-muted mb-1">
              <span>Progresso global</span>
              <span className="gl-text-gold">{overall}%</span>
            </div>
            <div className="gl-progress">
              <span style={{ width: `${overall}%` }} />
            </div>
            <div className="text-xs gl-text-soft mt-1">
              {resolved} de {totalQ} perguntas resolvidas
            </div>
          </div>
        </div>
      </header>

      {/* Journey stages */}
      <section className="grid md:grid-cols-2 xl:grid-cols-5 gap-3 gl-stagger" data-testid="journey-stages">
        {visibleStages.map((stage) => (
          <div key={stage.id} className="gl-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: stageColor[stage.title] || "var(--gl-gold-2)" }}
              />
              <strong className="text-sm" style={{ color: stageColor[stage.title] || "var(--gl-gold-2)" }}>
                {smartPt(stage.title)}
              </strong>
            </div>
            <p className="gl-text-muted text-xs leading-relaxed min-h-[48px]">{smartPt(stage.promise)}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {stage.modules.map((mid) => {
                const m = getModule(mid);
                const done = m?.progress?.percent === 100;
                return (
                  <button
                    key={mid}
                    onClick={() => openModule(m)}
                    className={`gl-stage-dot ${done ? "done" : ""} ${isLocked(m) ? "locked" : ""}`}
                    title={m?.title}
                    data-testid={`stage-dot-${mid}`}
                  >
                    {isLocked(m) ? <Lock size={13} /> : m?.order || "·"}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Modules grid */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 gl-stagger" data-testid="modules-grid">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => openModule(m)}
            className={`gl-panel gl-card-hover overflow-hidden text-left ${isLocked(m) ? "gl-locked-card" : ""}`}
            data-testid={`module-card-${m.id}`}
          >
            <div
              className="relative h-[140px]"
              style={{
                background: `linear-gradient(180deg, rgba(15,15,13,0.05), rgba(15,15,13,0.86)), url('/assets/chart-${String(((m.order - 1) % 4) + 1).padStart(2, "0")}.jpeg') center/cover`,
              }}
            >
              <span
                className="absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-bold"
                style={{ background: "rgba(0,0,0,0.6)", color: "var(--gl-gold-2)", border: "1px solid rgba(216,180,92,0.4)" }}
              >
                {String(m.order).padStart(2, "0")}
              </span>
              {m.stage && (
                <span
                  className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide"
                  style={{ background: "rgba(0,0,0,0.55)", color: stageColor[m.stage] || "var(--gl-gold-2)" }}
                >
                  {m.stage}
                </span>
              )}
              {m.progress?.percent === 100 && (
                <span
                  className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                  style={{ background: "rgba(53,208,143,0.18)", color: "var(--gl-green)" }}
                >
                  <CheckCircle2 size={12} /> concluído
                </span>
              )}
              {isLocked(m) && (
                <span
                  className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                  style={{ background: "rgba(0,0,0,0.68)", color: "var(--gl-gold-2)", border: "1px solid rgba(216,180,92,0.42)" }}
                >
                  <Lock size={12} /> {isPremiumLocked(m) ? "premium" : isReleaseLocked(m) ? "em gravacao" : isSequenceLocked(m) ? "por sequencia" : "por evolucao"}
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg leading-tight">{smartPt(m.title)}</h3>
              <p className="gl-text-muted text-sm mt-1.5 line-clamp-2">{smartPt(m.objective)}</p>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {(m.tags || []).slice(0, 3).map((t) => (
                  <span key={t} className="gl-tag">{t}</span>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] gl-text-soft mb-1">
                  <span>{m.progress?.resolved || 0}/{m.progress?.total_questions || 0} perguntas</span>
                  <span className="gl-text-gold">{m.progress?.percent || 0}%</span>
                </div>
                <div className="gl-progress">
                  <span style={{ width: `${m.progress?.percent || 0}%` }} />
                </div>
              </div>
              <div className="flex justify-end mt-3 gl-text-gold text-sm font-bold items-center gap-1">
                {isPremiumLocked(m) ? "Ver workshop" : isReleaseLocked(m) ? "Em gravacao" : isSequenceLocked(m) ? "Concluir anterior" : isProgressLocked(m) ? "Ver requisitos" : "Abrir"} <ChevronRight size={14} />
              </div>
            </div>
          </button>
        ))}
      </section>
      {roleKey && roleKey !== "gestao" && modules.length === 0 && (
        <div className="gl-panel p-6 gl-text-muted text-sm">
          Nenhuma aula foi vinculada a esta função ainda.
        </div>
      )}
    </div>
  );
}

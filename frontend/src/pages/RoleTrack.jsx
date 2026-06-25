import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { ROLE_TRACKS, STUDENT_MATERIALS, canAccessRole } from "@/lib/glAcademyContent";
import { smartPt } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Download,
  Lock,
  PlayCircle,
  Target,
  TrendingUp,
} from "lucide-react";

function isModuleLocked(module) {
  return !!(module?.release_locked || module?.progress_locked || module?.sequence_locked || module?.premium_preview || module?.locked);
}

function isModuleComplete(module) {
  if (!module?.progress?.lesson_done) return false;
  const totalQuestions = module?.progress?.total_questions || 0;
  if (totalQuestions === 0) return true;
  return (module?.progress?.percent || 0) >= 100;
}

export default function RoleTrack({ roleKey }) {
  const role = ROLE_TRACKS[roleKey] || ROLE_TRACKS.ativo;
  const [modules, setModules] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasAccess = canAccessRole(user, roleKey);

  useEffect(() => {
    if (!hasAccess) return;
    (async () => {
      const moduleResult = await api.get("/content/modules");
      setModules(Array.isArray(moduleResult.data) ? moduleResult.data : []);
    })();
  }, [hasAccess]);

  const roleModules = useMemo(
    () => modules.filter((module) => module.track === role.track).sort((a, b) => (a.order || 0) - (b.order || 0)),
    [modules, role.track]
  );
  const introModule = modules.find((module) => module.track === "geral");
  const nextModule = roleModules.find((module) => !isModuleLocked(module) && !isModuleComplete(module)) || roleModules.find((module) => !isModuleLocked(module));
  const completed = roleModules.filter(isModuleComplete).length;
  const totalQuestions = roleModules.reduce((sum, module) => sum + (module.progress?.total_questions || 0), 0);
  const resolvedQuestions = roleModules.reduce((sum, module) => sum + (module.progress?.resolved || 0), 0);
  const progress = roleModules.length ? Math.round((completed / roleModules.length) * 100) : 0;
  const materialIds =
    roleKey === "recrutador"
      ? [
          "recrutador-proposta-funcao",
          "recrutador-manual-gestao",
          "recrutador-checklist-liberacao",
          "recrutador-regras-comissao",
          "recrutador-estrutura-global",
        ]
      : roleKey === "ativo"
        ? [
            "ativo-como-ganhar",
            "ativo-gestao-objecoes",
            "ativo-formas-pagamento",
            "ativo-scripts-captacao",
            "ativo-checklist-handoff",
          ]
      : roleKey === "tecnico"
        ? [
            "tecnico-formas-pagamento",
            "tecnico-gestao-objecoes",
          ]
      : [
          "guia-colaborador",
          role.materialId,
        ];
  const roleMaterials = STUDENT_MATERIALS.filter(
    (material) => material.id !== "objecoes" && materialIds.includes(material.id)
  );

  const openModule = (module) => {
    if (!module) return;
    if (isModuleLocked(module)) return;
    navigate(`/modulo/${module.id}`);
  };

  if (!hasAccess) {
    return (
      <div className="gl-panel p-7 lg:p-10 gl-fade-in text-center max-w-3xl mx-auto mt-8" data-testid={`role-locked-${roleKey}`}>
        <span
          className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{ background: "rgba(216, 180, 92, 0.12)", color: "var(--gl-gold-2)", border: "1px solid rgba(216, 180, 92, 0.35)" }}
        >
          <Lock size={28} />
        </span>
        <span className="gl-eyebrow block mt-5">Conteúdo protegido por função</span>
        <h1 className="text-3xl sm:text-4xl mt-2">{role.shortTitle}</h1>
        <p className="gl-text-muted mt-3 max-w-xl mx-auto">
          Esta trilha não faz parte das funções selecionadas no seu cadastro. Para manter o treinamento objetivo e
          alinhado às suas responsabilidades, o acesso permanece bloqueado.
        </p>
        <p className="text-sm mt-3 gl-text-soft">
          Se suas responsabilidades mudaram, fale com a gestão ou com o suporte para atualizar o seu perfil.
        </p>
        <div className="flex justify-center gap-2 flex-wrap mt-6">
          <button type="button" className="gl-primary-btn" onClick={() => navigate("/novidades")}>
            Voltar para novidades
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 gl-fade-in" data-testid={`role-track-${roleKey}`}>
      <header className="gl-panel p-5 lg:p-7 overflow-hidden relative">
        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div>
            <span className="gl-eyebrow">Onboarding por cargo</span>
            <h1 className="text-3xl sm:text-4xl mt-1">{role.title}</h1>
            <p className="gl-text-muted text-sm mt-3 max-w-2xl">
              Tudo que este cargo precisa para entrar na rotina da GL Academy: função, metas, aulas,
              questionários, materiais e próxima ação.
            </p>
            <div className="flex gap-2 flex-wrap mt-5">
              <button className="gl-primary-btn" onClick={() => openModule(nextModule)} disabled={!nextModule}>
                Comecar proxima aula <ArrowRight size={14} />
              </button>
              {introModule && (
                <button className="gl-ghost-btn" onClick={() => openModule(introModule)}>
                  Ver alinhamento geral <PlayCircle size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="gl-panel-soft p-4">
            <span className="gl-eyebrow flex items-center gap-2">
              <Target size={14} /> Metas mensais
            </span>
            <strong className="block text-2xl mt-2" style={{ color: role.accent }}>
              {role.dailyGoal}
            </strong>
            <p className="gl-text-muted text-sm mt-2">{role.secondaryGoal}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {role.monthlyGoals.map((goal) => (
                <span key={goal} className="gl-tag">{goal}</span>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs gl-text-muted mb-1">
                <span>Progresso da trilha</span>
                <span className="gl-text-gold">{progress}%</span>
              </div>
              <div className="gl-progress">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <Metric icon={ClipboardList} label="Aulas do cargo" value={`${completed}/${roleModules.length}`} />
        <Metric icon={CheckCircle2} label="Perguntas resolvidas" value={`${resolvedQuestions}/${totalQuestions}`} />
        <Metric icon={TrendingUp} label="Meta mensal principal" value={role.dailyGoal} small />
      </section>

      <section className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="gl-panel p-5 lg:p-6">
          <span className="gl-eyebrow">Conteúdo da função</span>
          <h2 className="text-2xl mt-1">Aulas disponíveis para {role.shortTitle}</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4 gl-stagger">
            {roleModules.map((module) => {
              const locked = isModuleLocked(module);
              const done = isModuleComplete(module);
              return (
                <button
                  key={module.id}
                  type="button"
                  className={`gl-panel-soft p-4 text-left gl-card-hover ${locked ? "gl-locked-card" : ""}`}
                  onClick={() => openModule(module)}
                  data-testid={`role-module-${module.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="gl-tag gl-tag-gold">Aula {String(module.order).padStart(2, "0")}</span>
                    {done && <CheckCircle2 size={16} className="gl-text-green" />}
                    {locked && <Lock size={16} className="gl-text-gold" />}
                  </div>
                  <strong className="block text-base mt-3 leading-tight">{smartPt(module.title)}</strong>
                  <p className="gl-text-muted text-sm mt-2 line-clamp-3">{smartPt(module.objective)}</p>
                  {module.role_focus_time && (
                    <div className="gl-panel-soft px-2.5 py-2 mt-3 text-xs">
                      <strong className="gl-text-gold">{module.role_focus_time}</strong>
                      {" — "}{smartPt(module.role_focus_label)}
                    </div>
                  )}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] gl-text-soft mb-1">
                      <span>{module.progress?.resolved || 0}/{module.progress?.total_questions || 0} perguntas</span>
                      <span className="gl-text-gold">{module.progress?.percent || 0}%</span>
                    </div>
                    <div className="gl-progress">
                      <span style={{ width: `${module.progress?.percent || 0}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-end mt-3 gl-text-gold text-sm font-bold items-center gap-1">
                    {locked ? "Bloqueado" : done ? "Revisar" : "Abrir"} {!locked && <ArrowRight size={14} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="grid gap-4 content-start">
          <div className="gl-panel p-5">
            <span className="gl-eyebrow">Funcao no time</span>
            <h2 className="text-xl mt-1">Responsabilidades</h2>
            <div className="grid gap-2 mt-4">
              {role.responsibilities.map((item) => (
                <div key={item} className="gl-panel-soft p-3 text-sm gl-text-muted">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="gl-panel p-5">
            <span className="gl-eyebrow">Indicadores</span>
            <h2 className="text-xl mt-1">O que medir</h2>
            <div className="flex flex-wrap gap-2 mt-4">
              {role.metrics.map((metric) => (
                <span key={metric} className="gl-tag gl-tag-gold">
                  {metric}
                </span>
              ))}
            </div>
            <button className="gl-secondary-btn w-full mt-4" onClick={() => navigate("/relatorio")}>
              Preencher relatorio <ArrowRight size={14} />
            </button>
            {user?.name && (
              <p className="gl-text-soft text-xs mt-3">
                Esta área está vinculada ao perfil de {user.name}.
              </p>
            )}
          </div>
        </aside>
      </section>

      {roleMaterials.length > 0 && (
      <section className="gl-panel p-5 lg:p-6" data-testid={`role-materials-${roleKey}`}>
        <div>
          <span className="gl-eyebrow flex items-center gap-2">
            <Download size={14} /> Downloads da área
          </span>
          <h2 className="text-2xl mt-1">Materiais de apoio</h2>
          <p className="gl-text-muted text-sm mt-2">
            Os arquivos desta função ficam disponíveis aqui, junto das aulas.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {roleMaterials.map((material) => (
            <article key={material.id} className="gl-panel-soft p-4">
              <span className="gl-tag gl-tag-gold">{material.stage}</span>
              <strong className="block text-base mt-3">{material.title}</strong>
              <p className="gl-text-muted text-sm mt-2">{material.description}</p>
              <a href={material.href} download className="gl-secondary-btn w-full mt-4">
                Baixar material <Download size={14} />
              </a>
            </article>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, small = false }) {
  return (
    <div className="gl-panel p-4">
      <div className="flex items-center gap-2 gl-text-soft text-xs">
        <Icon size={14} /> {label}
      </div>
      <strong className={`block mt-2 ${small ? "text-lg" : "text-2xl"}`} style={{ color: "var(--gl-gold-2)" }}>
        {value}
      </strong>
    </div>
  );
}

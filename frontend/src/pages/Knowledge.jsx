import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Quiz from "@/components/Quiz";
import { smartPt } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, ArrowRight, Compass, Map, Activity, ShieldCheck, Lock, Download } from "lucide-react";

const LAYER_ICON = { Regime: Compass, Mapa: Map, Gatilho: Activity, Risco: ShieldCheck };
const RISK_PREMIUM_TAGS = ["prop_firm_risk", "risk_auto", "risk_presets", "drawdown", "mes_micro"];
const MATERIAL_PAGE_IDS = new Set(["materiais-aluno", "materiais-oficiais"]);
const ROLE_PLAYBOOK_IDS = new Set(["playbook-recrutador", "playbook-ativo", "playbook-tecnico"]);
const HIDDEN_KNOWLEDGE_IDS = new Set([...ROLE_PLAYBOOK_IDS, "banco-objecoes"]);

export default function Knowledge() {
  const [pages, setPages] = useState([]);
  const [drills, setDrills] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [tagLabels, setTagLabels] = useState({});
  const [report, setReport] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const requested = searchParams.get("page");
      if (MATERIAL_PAGE_IDS.has(requested)) {
        navigate("/materiais", { replace: true });
        return;
      }
      const [p, d, m, cfg, r] = await Promise.all([
        api.get("/content/knowledge"),
        api.get("/content/learning-drills"),
        api.get("/content/modules"),
        api.get("/content/app-config"),
        api.get("/user/report"),
      ]);
      const atlasPages = (p.data || []).filter(
        (page) => !MATERIAL_PAGE_IDS.has(page.id) && !HIDDEN_KNOWLEDGE_IDS.has(page.id)
      );
      setPages(atlasPages);
      setDrills(d.data);
      setModules(m.data);
      setTagLabels(cfg.data?.tag_labels || {});
      setReport(r.data);
      setActiveId(atlasPages.some((page) => page.id === requested) ? requested : atlasPages[0]?.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeId) {
      setSearchParams((sp) => {
        const np = new URLSearchParams(sp);
        np.set("page", activeId);
        return np;
      }, { replace: true });
    }
    setActiveQuestionId(null);
  }, [activeId, setSearchParams]);

  if (pages.length === 0) {
    return <div className="gl-text-muted text-sm">Carregando conhecimento...</div>;
  }

  const current = pages.find((p) => p.id === activeId) || pages[0];
  const linkedModule = modules.find((m) => m.id === current.moduleId);
  const canAccessRisk = user?.role === "admin" || (user?.entitlements || []).includes("gl_risk_auto");
  const isPremiumKnowledge =
    (current?.locked || (current?.tags || []).some((tag) => RISK_PREMIUM_TAGS.includes(tag))) && !canAccessRisk;
  const closingQuestions = (linkedModule?.questions || []).filter((q) => current.questions?.includes(q.id));
  const activeQuestion = closingQuestions.find((q) => q.id === activeQuestionId);

  // Core recommendations based on weak tags from report
  const weak = report?.metrics?.weak_tags || [];
  const recommendations =
    weak.length > 0
      ? weak.slice(0, 3).map((w) => {
          const page = pages.find((p) => p.tags?.includes(w.tag)) || pages[0];
          return {
            tag: w.tag,
            tag_label: smartPt(tagLabels[w.tag] || w.tag),
            accuracy: w.accuracy,
            page,
          };
        })
      : [
          { tag: "cultura", tag_label: smartPt(tagLabels.cultura || "Cultura GL"), accuracy: null, page: pages.find(p => p.id === "regras-cultura") || pages[0] },
          { tag: "produto", tag_label: smartPt(tagLabels.produto || "Produto"), accuracy: null, page: pages.find(p => p.id === "produtos") || pages[0] },
          { tag: "processo", tag_label: smartPt(tagLabels.processo || "Processo comercial"), accuracy: null, page: pages[1] || pages[0] },
        ];

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="knowledge-page">
      {/* Hero */}
      <section
        className="grid lg:grid-cols-[1.35fr_minmax(280px,0.65fr)] gap-5 p-5 lg:p-7 rounded-md"
        style={{
          border: "1px solid var(--gl-line)",
          background: "linear-gradient(135deg, rgba(32,32,24,0.96), rgba(17,19,17,0.96))",
        }}
        data-testid="knowledge-hero"
      >
        <div>
          <span className="gl-eyebrow">Conhecimento</span>
          <h1 className="text-3xl sm:text-4xl mt-1">Enciclopédia GL: produto, scripts e cultura.</h1>
          <p className="gl-text-muted text-sm mt-3 max-w-2xl">
            Aqui ficam as páginas curtas para consulta no dia a dia: dicionário do trader,
            produtos, argumentos, scripts e cultura comercial.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
          <Stat label="Páginas" value={pages.length} />
          <Stat label="Treinos rapidos" value={drills.length} />
          <Stat label="Focos sugeridos" value={recommendations.length} />
        </div>
      </section>

      {/* Recommendations */}
      <section className="gl-panel p-5" data-testid="knowledge-recommendations">
        <span className="gl-eyebrow">Core de aprendizado - recomendado para voce</span>
        <h2 className="text-2xl mt-1">O que estudar agora</h2>
        <div className="grid md:grid-cols-3 gap-3 mt-4 gl-stagger">
          {recommendations.map((rec) => (
            <div key={rec.tag} className="gl-panel-soft p-4 flex flex-col">
              <span className="gl-tag gl-tag-gold w-fit mb-2">{rec.tag_label}</span>
              <strong className="text-base">{smartPt(rec.page?.title)}</strong>
              <p className="gl-text-muted text-sm mt-1 line-clamp-3">{smartPt(rec.page?.promise)}</p>
              {typeof rec.accuracy === "number" && (
                <div className="text-xs gl-text-soft mt-2">Taxa atual nesta tag: {rec.accuracy}%</div>
              )}
              <button
                className="gl-secondary-btn mt-auto w-fit"
                onClick={() => setActiveId(rec.page.id)}
                data-testid={`reco-${rec.tag}`}
              >
                Estudar foco <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Atlas + page detail */}
      <section className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-5">
        <aside className="gl-panel p-3" data-testid="knowledge-nav">
          <span className="gl-eyebrow px-2">Paginas da enciclopedia</span>
          <div className="grid gap-1.5 mt-2">
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`gl-nav-btn ${activeId === p.id ? "active" : ""}`}
                data-testid={`knowledge-nav-${p.id}`}
              >
                <span className="text-sm leading-tight">{smartPt(p.title)}</span>
                {(p.locked || (p.tags || []).some((tag) => RISK_PREMIUM_TAGS.includes(tag))) && !canAccessRisk && (
                  <Lock size={13} className="gl-text-gold" />
                )}
              </button>
            ))}
          </div>
        </aside>

        <div className="grid gap-4">
          <div className="gl-panel p-5 lg:p-6" data-testid="knowledge-detail">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="gl-eyebrow">{current.source}</span>
                <h2 className="text-2xl mt-1">{smartPt(current.title)}</h2>
                <p className="gl-text-muted text-sm mt-1">{smartPt(current.subtitle)}</p>
              </div>
              {linkedModule && (
                <button
                  onClick={() => navigate(isPremiumKnowledge ? "/workshop-gl-risk-auto" : `/modulo/${linkedModule.id}`)}
                  className="gl-secondary-btn"
                  data-testid="open-linked-module"
                >
                  {isPremiumKnowledge ? <Lock size={14} /> : <BookOpen size={14} />} {isPremiumKnowledge ? "Ver workshop" : "Abrir módulo"}
                </button>
              )}
            </div>
            {isPremiumKnowledge && (
              <div className="gl-feedback warn mt-4" data-testid="knowledge-premium-lock">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={16} />
                  <strong>Conteudo premium GL Risk Auto</strong>
                </div>
                <span>
                  Esta pagina faz parte do treinamento de gerenciamento de risco para passar e sobreviver em mesa proprietaria.
                </span>
                <div className="mt-3">
                  <button type="button" className="gl-primary-btn" onClick={() => navigate("/workshop-gl-risk-auto")}>
                    Abrir GL Risk Auto Workshop <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
            <p className="text-sm mt-3 max-w-2xl">{smartPt(current.promise)}</p>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {(current.tags || []).map((t) => (
                <span key={t} className="gl-tag">
                  {smartPt(tagLabels[t] || t)}
                </span>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5 gl-stagger">
              {(current.cards || []).map((c, i) => (
                <div key={i} className="gl-panel-soft p-4">
                  <span className="gl-eyebrow">card · {i + 1}</span>
                  <strong className="block mt-1 text-base">{smartPt(c.title)}</strong>
                  <p className="gl-text-muted text-sm mt-1 leading-relaxed">{smartPt(c.body)}</p>
                  <div className="mt-2 text-xs gl-text-gold">→ {smartPt(c.cue)}</div>
                </div>
              ))}
            </div>

            {(current.materials?.length || 0) > 0 && (
              <div className="gl-panel-soft p-4 mt-4" data-testid="knowledge-materials">
                <span className="gl-eyebrow flex items-center gap-2">
                  <Download size={14} /> Anexos da equipe
                </span>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  {current.materials.map((item, i) => (
                    <a key={i} href={item.href} className="gl-secondary-btn justify-between" download>
                      <span className="text-left">
                        <strong className="block text-sm">{smartPt(item.title)}</strong>
                        <span className="block text-xs gl-text-muted">{smartPt(item.description)}</span>
                      </span>
                      <Download size={14} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4D Pulse Lab */}
          <div className="gl-panel p-5 lg:p-6" data-testid="four-d-lab">
            <span className="gl-eyebrow">Treino comercial - meta - script - objecao - relatorio</span>
            <h2 className="text-2xl mt-1">Os pulsos antes de qualquer abordagem</h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4 gl-stagger">
              {drills.map((d, i) => {
                const Icon = LAYER_ICON[d.title?.split(":")[1]?.trim()] || Compass;
                return (
                  <div key={i} className="gl-panel-soft p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="grid w-9 h-9 place-items-center rounded-md font-bold"
                        style={{ border: "1px solid rgba(240,207,122,0.55)", color: "var(--gl-gold-2)" }}
                      >
                        {i + 1}
                      </div>
                      <Icon size={16} className="gl-text-gold" />
                    </div>
                    <strong className="block text-base">{smartPt(d.title)}</strong>
                    <p className="gl-text-muted text-sm mt-1 leading-relaxed">{smartPt(d.body)}</p>
                    <div className="text-xs gl-text-green mt-2">{smartPt(d.prompt)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Closing questions */}
          {closingQuestions.length > 0 && (
            <div className="gl-panel p-5 lg:p-6" data-testid="closing-questions">
              <span className="gl-eyebrow">Perguntas de fechamento</span>
              <h2 className="text-2xl mt-1">Teste se aprendeu</h2>
              <p className="gl-text-muted text-sm mt-1">
                Alimentam o mesmo diagnostico por tags do seu relatorio.
              </p>
              <div className="flex gap-2 flex-wrap mt-4">
                {closingQuestions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionId(q.id === activeQuestionId ? null : q.id)}
                    className={`gl-tab-btn ${activeQuestionId === q.id ? "active" : ""}`}
                    data-testid={`closing-q-${q.id}`}
                  >
                    Pergunta {i + 1}
                  </button>
                ))}
              </div>
              {activeQuestion && (
                <div className="mt-4">
                  <Quiz
                    question={activeQuestion}
                    moduleId={linkedModule.id}
                    module={linkedModule}
                    scope="knowledge"
                    requireDecision={false}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="gl-panel p-4">
      <span className="gl-text-soft text-xs">{label}</span>
      <strong className="block mt-1 text-2xl gl-text-gold">{value}</strong>
    </div>
  );
}

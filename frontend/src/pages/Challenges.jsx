import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Quiz from "@/components/Quiz";
import { smartPt } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, ArrowRight, Lock, ShieldCheck } from "lucide-react";

const DIFFICULTY_COLOR = {
  beginner: "var(--gl-green)",
  intermediate: "var(--gl-gold-2)",
  advanced: "var(--gl-red)",
};
const DIFFICULTY_LABEL = {
  beginner: "iniciante",
  intermediate: "intermediario",
  advanced: "avancado",
};

export default function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [modules, setModules] = useState([]);
  const [active, setActive] = useState(null);
  const [difficulty, setDifficulty] = useState("all");
  const navigate = useNavigate();
  const canAccessPremium = user?.role === "admin" || (user?.entitlements || []).includes("gl_risk_auto");

  useEffect(() => {
    (async () => {
      const [c, m] = await Promise.all([
        api.get("/content/challenges"),
        api.get("/content/modules"),
      ]);
      setChallenges(c.data);
      setModules(m.data);
    })();
  }, []);

  const findQuestion = (questionId) => {
    for (const m of modules) {
      const q = (m.questions || []).find((q) => q.id === questionId);
      if (q) return { question: q, module: m };
    }
    return null;
  };

  const activeQ = active ? findQuestion(active.question_id) : null;
  const activeLocked = active?.required_entitlement && !canAccessPremium;
  const filteredChallenges = useMemo(
    () => challenges.filter((c) => difficulty === "all" || c.difficulty === difficulty),
    [challenges, difficulty]
  );
  const counts = useMemo(
    () =>
      challenges.reduce(
        (acc, item) => ({ ...acc, [item.difficulty]: (acc[item.difficulty] || 0) + 1, all: acc.all + 1 }),
        { all: 0, beginner: 0, intermediate: 0, advanced: 0 }
      ),
    [challenges]
  );

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="challenges-page">
      <header className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow flex items-center gap-2">
          <Zap size={14} /> Desafios periodicos
        </span>
        <h1 className="text-3xl sm:text-4xl mt-1">Treine decisao sob pressao</h1>
        <p className="gl-text-muted text-sm mt-2 max-w-2xl">
          Cenarios curtos por nivel para reforcar mapa, gatilho, risco, confluencia e revisao entre os modulos.
        </p>
        <div
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
          style={{ background: "rgba(216,180,92,0.1)", border: "1px solid rgba(216,180,92,0.3)", color: "var(--gl-gold-2)" }}
        >
          Notificacoes push 2-3x por semana via pagina Novidades
        </div>
      </header>

      <div className="flex gap-2 flex-wrap" data-testid="challenge-difficulty-tabs">
        {[
          ["all", "Todos"],
          ["beginner", "Iniciante"],
          ["intermediate", "Intermediario"],
          ["advanced", "Avancado"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`gl-tab-btn ${difficulty === id ? "active" : ""}`}
            onClick={() => setDifficulty(id)}
            data-testid={`challenge-filter-${id}`}
          >
            <Zap size={14} /> {label} <span className="gl-tag">{counts[id] || 0}</span>
          </button>
        ))}
      </div>

      <section className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 gl-stagger" data-testid="challenges-grid">
        {filteredChallenges.map((c, idx) => {
          const locked = c.required_entitlement && !canAccessPremium;
          return (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              className={`gl-panel gl-card-hover overflow-hidden text-left ${active?.id === c.id ? "gl-glow-gold" : ""}`}
              data-testid={`challenge-${c.id}`}
            >
              <div
                className="relative h-[140px]"
                style={{
                  background: `linear-gradient(180deg, rgba(15,15,13,0.1), rgba(15,15,13,0.86)), url('/assets/chart-${String((idx % 4) + 1).padStart(2, "0")}.jpeg') center/cover`,
                }}
              >
                <span
                  className="absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-bold"
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    border: `1px solid ${DIFFICULTY_COLOR[c.difficulty] || "var(--gl-gold)"}`,
                    color: DIFFICULTY_COLOR[c.difficulty] || "var(--gl-gold-2)",
                  }}
                >
                  {DIFFICULTY_LABEL[c.difficulty] || c.difficulty}
                </span>
                {locked && (
                  <span
                    className="absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-bold"
                    style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(216,180,92,0.34)", color: "var(--gl-gold-2)" }}
                  >
                    <Lock size={12} className="inline mr-1" /> premium
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg leading-tight">{smartPt(c.title)}</h3>
                <p className="gl-text-muted text-sm mt-2 line-clamp-3">{smartPt(c.context)}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(c.tags || []).map((t) => (
                    <span key={t} className="gl-tag">
                      {smartPt(t)}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-sm gl-text-gold font-bold">
                  {locked ? "Ver workshop" : "Resolver agora"} <ArrowRight size={14} />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {active && (
        <section className="grid gap-3" data-testid="challenge-active">
          <div className="gl-panel p-4">
            <span className="gl-eyebrow">Cenario ativo</span>
            <h2 className="text-2xl mt-1">{smartPt(active.title)}</h2>
            <p className="gl-text-muted text-sm mt-2">{smartPt(active.context)}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(active.tags || []).map((t) => (
                <span key={t} className="gl-tag gl-tag-gold">
                  {smartPt(t)}
                </span>
              ))}
            </div>
          </div>

          {activeLocked ? (
            <div className="gl-panel p-5">
              <span className="gl-eyebrow flex items-center gap-2"><ShieldCheck size={14} /> Conteudo premium</span>
              <h3 className="text-2xl mt-2">GL Risk Auto fica bloqueado ate liberar o acesso.</h3>
              <p className="gl-text-muted text-sm mt-2 max-w-2xl">
                Este desafio faz parte do gerenciamento de risco para passar e sobreviver em mesa proprietaria.
                Assista ao workshop para entender a proxima etapa.
              </p>
              <button className="gl-primary-btn mt-4" onClick={() => navigate("/workshop-gl-risk-auto")}>
                Abrir workshop <ArrowRight size={14} />
              </button>
            </div>
          ) : activeQ ? (
            <Quiz
              question={activeQ.question}
              moduleId={activeQ.module.id}
              scope="challenge"
              requireDecision={true}
            />
          ) : (
            <div className="gl-panel p-5 gl-text-muted text-sm">
              Pergunta deste desafio ainda nao esta disponivel.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

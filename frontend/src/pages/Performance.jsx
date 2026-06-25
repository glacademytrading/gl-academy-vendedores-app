import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { smartPt } from "@/lib/utils";
import { Award, BarChart3, Layers, Trophy, Sparkles } from "lucide-react";

export default function Performance() {
  const [perf, setPerf] = useState(null);

  useEffect(() => {
    (async () => {
      const p = await api.get("/user/performance");
      setPerf(p.data);
    })();
  }, []);

  if (!perf) {
    return <div className="gl-text-muted text-sm">Carregando desempenho…</div>;
  }

  const layerEntries = Object.entries(perf.layer_accuracy || {}).filter(([, v]) => v !== null);

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="performance-page">
      <header className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow flex items-center gap-2">
          <BarChart3 size={14} /> Desempenho
        </span>
        <h1 className="text-3xl sm:text-4xl mt-1">Pontos, nivel e diagnostico de treinamento</h1>
        <p className="gl-text-muted text-sm mt-2 max-w-2xl">
          Metricas calculadas a partir das respostas em aulas, conhecimento e desafios. O objetivo e mostrar quais temas comerciais ja estao fortes e quais precisam de revisao.
        </p>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 gl-stagger" data-testid="perf-cards">
        <Card icon={Sparkles} label="Pontos" value={perf.points} accent="gold" />
        <Card icon={Trophy} label="Nivel" value={`${perf.level} / 5`} accent="gold" />
        <Card icon={Layers} label="Taxa geral" value={`${perf.overall_accuracy}%`} accent={perf.overall_accuracy >= 70 ? "green" : "red"} />
        <Card icon={Award} label="Respondidas" value={perf.total_questions_attempted} accent="cyan" />
      </section>

      {/* Layers */}
      <section className="gl-panel p-5 lg:p-6" data-testid="layer-stats">
        <span className="gl-eyebrow">Taxa por camada comercial</span>
        <h2 className="text-2xl mt-1">Onde voce esta forte ou ainda precisa treinar</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 gl-stagger">
          {layerEntries.length === 0 && (
            <div className="gl-panel-soft p-4 col-span-full text-center text-sm gl-text-muted">
              Responda perguntas das aulas para liberar este diagnostico.
            </div>
          )}
          {layerEntries.map(([layer, acc]) => (
            <div key={layer} className="gl-panel-soft p-4">
              <div className="flex items-center justify-between">
                <strong className="text-base">{layer}</strong>
                <span
                  className="text-base font-bold"
                  style={{ color: acc >= 75 ? "var(--gl-green)" : acc <= 60 ? "var(--gl-red)" : "var(--gl-gold-2)" }}
                >
                  {acc}%
                </span>
              </div>
              <div className="gl-progress mt-3">
                <span
                  style={{
                    width: `${acc}%`,
                    background: acc >= 75 ? "var(--gl-green)" : acc <= 60 ? "var(--gl-red)" : "var(--gl-gold-2)",
                  }}
                />
              </div>
              <div className="text-xs gl-text-soft mt-2">
                {perf.layer_stats?.[layer]?.correct || 0} acertos em {perf.layer_stats?.[layer]?.total || 0} respostas
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      <section className="gl-panel p-5 lg:p-6" data-testid="badges-section">
        <span className="gl-eyebrow">Badges</span>
        <h2 className="text-2xl mt-1">Marcadores de evolucao comercial</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 gl-stagger">
          {(perf.badges || []).map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-md gl-panel-soft flex items-start gap-3 ${b.earned ? "" : "opacity-50"}`}
              style={
                b.earned
                  ? { borderColor: "rgba(53,208,143,0.5)", background: "rgba(53,208,143,0.1)" }
                  : undefined
              }
              data-testid={`badge-${b.id}`}
            >
              <div
                className="grid w-10 h-10 place-items-center rounded-md font-bold text-sm"
                style={{
                  border: `1px solid ${b.earned ? "rgba(53,208,143,0.5)" : "var(--gl-line)"}`,
                  color: b.earned ? "var(--gl-green)" : "var(--gl-gold-2)",
                }}
              >
                <Award size={16} />
              </div>
              <div>
                <strong className="block text-sm">{smartPt(b.name)}</strong>
                <p className="text-xs gl-text-muted mt-1 leading-relaxed">{smartPt(b.criteria)}</p>
                {b.earned && <span className="gl-tag gl-tag-green mt-2 inline-block">conquistado</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Card({ icon: Icon, label, value, accent }) {
  const color =
    accent === "green" ? "var(--gl-green)" : accent === "red" ? "var(--gl-red)" : accent === "cyan" ? "var(--gl-cyan)" : "var(--gl-gold-2)";
  return (
    <div className="gl-panel p-4">
      <div className="flex items-center gap-2 gl-text-soft text-xs">
        <Icon size={14} /> {label}
      </div>
      <strong className="block mt-2 text-2xl" style={{ color }}>
        {value}
      </strong>
    </div>
  );
}

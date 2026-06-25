import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { MARKET_REPORTS, SUPPORT_LINKS } from "@/lib/glAcademyContent";
import { Activity, AlertTriangle, BarChart3, CalendarDays, ExternalLink, Newspaper } from "lucide-react";

const toneClass = {
  neutro: "gl-tag-gold",
  cautela: "gl-tag-red",
  construtivo: "gl-tag-green",
};

export default function MarketReports() {
  const [reports, setReports] = useState(MARKET_REPORTS);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/content/market-reports");
        if (Array.isArray(data) && data.length) setReports(data);
      } catch {
        /* static fallback */
      }
    })();
  }, []);

  const latest = reports[0];

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="market-reports-page">
      <header className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow flex items-center gap-2">
          <Newspaper size={14} /> Briefing matinal GL
        </span>
        <div className="grid lg:grid-cols-[1fr_320px] gap-4 mt-1">
          <div>
            <h1 className="text-3xl sm:text-4xl">Resumo de mercado para abordagem comercial</h1>
            <p className="gl-text-muted text-sm mt-2 max-w-2xl">
              Noticias, calendario e contexto macro para abrir conversas com leads de trading. Use como gancho educacional, nunca como promessa de resultado.
            </p>
          </div>
          <div className="gl-panel-soft p-4">
            <span className="gl-eyebrow">Rotina</span>
            <div className="grid gap-2 mt-2 text-sm">
              <Routine icon={CalendarDays} label="Diario" value="antes das abordagens" />
              <Routine icon={Activity} label="Uso" value="script e objecoes" />
              <Routine icon={BarChart3} label="Equipe" value="vendas e suporte" />
            </div>
          </div>
        </div>
      </header>

      {latest && (
        <section className="gl-panel p-5 lg:p-6 gl-glow-gold" data-testid="market-latest">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className={`gl-tag ${toneClass[latest.tone] || "gl-tag-gold"}`}>{latest.tone || "mapa"}</span>
            <span className="text-xs gl-text-soft">
              {latest.created_at ? new Date(latest.created_at).toLocaleString("pt-BR") : latest.period}
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl mt-3">{latest.title}</h2>
          <div className="grid md:grid-cols-[1fr_260px] gap-4 mt-4">
            <ul className="grid gap-2">
              {(latest.bullets || []).map((item, index) => (
                <li key={index} className="gl-panel-soft p-3 text-sm gl-text-muted">
                  {item}
                </li>
              ))}
            </ul>
            <div className="gl-panel-soft p-4">
              <span className="gl-eyebrow">Watchlist</span>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(latest.watchlist || []).map((asset) => (
                  <span key={asset} className="gl-tag gl-tag-gold">{asset}</span>
                ))}
              </div>
              <a href={SUPPORT_LINKS.discord} target="_blank" rel="noreferrer" className="gl-secondary-btn mt-4 w-full">
                Abrir Discord <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-4 gl-stagger">
        {reports.slice(1).map((report) => (
          <article key={report.id} className="gl-panel p-4" data-testid={`market-report-${report.id}`}>
            <div className="flex items-center justify-between gap-3">
              <span className={`gl-tag ${toneClass[report.tone] || "gl-tag-gold"}`}>{report.period}</span>
              <span className="text-xs gl-text-soft">{report.tone}</span>
            </div>
            <h3 className="text-xl mt-3">{report.title}</h3>
            <ul className="grid gap-2 mt-3">
              {(report.bullets || []).map((item, index) => (
                <li key={index} className="text-sm gl-text-muted">{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="gl-feedback warn">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} />
          <strong>Aviso educacional</strong>
        </div>
        <span className="block mt-1">
          O briefing serve para contexto comercial e educacional. Nao e sinal, call, recomendacao individual ou promessa de resultado.
        </span>
      </section>
    </div>
  );
}

function Routine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="gl-text-soft flex items-center gap-2"><Icon size={14} /> {label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

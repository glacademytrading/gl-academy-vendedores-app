import React, { useMemo, useState } from "react";
import { SUPPORT_LINKS, WORKSHOP_OFFERS } from "@/lib/glAcademyContent";
import { CheckCircle2, ExternalLink, Lock, PlayCircle, ShieldCheck, Target, Video } from "lucide-react";

function embedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  if (/\.(mp4|webm|m4v|mov)(\?.*)?$/i.test(url)) return null;
  return /^https?:\/\//.test(url) ? url : null;
}

function videoUrl(url) {
  if (!url || !/\.(mp4|webm|m4v|mov)(\?.*)?$/i.test(url)) return null;
  return /^(https?:)?\/\//.test(url) || url.startsWith("/") ? url : `/${url.replace(/^\.\//, "")}`;
}

export default function RiskWorkshop() {
  const [watched, setWatched] = useState(false);
  const src = useMemo(() => embedUrl(SUPPORT_LINKS.riskWorkshopVideoUrl), []);
  const directVideo = useMemo(() => videoUrl(SUPPORT_LINKS.riskWorkshopVideoUrl), []);

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="risk-workshop-page">
      <header className="gl-panel p-5 lg:p-6 gl-glow-gold">
        <span className="gl-eyebrow flex items-center gap-2">
          <ShieldCheck size={14} /> GL Risk Auto Workshop
        </span>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 mt-1">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              GL Risk Auto Workshop - Gerenciamento de risco para passar e sobreviver em mesa proprietaria
            </h1>
            <p className="gl-text-muted text-sm mt-2 max-w-2xl">
              Aula curta para entender por que o modulo GL Risk Auto e uma disciplina premium separada.
            </p>
          </div>
          <div className="gl-panel-soft p-4">
            <span className="gl-eyebrow">Modulo bloqueado</span>
            <div className="flex items-center gap-2 mt-2 gl-text-muted text-sm">
              <Lock size={16} className="gl-text-gold" />
              Acesso liberado por compra, pacote, mentoria ou permissao manual do mentor.
            </div>
          </div>
        </div>
      </header>

      <section className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="gl-panel overflow-hidden" data-testid="risk-workshop-video">
          <div className="relative aspect-video bg-black">
            {directVideo ? (
              <video
                src={directVideo}
                title="GL Risk Auto Workshop"
                controls
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full"
              />
            ) : src ? (
              <iframe
                src={src}
                title="GL Risk Auto Workshop"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center text-center p-6"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(15,15,13,0.25), rgba(15,15,13,0.92)), url('/assets/chart-04.jpeg') center/cover",
                }}
              >
                <div>
                  <Video size={42} className="mx-auto gl-text-gold" />
                  <h2 className="text-2xl mt-3">Video do workshop pendente</h2>
                  <p className="gl-text-muted text-sm mt-2 max-w-lg">
                    Configure `RISK_WORKSHOP_VIDEO_URL` no runtime-config para trocar este placeholder pelo video do Giovane.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="grid gap-3 content-start">
          <div className="gl-panel-soft p-4">
            <span className="gl-eyebrow">Decisao do aluno</span>
            <h2 className="text-xl mt-1">Antes de comprar, entenda o risco</h2>
            <p className="gl-text-muted text-sm mt-2">
              O foco e disciplina, folga operacional, drawdown, escolha de tamanho e pausa. Nao e promessa de aprovacao.
            </p>
            <button type="button" className="gl-primary-btn w-full mt-4" onClick={() => setWatched(true)} data-testid="mark-workshop-watched">
              <PlayCircle size={14} /> Assisti ao workshop
            </button>
          </div>

          <div className="gl-panel-soft p-4">
            <span className="gl-eyebrow">O que o GL Risk Auto resolve</span>
            <div className="grid gap-2 mt-3 text-sm gl-text-muted">
              <Point text="Saber quando reduzir risco depois de stop." />
              <Point text="Evitar aumentar mao por ansiedade perto da meta." />
              <Point text="Escolher ES, MES, pausa ou simulador com criterio." />
              <Point text="Transformar risco em rotina antes da avaliacao." />
            </div>
          </div>
        </aside>
      </section>

      <section className={`grid gap-4 ${watched ? "" : "opacity-60"}`} data-testid="risk-workshop-offers">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="gl-eyebrow">Proximos passos</span>
            <h2 className="text-2xl mt-1">Escolha o pacote de risco</h2>
          </div>
          {!watched && <span className="gl-tag">aparece apos o workshop</span>}
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {WORKSHOP_OFFERS.map((offer) => (
            <article key={offer.id} className="gl-panel p-4">
              <Target size={18} className="gl-text-gold" />
              <h3 className="text-lg mt-2 leading-tight">{offer.title}</h3>
              <p className="gl-text-muted text-sm mt-2">{offer.description}</p>
              <a
                href={offer.url}
                target="_blank"
                rel="noreferrer"
                className="gl-secondary-btn w-full mt-4"
                aria-disabled={!watched}
                onClick={(event) => {
                  if (!watched) event.preventDefault();
                }}
              >
                {offer.cta} <ExternalLink size={14} />
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Point({ text }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 size={15} className="gl-text-green mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

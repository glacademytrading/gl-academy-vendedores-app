import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Quiz from "@/components/Quiz";
import { smartPt } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { isModuleForUser, ROLE_TRACKS } from "@/lib/glAcademyContent";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  PlayCircle,
  AlertTriangle,
  Compass,
  CheckCheck,
  BookOpen,
  Activity,
  ListChecks,
  MessageSquareText,
  Download,
  FileText,
  Lock,
} from "lucide-react";

const PREMIUM_MODULE_ID = "m20_risk_auto_prop";

function moduleHasQuestions(module) {
  return (module?.questions?.length || 0) > 0;
}

function isModuleLocked(module) {
  return !!(module?.release_locked || module?.progress_locked || module?.sequence_locked || module?.premium_preview || module?.locked);
}

function isModuleComplete(module) {
  if (!module?.progress?.lesson_done) return false;
  if (!moduleHasQuestions(module)) return true;
  return (module?.progress?.percent || 0) >= 100;
}

export default function ModulePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [modules, setModules] = useState([]);
  const [tab, setTab] = useState("aprender");
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [reload, setReload] = useState(0);
  const [videoComplete, setVideoComplete] = useState(false);
  const handleVideoCompleted = React.useCallback(() => setVideoComplete(true), []);
  const previewParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const previewQuizRequested = previewParams.get("quiz") === "preview" || previewParams.get("questionario") === "1";
  const canPreviewQuiz =
    previewParams.has("preview") && (user?.role === "admin" || user?.onboarding?.role === "gestao");

  useEffect(() => {
    setTab(previewQuizRequested && canPreviewQuiz ? "teste" : "aprender");
    setActiveQuestionId(null);
    setVideoComplete(false);
  }, [id, previewQuizRequested, canPreviewQuiz]);

  useEffect(() => {
    (async () => {
      try {
        const [{ data }, listResult] = await Promise.all([
          api.get(`/content/modules/${id}`),
          api.get("/content/modules").catch(() => ({ data: [] })),
        ]);
        const canAccessPremium = user?.role === "admin" || (user?.entitlements || []).includes("gl_risk_auto");
        if (!isModuleForUser(data, user)) {
          toast.info("Esta aula pertence à trilha de outra função.");
          navigate("/trilha");
          return;
        }
        if (data.release_locked) {
          toast.info("Esta aula esta em gravacao e sera liberada quando o video oficial entrar na plataforma.");
          navigate("/trilha");
          return;
        }
        if ((data.premium_preview || data.locked || data.id === PREMIUM_MODULE_ID) && !canAccessPremium) {
          toast.info("Esta aula exige permissao especifica.");
          navigate("/trilha");
          return;
        }
        setModule(data);
        setVideoComplete(!!data.progress?.lesson_done);
        setModules(
          Array.isArray(listResult.data)
            ? listResult.data.filter((item) => isModuleForUser(item, user))
            : []
        );
        setActiveQuestionId(data.questions?.[0]?.id || null);
      } catch (e) {
        toast.error("Módulo não encontrado");
        navigate("/trilha");
      }
    })();
  }, [id, navigate, reload, user]);

  const markLessonDone = async () => {
    if (module?.lesson?.require_full_video && !videoComplete && !module?.progress?.lesson_done) {
      toast.warning("Assista ao vídeo completo antes de abrir o questionário.");
      return;
    }
    try {
      await api.post(`/content/modules/${id}/lesson-done`);
      toast.success("Aula marcada como concluida.");
      setReload((r) => r + 1);
      if (moduleHasQuestions(module)) {
        setTab("teste");
      } else if (nextModule) {
        navigate(`/modulo/${nextModule.id}`);
      }
    } catch (e) {
      toast.error("Não foi possível salvar");
    }
  };

  if (!module) {
    return (
      <div className="gl-text-muted text-sm" data-testid="module-loading">
        Carregando módulo…
      </div>
    );
  }

  const lessonPage = module.lesson_page || {};
  const hasQuestions = moduleHasQuestions(module);
  const activeQuestion = module.questions?.find((q) => q.id === activeQuestionId);
  const sequenceGroup = module.sequence_group || module.track || "";
  const orderedModules = [...modules]
    .filter((m) => (sequenceGroup ? (m.sequence_group || m.track || "") === sequenceGroup : true))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const moduleIndex = orderedModules.findIndex((m) => m.id === module.id);
  const previousModule = moduleIndex > 0 ? orderedModules[moduleIndex - 1] : null;
  const nextModule = moduleIndex >= 0 ? orderedModules[moduleIndex + 1] : null;
  const backRoute =
    Object.values(ROLE_TRACKS).find((role) => role.track === module.track)?.route || "/novidades";

  return (
    <div className="grid gap-5 gl-fade-in" data-testid={`module-page-${module.id}`}>
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate(backRoute)}
          className="gl-ghost-btn !min-h-[36px] !px-3"
          data-testid="back-to-trail"
        >
          <ArrowLeft size={14} /> Voltar para a área
        </button>
        {module.stage && <span className="gl-tag gl-tag-gold">{module.stage}</span>}
        {(module.tags || []).slice(0, 3).map((t) => (
          <span key={t} className="gl-tag">
            {t}
          </span>
        ))}
      </div>

      {/* Header */}
      <header className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow">Aula {String(module.order).padStart(2, "0")} - {module.role_label || module.stage || "GL Academy"}</span>
        <h1 className="text-3xl sm:text-4xl mt-1">{smartPt(module.title)}</h1>
        <p className="gl-text-muted text-[15px] mt-2 max-w-3xl">{smartPt(module.objective)}</p>
        {module.role_focus_time && (
          <button
            type="button"
            className="gl-panel-soft px-3 py-2 mt-4 inline-flex items-center gap-2 text-left gl-card-hover"
            onClick={() => window.dispatchEvent(new CustomEvent("gl-video-seek", { detail: module.role_focus_seconds || 0 }))}
            data-testid="role-focus-time"
          >
            <PlayCircle size={15} className="gl-text-gold" />
            <span className="text-sm">
              <strong className="gl-text-gold">{module.role_focus_time}</strong>
              {" — "}{smartPt(module.role_focus_label || "Início do conteúdo da sua função")}
            </span>
          </button>
        )}
        {!(module.lesson?.chapters?.length > 0) && <p className="text-sm mt-3 max-w-3xl">{smartPt(module.summary)}</p>}
      </header>

      <ModuleFlow
        module={module}
        tab={tab}
        setTab={setTab}
        canTakeQuiz={!!module.progress?.lesson_done || canPreviewQuiz}
      />

      {/* Tabs */}
      {hasQuestions && (
        <div className="flex gap-2 flex-wrap" data-testid="module-tabs">
          <button
            className={`gl-tab-btn ${tab === "aprender" ? "active" : ""}`}
            onClick={() => setTab("aprender")}
            data-testid="tab-aprender"
          >
            <BookOpen size={14} /> Aprender
          </button>
          <button
            className={`gl-tab-btn ${tab === "teste" ? "active" : ""}`}
            onClick={() => {
              if (!module.progress?.lesson_done && !canPreviewQuiz) {
                toast.info("Assista ao vídeo completo e conclua a aula antes de fazer o questionário.");
                return;
              }
              setTab("teste");
            }}
            disabled={!module.progress?.lesson_done && !canPreviewQuiz}
            data-testid="tab-teste"
          >
            {!module.progress?.lesson_done && <Lock size={13} />} <Activity size={14} /> Questionário
          </button>
        </div>
      )}

      {tab === "aprender" ? (
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-5" data-testid="learn-section">
          {/* Media + lesson */}
          <div className="grid gap-4">
            <VideoPlayer module={module} onCompleted={handleVideoCompleted} />
            <LessonPage page={lessonPage} module={module} />
          </div>

          {/* Right column: roadmap + mission */}
          <div className="grid gap-4 content-start">
            <VideoRoadmap module={module} />
            {module.progress_locked && <ProgressRequirements module={module} />}
            <button
              className="gl-primary-btn w-full"
              onClick={module.progress_locked || (module.lesson?.require_full_video && !videoComplete && !module.progress?.lesson_done) ? undefined : markLessonDone}
              disabled={module.progress_locked || (module.lesson?.require_full_video && !videoComplete && !module.progress?.lesson_done)}
              data-testid="mark-lesson-done"
            >
              {module.lesson?.require_full_video && !videoComplete && !module.progress?.lesson_done ? (
                <><Lock size={14} /> Assista ao vídeo completo para liberar</>
              ) : (
                <><CheckCheck size={14} /> {hasQuestions ? "Vídeo concluído — fazer questionário" : "Concluir aula e avançar"}</>
              )}
            </button>
            <ModuleNavigation currentModule={module} previousModule={previousModule} nextModule={nextModule} navigate={navigate} />
          </div>
        </div>
      ) : (
        <div className="grid gap-5" data-testid="quiz-section">
          {/* Question switcher */}
          {module.questions?.length > 1 && (
            <div className="gl-panel p-3 flex gap-2 flex-wrap" data-testid="question-switcher">
              {module.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`gl-tab-btn ${activeQuestionId === q.id ? "active" : ""}`}
                  data-testid={`question-tab-${q.id}`}
                >
                  Q{i + 1}
                </button>
              ))}
            </div>
          )}
          {activeQuestion ? (
            <Quiz
              question={activeQuestion}
              moduleId={module.id}
              module={module}
              scope="module"
              requireDecision={module.require_decision !== false}
              onResolved={() => setReload((r) => r + 1)}
            />
          ) : (
            <div className="gl-panel p-6 text-center gl-text-muted">
              Este módulo ainda não tem perguntas configuradas.
            </div>
          )}
          <ModuleNavigation currentModule={module} previousModule={previousModule} nextModule={nextModule} navigate={navigate} />
        </div>
      )}
    </div>
  );
}

function ModuleNavigation({ currentModule, previousModule, nextModule, navigate }) {
  if (!previousModule && !nextModule) return null;
  const nextReleaseLocked = !!nextModule?.release_locked;
  const nextSequenceLocked = !!nextModule?.sequence_locked;
  const nextProgressLocked = !!nextModule?.progress_locked;
  const nextPremiumLocked = !!nextModule?.premium_preview || !!nextModule?.locked || nextModule?.id === PREMIUM_MODULE_ID;
  const currentComplete = isModuleComplete(currentModule);
  const nextBlockedByCurrent = !!nextModule && !currentComplete && !isModuleLocked(currentModule);
  const nextLocked = nextReleaseLocked || nextSequenceLocked || nextProgressLocked || nextPremiumLocked || nextBlockedByCurrent;
  const nextLabel = nextReleaseLocked
    ? "Proxima aula em gravacao"
    : nextBlockedByCurrent
      ? (moduleHasQuestions(currentModule) ? "Conclua o teste para liberar" : "Conclua esta aula para liberar")
      : nextSequenceLocked
        ? "Conclua a aula anterior para liberar"
      : nextProgressLocked
      ? "Proxima aula bloqueada por evolucao"
      : nextPremiumLocked
        ? "Proxima aula premium"
        : `Proxima aula: ${smartPt(nextModule?.title)}`;
  return (
    <div className="gl-panel-soft p-3 flex flex-col sm:flex-row gap-2 sm:items-stretch sm:justify-between" data-testid="module-navigation">
      {previousModule ? (
        <button
          type="button"
          className="gl-ghost-btn justify-center sm:justify-start"
          onClick={() => navigate(`/modulo/${previousModule.id}`)}
          data-testid="previous-module"
        >
          <ArrowLeft size={14} /> Aula anterior
        </button>
      ) : (
        <span />
      )}
      {nextModule ? (
        <button
          type="button"
          className="gl-ghost-btn justify-center sm:justify-end"
          onClick={() => !nextLocked && navigate(`/modulo/${nextModule.id}`)}
          disabled={nextLocked}
          data-testid="next-module"
        >
          {nextLocked && <Lock size={14} />} {nextLabel} {!nextLocked && <ArrowRight size={14} />}
        </button>
      ) : (
        <button
          type="button"
          className="gl-primary-btn justify-center sm:justify-end"
          onClick={() => navigate("/trilha")}
          data-testid="finish-trail"
        >
          Voltar para trilha <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function ModuleFlow({ module, tab, setTab, canTakeQuiz }) {
  const questionCount = module.questions?.length || 0;
  const flowCopy = getModuleFlowCopy(module);
  const steps = questionCount === 0
    ? [
        {
          title: "Aprender",
          detail: "Assista a aula e leia a pagina de apoio antes de avancar.",
          icon: BookOpen,
          target: "aprender",
        },
        {
          title: "Concluir",
          detail: "Marque como estudado para liberar a proxima etapa.",
          icon: CheckCheck,
          target: "aprender",
        },
      ]
    : [
        {
          title: "Aprender",
          detail: "Vídeo, página de apoio e revisão antes do questionário.",
          icon: BookOpen,
          target: "aprender",
        },
        {
          title: flowCopy.title,
          detail: flowCopy.detail,
          icon: MessageSquareText,
          target: "teste",
        },
        {
          title: "Testar leitura",
          detail: `${questionCount} pergunta(s), multipla escolha e diagnostico parcial.`,
          icon: ListChecks,
          target: "teste",
        },
      ];

  return (
    <section className="gl-module-flow" data-testid="module-flow">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const active = step.target === tab;
        return (
          <button
            key={step.title}
            type="button"
            className={`gl-flow-step ${active ? "active" : ""}`}
            onClick={() => {
              if (step.target === "teste" && !canTakeQuiz) {
                toast.info("O questionário será liberado depois que o vídeo terminar.");
                return;
              }
              setTab(step.target);
            }}
            disabled={step.target === "teste" && !canTakeQuiz}
            data-testid={`module-flow-step-${index + 1}`}
          >
            <span className="gl-flow-index">{index + 1}</span>
            <span className="gl-flow-copy">
              <strong><Icon size={14} /> {step.title}</strong>
              <span>{step.detail}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function getModuleFlowCopy(module) {
  const order = Number(module?.order || 0);
  if (order <= 5) {
    return { title: "Organizar a aula", detail: "Ideia central, conduta correta e cuidado principal antes do quiz." };
  }
  if (module?.track === "recrutador") {
    return { title: "Simular triagem", detail: "Fonte, pitch, filtro, score e encaminhamento para a gestao." };
  }
  if (module?.track === "ativo") {
    return { title: "Montar abordagem", detail: "Lista, mensagem, diagnostico, status e proximo follow-up." };
  }
  if (module?.track === "tecnico") {
    return { title: "Preparar fechamento", detail: "Dor, produto, objecao, prova, checkout e pos-venda." };
  }
  if (module?.track === "gestao") {
    return { title: "Ler numeros", detail: "Meta, atividade, resultado, gargalo e proxima acao." };
  }
  return { title: "Montar a decisao", detail: "Alvo, abordagem, objecao, proxima acao e numero a reportar." };
}

let youtubeApiPromise;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") previousReady();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

function YouTubeTrackedPlayer({ videoId, module, onCompleted }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const watchedRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const storageKey = `gl-video-watch:${module.id}:${videoId}`;

  useEffect(() => {
    try {
      watchedRef.current = Number(localStorage.getItem(storageKey) || 0);
    } catch {
      watchedRef.current = 0;
    }
    let disposed = false;
    loadYouTubeApi().then((YT) => {
      if (disposed || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              lastTimeRef.current = Number(event.target.getCurrentTime() || 0);
              clearInterval(intervalRef.current);
              intervalRef.current = window.setInterval(() => {
                const current = Number(event.target.getCurrentTime() || 0);
                const duration = Number(event.target.getDuration() || 0);
                const delta = current - lastTimeRef.current;
                if (delta > 0 && delta <= 3.5) watchedRef.current += delta;
                lastTimeRef.current = current;
                if (duration > 0) setProgress(Math.min(100, Math.round((watchedRef.current / duration) * 100)));
                try {
                  localStorage.setItem(storageKey, String(watchedRef.current));
                } catch {
                  /* noop */
                }
              }, 1000);
            } else {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (event.data === YT.PlayerState.ENDED) {
              const duration = Number(event.target.getDuration() || 0);
              const watchedEnough = duration > 0 && watchedRef.current >= duration * 0.95;
              if (watchedEnough) {
                setProgress(100);
                onCompleted?.();
              } else {
                toast.info("O vídeo chegou ao fim, mas ainda há trechos não assistidos. Continue a aula para liberar o questionário.");
              }
            }
          },
        },
      });
    });
    const seek = (event) => {
      playerRef.current?.seekTo?.(Number(event.detail || 0), true);
      playerRef.current?.playVideo?.();
    };
    window.addEventListener("gl-video-seek", seek);
    return () => {
      disposed = true;
      clearInterval(intervalRef.current);
      window.removeEventListener("gl-video-seek", seek);
      playerRef.current?.destroy?.();
    };
  }, [module.id, onCompleted, storageKey, videoId]);

  return (
    <div className="gl-panel overflow-hidden" data-testid="video-player">
      <div className="relative aspect-video bg-black">
        <div ref={hostRef} className="absolute inset-0 w-full h-full" title="Vídeo do módulo" />
      </div>
      {module.lesson?.require_full_video && !module.progress?.lesson_done && (
        <div className="p-3 border-t" style={{ borderColor: "var(--gl-border)" }}>
          <div className="flex justify-between text-xs gl-text-muted mb-1">
            <span>Progresso assistido</span>
            <span className="gl-text-gold">{progress}%</span>
          </div>
          <div className="gl-progress"><span style={{ width: `${progress}%` }} /></div>
          <p className="gl-text-soft text-xs mt-2">O questionário abre quando a aula chegar ao fim sem pular os trechos.</p>
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ module, onCompleted }) {
  const url = String(module.lesson?.video_url || "").trim();
  let embedSrc = null;
  let videoSrc = null;
  if (url) {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    if (yt && module.lesson?.require_full_video) {
      return <YouTubeTrackedPlayer videoId={yt[1]} module={module} onCompleted={onCompleted} />;
    }
    if (yt) embedSrc = `https://www.youtube.com/embed/${yt[1]}`;
    const v = url.match(/vimeo\.com\/(\d+)/);
    if (v) embedSrc = `https://player.vimeo.com/video/${v[1]}`;
    const directVideo = /\.(mp4|webm|m4v|mov)(\?.*)?$/i.test(url);
    if (!embedSrc && directVideo) {
      videoSrc = /^(https?:)?\/\//.test(url) || url.startsWith("/") ? url : `/${url.replace(/^\.\//, "")}`;
    }
    if (!embedSrc && !videoSrc && /^https?:\/\//.test(url)) embedSrc = url;
  }

  if (videoSrc) {
    return (
      <div className="gl-panel overflow-hidden" data-testid="video-player">
        <div className="relative aspect-video bg-black">
          <video
            src={videoSrc}
            title="Video do modulo"
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full"
            onEnded={onCompleted}
          />
        </div>
      </div>
    );
  }

  if (embedSrc) {
    return (
      <div className="gl-panel overflow-hidden" data-testid="video-player">
        <div className="relative aspect-video bg-black">
          <iframe
            src={embedSrc}
            title="Vídeo do módulo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    );
  }

  // Placeholder with chart background
  const idx = ((module.order - 1) % 4) + 1;
  return (
    <div
      className="gl-panel relative overflow-hidden min-h-[260px] lg:min-h-[360px]"
      style={{
        background: `linear-gradient(180deg, rgba(15,15,13,0.1), rgba(15,15,13,0.92)), url('/assets/chart-${String(idx).padStart(2, "0")}.jpeg') center/cover`,
      }}
      data-testid="video-placeholder"
    >
      <div className="absolute bottom-5 left-5 right-5">
        <span className="gl-eyebrow">Video da aula</span>
        <h3 className="text-xl lg:text-2xl mt-1">{smartPt(lessonPageHeadline(module))}</h3>
        <p className="gl-text-muted text-sm mt-2 max-w-xl">
          {smartPt(module.lesson?.text) || "Video pendente. Use a pagina de apoio e o roteiro da aula para estudar."}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs gl-text-soft">
          <PlayCircle size={14} /> Video configuravel via Admin (YouTube, Vimeo ou MP4)
        </div>
      </div>
    </div>
  );
}

function lessonPageHeadline(module) {
  return module.lesson_page?.headline || module.title;
}

function LessonPage({ page, module }) {
  if (!page?.sections) {
    return (
      <div className="gl-panel p-5">
        <p className="gl-text-muted text-sm">{smartPt(module.lesson?.text)}</p>
      </div>
    );
  }
  return (
    <div className="gl-panel p-5 lg:p-6" data-testid="lesson-page">
      <span className="gl-eyebrow">{module.lesson?.chapters?.length ? "Resumo da aula" : "Página de aprendizado"}</span>
      <h2 className="text-2xl mt-1">{module.lesson?.chapters?.length ? "O que você precisa aprender" : smartPt(page.headline)}</h2>
      <div className="grid gap-3 mt-4">
        {page.sections.map((s, i) => (
          <div key={i} className="gl-panel-soft p-4">
            <strong className="block text-base mb-1">{smartPt(s.title)}</strong>
            <p className="gl-text-muted text-sm leading-relaxed">{smartPt(s.body)}</p>
            {s.bullets?.length > 0 && (
              <ul className="mt-2 pl-5 gl-text-muted text-sm leading-relaxed list-disc">
                {s.bullets.map((b, idx) => (
                  <li key={idx}>{smartPt(b)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {(page.checklist?.length || 0) > 0 && (
        <div className="gl-panel-soft p-4 mt-3">
          <span className="gl-eyebrow gl-text-green flex items-center gap-2">
            <CheckCheck size={14} /> Checklist
          </span>
          <ul className="mt-2 pl-5 list-disc gl-text-muted text-sm leading-relaxed">
            {page.checklist.map((c, i) => (
              <li key={i}>{smartPt(c)}</li>
            ))}
          </ul>
        </div>
      )}
      {(page.mistakes?.length || 0) > 0 && (
        <div className="gl-panel-soft p-4 mt-3" style={{ borderColor: "rgba(255,106,95,0.3)" }}>
          <span className="gl-eyebrow gl-text-red flex items-center gap-2">
            <AlertTriangle size={14} /> Erros que derrubam a venda
          </span>
          <ul className="mt-2 pl-5 list-disc gl-text-muted text-sm leading-relaxed">
            {page.mistakes.map((c, i) => (
              <li key={i}>{smartPt(c)}</li>
            ))}
          </ul>
        </div>
      )}
      {(page.materials?.length || 0) > 0 && (
        <div className="gl-panel-soft p-4 mt-3" data-testid="lesson-materials">
          <span className="gl-eyebrow flex items-center gap-2">
            <FileText size={14} /> Materiais para baixar
          </span>
          <div className="grid gap-2 mt-3">
            {page.materials.map((item, i) => (
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
  );
}

function VideoRoadmap({ module }) {
  const chapters = module.lesson?.chapters || [];
  if (chapters.length > 0) {
    return (
      <div className="gl-panel-soft p-4" data-testid="video-roadmap">
        <span className="gl-eyebrow flex items-center gap-2">
          <Compass size={14} /> Minutagem da aula
        </span>
        <p className="gl-text-muted text-sm mt-1">Use os títulos para localizar um assunto durante a revisão.</p>
        <div className="grid gap-2 mt-4">
          {chapters.map((chapter) => (
            <button
              key={`${chapter.time}-${chapter.title}`}
              type="button"
              className="gl-panel-soft p-3 text-left flex gap-3 items-start gl-card-hover"
              onClick={() => window.dispatchEvent(new CustomEvent("gl-video-seek", { detail: chapter.seconds }))}
            >
              <strong className="gl-text-gold text-sm shrink-0">{chapter.time}</strong>
              <span className="text-sm">{smartPt(chapter.title)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  const questions = module.questions || [];
  if (questions.length === 0) return null;
  return (
    <div className="gl-panel-soft p-4" data-testid="video-roadmap">
      <span className="gl-eyebrow flex items-center gap-2">
        <Compass size={14} /> Pontos de revisão da aula
      </span>
      <p className="gl-text-muted text-sm mt-1">
        Assista a aula inteira com calma. Depois use estes pontos para revisar o raciocínio antes do teste prático.
      </p>
      <div className="grid md:grid-cols-2 gap-2 mt-4">
        {questions.map((q, i) => (
          <div key={q.id} className="gl-panel-soft p-3 flex gap-3" data-testid={`roadmap-topic-${q.id}`}>
            <div
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold"
              style={{ borderColor: "rgba(216,180,92,0.55)", color: "var(--gl-gold)" }}
            >
              {i + 1}
            </div>
            <div>
              <strong className="text-sm block">Revisão {i + 1}</strong>
              <p className="gl-text-muted text-xs leading-relaxed mt-1">{smartPt(q.prompt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRequirements({ module }) {
  const status = module.unlock_status || {};
  if (module.sequence_locked) {
    return (
      <div className="gl-panel-soft p-4" data-testid="sequence-requirements">
        <span className="gl-eyebrow flex items-center gap-2">
          <Lock size={14} /> Libera pela sequencia
        </span>
        <h3 className="text-lg mt-1">Conclua a aula anterior primeiro</h3>
        <p className="gl-text-muted text-sm mt-2">
          Esta trilha foi organizada para evitar saltos. Termine a aula {status.required_module_order || ""}{" "}
          {status.required_module_title ? `- ${smartPt(status.required_module_title)}` : ""} antes de avancar.
        </p>
      </div>
    );
  }
  const requiredModules = status.required_modules || module.unlock_requirements?.completed_module_ids || [];
  const currentAccuracy = status.current_accuracy ?? 0;
  const minAccuracy = status.min_overall_accuracy ?? module.unlock_requirements?.min_overall_accuracy;
  return (
    <div className="gl-panel-soft p-4" data-testid="progress-requirements">
      <span className="gl-eyebrow flex items-center gap-2">
        <Lock size={14} /> Libera por evolucao
      </span>
      <h3 className="text-lg mt-1">Aula bloqueada por enquanto</h3>
      <p className="gl-text-muted text-sm mt-2">
        Este conteudo abre quando sua base da trilha estiver consistente.
      </p>
      {minAccuracy && (
        <div className="mt-3">
          <div className="flex justify-between text-xs gl-text-muted mb-1">
            <span>Aproveitamento minimo</span>
            <span className="gl-text-gold">{currentAccuracy}% / {minAccuracy}%</span>
          </div>
          <div className="gl-progress">
            <span style={{ width: `${Math.min(100, Math.round((currentAccuracy / minAccuracy) * 100))}%` }} />
          </div>
        </div>
      )}
      {requiredModules.length > 0 && (
        <div className="mt-3">
          <span className="gl-label">Concluir antes:</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {requiredModules.map((mid) => (
              <span key={mid} className="gl-tag gl-tag-gold">{mid}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

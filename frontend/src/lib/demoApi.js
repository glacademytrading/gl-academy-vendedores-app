const DEMO_PREFIX = "gl_sales_training_demo_first_access_v2_";
const TOKEN_PREFIX = "demo:";
const runtimeConfig = window.GL_MODEL_ACADEMY_CONFIG || {};
const ENABLE_ADMIN_DEMO =
  runtimeConfig.ENABLE_ADMIN_DEMO === true || process.env.REACT_APP_ENABLE_ADMIN_DEMO === "true";
const DEMO_ADMIN_EMAIL = String(runtimeConfig.DEMO_ADMIN_EMAIL || "").toLowerCase().trim();
const DEMO_ADMIN_PASSWORD = String(runtimeConfig.DEMO_ADMIN_PASSWORD || "");
const DEMO_STUDENT_EMAIL = String(runtimeConfig.DEMO_STUDENT_EMAIL || "").toLowerCase().trim();
const DEMO_STUDENT_PASSWORD = String(runtimeConfig.DEMO_STUDENT_PASSWORD || "");

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(`${DEMO_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(`${DEMO_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix = "demo") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function loadJson(name) {
  const res = await fetch(`/data/${name}`);
  if (!res.ok) throw new Error(`Nao foi possivel carregar ${name}`);
  return res.json();
}

let cache = null;

async function getContent() {
  if (cache) return cache;
  const [seed, content] = await Promise.all([loadJson("seed.json"), loadJson("content.json")]);
  const enrichment = content.moduleEnrichment || {};
  const extras = content.extraQuestions || {};
  const modules = (seed.modules || []).map((mod) => {
    const enrich = enrichment[mod.id] || {};
    const questions = [...(mod.questions || [])];
    for (const q of extras[mod.id] || []) {
      if (!questions.some((existing) => existing.id === q.id)) questions.push(q);
    }
    return {
      ...mod,
      lesson: {
        video_url: mod.lesson?.video_url || "",
        video_placeholder: mod.lesson?.video_placeholder || "",
        text: mod.lesson?.text || "",
        chapters: mod.lesson?.chapters || [],
        require_full_video: mod.lesson?.require_full_video || false,
      },
      stage: enrich.stage || "",
      lesson_page: enrich.lessonPage || {},
      practical: enrich.practical || {},
      questions,
    };
  });
  cache = { seed, content, modules };
  return cache;
}

function readToken() {
  try {
    const token = localStorage.getItem("gl_sales_training_token");
    return token?.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
  } catch {
    return null;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "student",
    account_status: user.account_status || "active",
    has_onboarded: user.has_onboarded ?? true,
    onboarding: user.onboarding || null,
    created_at: user.created_at,
    entitlements: user.entitlements || [],
  };
}

function seedUsers() {
  const users = storageGet("users", null);
  const initial = users || [];
  let next = initial;
  let changed = false;

  const ensureUser = (candidate, overwrite = false) => {
    if (!candidate.email || !candidate.password) return;
    const existingIndex = next.findIndex((user) => user.email === candidate.email);
    if (existingIndex >= 0) {
      if (overwrite) {
        next = next.map((user, index) => (index === existingIndex ? { ...user, ...candidate, id: user.id } : user));
        changed = true;
      }
    } else {
      next = [...next, candidate];
      changed = true;
    }
  };

  if (ENABLE_ADMIN_DEMO) {
    ensureUser({
      id: "demo-admin",
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
      name: "Gestão GL",
      role: "admin",
      account_status: "active",
      entitlements: ["gl_risk_auto"],
      has_onboarded: true,
      created_at: nowIso(),
    }, true);
  }

  ensureUser({
    id: "demo-colaborador",
    email: DEMO_STUDENT_EMAIL,
    password: DEMO_STUDENT_PASSWORD,
    name: "Colaborador Demo",
    role: "student",
    account_status: "active",
    entitlements: [],
    has_onboarded: true,
    onboarding: {
      role: "recrutador",
      roles: ["recrutador", "ativo", "tecnico"],
      experience: "Conta de demonstração",
      goal: "Validar o treinamento",
      challenge: "Conferir o avanço das trilhas",
    },
    created_at: nowIso(),
  }, true);

  if (!users || changed) storageSet("users", next);
  return next;
}

function currentUser() {
  const userId = readToken();
  if (!userId) return null;
  return seedUsers().find((user) => user.id === userId) || null;
}

function requireUser() {
  const user = currentUser();
  if (!user) throw { response: { data: { detail: "Sessao expirada. Entre novamente." }, status: 401 } };
  return user;
}

function withProgress(modules, userId) {
  const attempts = storageGet("attempts", []).filter((a) => a.user_id === userId);
  const lessonProgress = storageGet("lesson_progress", []).filter((lp) => lp.user_id === userId);
  return modules.map((module) => {
    const qIds = (module.questions || []).map((q) => q.id);
    const requireAllCorrect = !!module.require_all_correct;
    let resolved = 0;
    for (const qid of qIds) {
      const qAttempts = attempts.filter((a) => a.module_id === module.id && a.question_id === qid && a.scope === "module");
      if (!qAttempts.length) continue;
      const last = qAttempts[qAttempts.length - 1];
      if (last.is_correct || (!requireAllCorrect && qAttempts.length >= 3)) resolved += 1;
    }
    return {
      ...module,
      progress: {
        total_questions: qIds.length,
        resolved,
        percent: qIds.length ? Math.round((resolved / qIds.length) * 100) : (lessonProgress.some((lp) => lp.module_id === module.id) ? 100 : 0),
        lesson_done: lessonProgress.some((lp) => lp.module_id === module.id),
      },
    };
  });
}

function studentLearningProgress(student, modules) {
  const roles = student?.onboarding?.roles || [student?.onboarding?.role];
  const assignedTracks = [...new Set(roles.filter((role) => ["recrutador", "ativo", "tecnico"].includes(role)))];
  const attempts = storageGet("attempts", []).filter((attempt) => attempt.user_id === student.id && attempt.scope === "module");
  const lessons = storageGet("lesson_progress", []).filter((item) => item.user_id === student.id);
  const lessonByModule = new Map(lessons.map((item) => [item.module_id, item]));
  const withStudentProgress = withProgress(modules, student.id);
  const tracks = assignedTracks.map((track) => {
    const trackModules = withStudentProgress
      .filter((module) => module.track === track)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const rows = trackModules.map((module) => {
      const questionIds = (module.questions || []).map((question) => question.id);
      const questionsCorrect = questionIds.filter((questionId) => {
        const questionAttempts = attempts.filter(
          (attempt) => attempt.module_id === module.id && attempt.question_id === questionId
        );
        if (!questionAttempts.length) return false;
        return questionAttempts[questionAttempts.length - 1].is_correct;
      }).length;
      const watched = !!module.progress?.lesson_done;
      const completed = moduleComplete(module);
      return {
        id: module.id,
        order: module.order,
        title: module.title,
        track,
        video_completed: watched,
        video_completed_at: lessonByModule.get(module.id)?.completed_at || null,
        questions_correct: questionsCorrect,
        total_questions: questionIds.length,
        quiz_percent: questionIds.length ? Math.round((questionsCorrect / questionIds.length) * 100) : (watched ? 100 : 0),
        completed,
        status: completed ? "completed" : watched ? "quiz_pending" : "video_pending",
      };
    });
    const completedModules = rows.filter((row) => row.completed).length;
    return {
      track,
      total_modules: rows.length,
      completed_modules: completedModules,
      percent: rows.length ? Math.round((completedModules / rows.length) * 100) : 0,
      modules: rows,
    };
  });
  const rows = tracks.flatMap((track) => track.modules);
  const completedModules = rows.filter((row) => row.completed).length;
  return {
    assigned_tracks: assignedTracks,
    total_modules: rows.length,
    completed_modules: completedModules,
    videos_completed: rows.filter((row) => row.video_completed).length,
    percent: rows.length ? Math.round((completedModules / rows.length) * 100) : 0,
    tracks,
  };
}

const RISK_PREMIUM_TAGS = ["prop_firm_risk", "risk_auto", "risk_presets", "drawdown", "mes_micro"];

function hasEntitlement(user, entitlement) {
  if (user?.role === "admin") return true;
  return !!(entitlement && (user?.entitlements || []).includes(entitlement));
}

function moduleAllowed(user, module) {
  if (!module?.locked) return true;
  return hasEntitlement(user, module.required_entitlement || "gl_risk_auto");
}

function moduleReleaseLocked(user, module) {
  if (user?.role === "admin" || module?.locked) return false;
  const status = String(module?.release_status || "available").trim().toLowerCase();
  if (!["recording", "coming_soon", "draft"].includes(status)) return false;
  return !module?.lesson?.video_url;
}

function moduleComplete(module) {
  if (!module?.progress?.lesson_done) return false;
  const totalQuestions = module?.progress?.total_questions || 0;
  if (totalQuestions === 0) return true;
  return (module?.progress?.percent || 0) >= 100;
}

function moduleSequenceStatus(user, module, allModules) {
  if (user?.role === "admin" || (module?.order || 0) <= 1) return { allowed: true };
  const group = module?.sequence_group || module?.track || "";
  const sequenceModules = group
    ? allModules.filter((m) => (m.sequence_group || m.track || "") === group)
    : allModules;
  const ordered = [...sequenceModules].sort((a, b) => (a.order || 0) - (b.order || 0));
  const index = ordered.findIndex((m) => m.id === module.id);
  const previous = index > 0 ? ordered[index - 1] : null;
  if (!previous || previous.locked) return { allowed: true };
  const previousWithProgress = withProgress([previous], user.id)[0];
  if (moduleComplete(previousWithProgress)) return { allowed: true };
  return {
    allowed: false,
    required_module_id: previous.id,
    required_module_title: previous.title,
    required_module_order: previous.order,
  };
}

async function progressUnlockStatus(user, module, allModules) {
  const requirements = module?.unlock_requirements || {};
  if (!requirements.completed_module_ids?.length && !requirements.min_overall_accuracy) return { allowed: true };
  const lessonProgress = storageGet("lesson_progress", []).filter((lp) => lp.user_id === user.id);
  const lessonDone = new Set(lessonProgress.map((lp) => lp.module_id));
  const latest = latestAttempts(user.id);
  const missing = [];
  for (const moduleId of requirements.completed_module_ids || []) {
    const requiredModule = allModules.find((m) => m.id === moduleId);
    const questionIds = (requiredModule?.questions || []).map((q) => q.id);
    if (!lessonDone.has(moduleId)) {
      missing.push(moduleId);
      continue;
    }
    for (const questionId of questionIds) {
      const attempt = latest.find((a) => a.module_id === moduleId && a.question_id === questionId && a.scope === "module");
      if (!attempt?.is_correct) {
        missing.push(moduleId);
        break;
      }
    }
  }
  const metrics = await performanceFor(user.id);
  const minAccuracy = requirements.min_overall_accuracy;
  const accuracyOk = !minAccuracy || metrics.overall_accuracy >= minAccuracy;
  return {
    allowed: missing.length === 0 && accuracyOk,
    required_modules: requirements.completed_module_ids || [],
    missing_modules: [...new Set(missing)],
    min_overall_accuracy: minAccuracy,
    current_accuracy: metrics.overall_accuracy,
    accuracy_ok: accuracyOk,
  };
}

function modulePreview(module, reason = "premium", unlockStatus = {}) {
  if (reason === "release") {
    return {
      ...module,
      locked: false,
      release_locked: true,
      release_status: module.release_status || "recording",
      questions: [],
      lesson: {
        ...(module.lesson || {}),
        video_url: "",
        text: module.release_message || "Aula em gravacao. Ela ficara disponivel assim que o video oficial entrar na plataforma.",
      },
      lesson_page: {
        headline: module.release_label || "Aula em gravacao",
        sections: [
          {
            title: "Conteudo em preparacao",
            body: module.release_message || "Esta aula ja esta planejada na jornada, mas fica bloqueada ate o video oficial ser publicado.",
            bullets: [
              "Continue revisando as aulas ja liberadas.",
              "Use o diario disciplinar para consolidar sua leitura.",
              "Volte a trilha quando o mentor publicar a proxima aula.",
            ],
          },
        ],
        checklist: ["Revisar a aula anterior.", "Refazer checkpoints fracos.", "Aguardar a liberacao oficial."],
        mission: "Enquanto esta aula nao abre, registre uma leitura real no Diario Disciplinar usando o que voce ja estudou.",
      },
      practical: {
        title: "Proximo conteudo em gravacao",
        context: "A jornada foi montada para crescer junto com a mentoria completa.",
        goal: "Evitar que o aluno pule para uma aula sem video ou sem fechamento oficial.",
        lens: ["em gravacao", "trilha", "mentoria completa"],
      },
    };
  }
  if (reason === "sequence") {
    const requiredTitle = unlockStatus.required_module_title || "a aula anterior";
    const requiredOrder = unlockStatus.required_module_order;
    const label = requiredOrder ? `Aula ${String(requiredOrder).padStart(2, "0")}` : "Aula anterior";
    return {
      ...module,
      locked: false,
      sequence_locked: true,
      progress_locked: true,
      unlock_status: unlockStatus,
      questions: [],
      lesson: {
        ...(module.lesson || {}),
        video_url: "",
        text: `Conclua ${label}: ${requiredTitle} antes de avancar para esta aula.`,
      },
      lesson_page: {
        headline: "Aula bloqueada pela sequencia da trilha",
        sections: [
          {
            title: "Como liberar",
            body: "O GL Sales Training foi organizado como uma jornada guiada. Para abrir esta aula, conclua a etapa anterior primeiro.",
            bullets: [
              "Assista a aula anterior.",
              "Marque a aula como estudada.",
              "Quando houver teste, resolva todos os checkpoints praticos.",
            ],
          },
        ],
        checklist: [`Concluir ${label}: ${requiredTitle}.`, "Voltar para esta aula quando o app liberar."],
        mission: "Volte para a trilha e complete a etapa anterior antes de avancar.",
      },
      practical: {
        title: "Sequencia protegida",
        context: "O colaborador evolui melhor quando nao pula fundamentos.",
        goal: "Manter a ordem do treinamento e evitar lacunas na execução comercial.",
        lens: ["sequencia", "fundamento", "disciplina"],
      },
    };
  }
  if (reason === "progress") {
    return {
      ...module,
      locked: false,
      progress_locked: true,
      unlock_status: unlockStatus,
      questions: [],
      lesson: {
        ...(module.lesson || {}),
        video_url: "",
        text: "Aprofundamento bloqueado por evolucao. Conclua os modulos exigidos e mantenha o aproveitamento minimo para liberar.",
      },
      lesson_page: {
        headline: "Aprofundamento liberado por evolucao",
        sections: [
          {
            title: "Como liberar",
            body: "Este conteudo faz parte da mentoria completa. Ele abre quando o aluno conclui os modulos base indicados e atinge o aproveitamento minimo.",
            bullets: ["Assista aos modulos exigidos.", "Resolva os testes praticos com acerto.", "Use o relatorio para revisar tags fracas."],
          },
        ],
        checklist: ["Concluir os modulos exigidos.", "Atingir o aproveitamento minimo.", "Revisar pontos fracos antes de tentar acelerar."],
        mission: "Volte ao plano de 7 dias do relatorio e fortaleza a base antes de abrir este aprofundamento.",
      },
      practical: {
        title: "Proximo passo por desempenho",
        context: "O app libera aulas robustas quando a leitura base estiver consistente.",
        goal: "Evitar que o aluno pule para assunto avancado antes de dominar a micromentoria.",
        lens: ["evolucao", "relatorio", "mentoria completa"],
      },
    };
  }
  return {
    ...module,
    questions: [],
    lesson: {
      ...(module.lesson || {}),
      video_url: "",
      text: "Conteudo premium do GL Risk Auto. Assista ao workshop para entender a disciplina de risco.",
    },
    lesson_page: {},
    practical: {
      title: "Modulo premium GL Risk Auto",
      context: "Gerenciamento de risco para passar e sobreviver em mesa proprietaria.",
      goal: "Entender folga, drawdown, tamanho, pausa e rotina antes de operar uma avaliacao.",
      lens: ["risco", "drawdown", "prop firm", "GL Risk Auto"],
    },
    premium_preview: true,
  };
}

function knowledgeAllowed(user, page) {
  const premium = page?.locked || (page?.tags || []).some((tag) => RISK_PREMIUM_TAGS.includes(tag));
  return !premium || hasEntitlement(user, page.required_entitlement || "gl_risk_auto");
}

function knowledgePreview(page) {
  return {
    ...page,
    cards: [
      {
        title: "Conteudo premium GL Risk Auto",
        body: "Esta pagina faz parte do treinamento de gerenciamento de risco para passar e sobreviver em mesa proprietaria.",
        cue: "Assista ao workshop para entender o proximo passo.",
      },
    ],
    practice: "Assista ao GL Risk Auto Workshop antes de estudar folga, drawdown, MES, presets e finalizacao.",
    questions: [],
    premium_preview: true,
  };
}

function findQuestion(modules, questionId) {
  for (const module of modules) {
    const question = (module.questions || []).find((q) => q.id === questionId);
    if (question) return { module, question };
  }
  return null;
}

function attemptDiagnostics(question, selectedOptionIds) {
  const correctIds = question.correct_option_ids || [];
  const correct = new Set(correctIds);
  const selected = new Set(selectedOptionIds);
  const correctSelected = selectedOptionIds.filter((id) => correct.has(id));
  return {
    correct_selected_option_ids: correctSelected,
    missing_correct_option_ids: correctIds.filter((id) => !selected.has(id)),
    extra_option_ids: selectedOptionIds.filter((id) => !correct.has(id)),
    correct_selected_count: correctSelected.length,
    correct_count: correctIds.length,
    selected_count: selectedOptionIds.length,
  };
}

function score(attemptNumber, isCorrect) {
  if (!isCorrect) return 0;
  return { 1: 100, 2: 70, 3: 40 }[attemptNumber] || 40;
}

function latestAttempts(userId) {
  const latest = new Map();
  for (const attempt of storageGet("attempts", []).filter((a) => a.user_id === userId)) {
    const key = `${attempt.scope}:${attempt.module_id}:${attempt.question_id}`;
    const current = latest.get(key);
    if (!current || attempt.attempt_number > current.attempt_number) latest.set(key, attempt);
  }
  return [...latest.values()];
}

async function performanceFor(userId) {
  const { content, seed } = await getContent();
  const latest = latestAttempts(userId);
  const allAttempts = storageGet("attempts", []).filter((a) => a.user_id === userId);
  const total = latest.length;
  const correct = latest.filter((a) => a.is_correct).length;
  const points = allAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
  const tagStats = {};
  const layerStats = {};
  const layerTags = content.layerTags || {};

  for (const attempt of latest) {
    for (const tag of attempt.tags || []) {
      const stat = tagStats[tag] || { total: 0, correct: 0 };
      stat.total += 1;
      if (attempt.is_correct) stat.correct += 1;
      tagStats[tag] = stat;
    }
    for (const [layer, tags] of Object.entries(layerTags)) {
      if ((attempt.tags || []).some((tag) => tags.includes(tag))) {
        const stat = layerStats[layer] || { total: 0, correct: 0 };
        stat.total += 1;
        if (attempt.is_correct) stat.correct += 1;
        layerStats[layer] = stat;
      }
    }
  }

  const pct = (stat) => (stat?.total ? Math.round((stat.correct / stat.total) * 100) : null);
  const tagAccuracy = Object.fromEntries(Object.entries(tagStats).map(([tag, stat]) => [tag, pct(stat)]));
  const layerAccuracy = Object.fromEntries(Object.entries(layerStats).map(([layer, stat]) => [layer, pct(stat)]));
  const strongTags = Object.entries(tagStats)
    .filter(([, stat]) => stat.total >= 2 && pct(stat) >= 75)
    .map(([tag, stat]) => ({ tag, accuracy: pct(stat), attempts: stat.total }));
  const weakTags = Object.entries(tagStats)
    .filter(([, stat]) => stat.total >= 2 && pct(stat) <= 60)
    .map(([tag, stat]) => ({ tag, accuracy: pct(stat), attempts: stat.total }));

  const earnedBadgeIds = new Set();
  if (currentUser()?.has_onboarded) earnedBadgeIds.add("badge_processo");
  for (const attempt of allAttempts.filter((a) => a.is_correct)) {
    for (const tag of attempt.tags || []) {
      if (tag === "fundamentos") earnedBadgeIds.add("badge_leilao");
      if (["mapa_valor", "hvn", "lvn", "vah_val", "poc"].includes(tag)) earnedBadgeIds.add("badge_zona");
      if (tag === "edge_hvn") earnedBadgeIds.add("badge_edge");
      if (tag === "abs_fa") earnedBadgeIds.add("badge_abs");
      if (tag === "breakout_volume") earnedBadgeIds.add("badge_breakout");
      if (tag === "reteste_pullback") earnedBadgeIds.add("badge_reteste");
      if (tag === "gamma") earnedBadgeIds.add("badge_gamma");
      if (tag === "risco_ev") earnedBadgeIds.add("badge_risco");
      if (["prop_firm_risk", "risk_auto"].includes(tag)) earnedBadgeIds.add("badge_risk_auto");
    }
  }

  return {
    points,
    level: Math.min(5, Math.max(1, Math.floor(points / 250) + 1)),
    total_questions_attempted: total,
    correct,
    overall_accuracy: total ? Math.round((correct / total) * 100) : 0,
    tag_accuracy: tagAccuracy,
    tag_stats: tagStats,
    layer_accuracy: layerAccuracy,
    layer_stats: layerStats,
    strong_tags: strongTags,
    weak_tags: weakTags,
    badges: (seed.badges || []).map((badge) => ({ ...badge, earned: earnedBadgeIds.has(badge.id) })),
  };
}

async function reportFor(user) {
  const { content, modules, seed } = await getContent();
  const metrics = await performanceFor(user.id);
  const tagLabels = content.tagLabels || {};
  const weak = metrics.weak_tags.length ? metrics.weak_tags : [{ tag: "fundamentos", accuracy: 0 }];
  const reviewPlan = weak.slice(0, 7).map((item, index) => {
    const module = modules.find((m) => (m.tags || []).includes(item.tag)) || modules[index % modules.length];
    const page = (content.knowledgePages || []).find((p) => (p.tags || []).includes(item.tag));
    return {
      day: index + 1,
      tag: item.tag,
      tag_label: tagLabels[item.tag] || item.tag,
      module_id: module.id,
      module_title: module.title,
      knowledge_page_id: page?.id,
      knowledge_page_title: page?.title,
      focus: `Revisar ${tagLabels[item.tag] || item.tag}: ler a pagina, refazer perguntas e marcar prints reais.`,
    };
  });

  return {
    user: publicUser(user),
    metrics,
    diagnosis:
      metrics.total_questions_attempted === 0
        ? ["Voce ainda esta no inicio. Comece pela primeira trilha e responda aos questionarios."]
        : [
            `Voce respondeu ${metrics.total_questions_attempted} perguntas com taxa geral de ${metrics.overall_accuracy}%.`,
            metrics.weak_tags.length
              ? "O foco imediato deve ser revisar as tags fracas antes de acelerar a trilha."
              : "Nenhuma tag critica apareceu ainda. Continue acumulando tentativas para melhorar o diagnostico.",
            ...(metrics.total_questions_attempted >= 2 && metrics.overall_accuracy < 60
              ? ["Recomendacao do app: revise a trilha e alinhe os pontos fracos com a gestao antes de avancar."]
              : []),
          ],
    review_plan: reviewPlan,
    upsell_suggestions: [
      ...(metrics.total_questions_attempted >= 2 && metrics.overall_accuracy < 60
        ? [{
            id: "upsell_call_diagnostico_baixo_desempenho",
            trigger_tag: "diagnostico",
            current_accuracy: metrics.overall_accuracy,
            offer_title: "Call de diagnostico ou mentoria particular GL Model",
            offer_description: "Seu aproveitamento geral indica que vale revisar a base comigo antes de acelerar para os aprofundamentos.",
            coupon_code: "GLDIAGNOSTICO",
            payment_url: "https://linktr.ee/glacademytrading",
            schedule_url: "https://linktr.ee/glacademytrading",
          }]
        : []),
      ...(seed.upsell_rules || [])
        .filter((rule) => weak.some((item) => item.tag === rule.trigger_tag))
        .map((rule) => ({ ...rule, current_accuracy: weak.find((item) => item.tag === rule.trigger_tag)?.accuracy ?? 0 })),
    ],
    generated_at: nowIso(),
  };
}

function dataResponse(data) {
  return Promise.resolve({ data, status: 200, demo: true });
}

async function handleGet(url, config = {}) {
  const user = url.startsWith("/content/app") ? currentUser() : requireUser();
  const { seed, content, modules } = await getContent();
  const params = config.params || {};

  if (url === "/auth/me") return dataResponse(publicUser(requireUser()));
  if (url === "/content/app-info") return dataResponse({ ...seed.app });
  if (url === "/content/app-config") return dataResponse({ tag_labels: content.tagLabels || {}, layer_tags: content.layerTags || {} });
  if (url === "/content/modules") {
    const progressModules = withProgress(modules, user.id);
    const result = [];
    for (const module of progressModules) {
      if (moduleReleaseLocked(user, module)) {
        result.push(modulePreview(module, "release"));
        continue;
      }
      if (!moduleAllowed(user, module)) {
        result.push(modulePreview(module, "premium"));
        continue;
      }
      const sequenceStatus = moduleSequenceStatus(user, module, progressModules);
      if (!sequenceStatus.allowed) {
        result.push(modulePreview(module, "sequence", sequenceStatus));
        continue;
      }
      const status = await progressUnlockStatus(user, module, modules);
      result.push(status.allowed ? module : modulePreview(module, "progress", status));
    }
    return dataResponse(result);
  }
  if (url.startsWith("/content/modules/")) {
    const id = url.split("/").pop();
    const module = withProgress(modules, user.id).find((m) => m.id === id);
    if (!module) throw { response: { status: 404, data: { detail: "Modulo nao encontrado" } } };
    if (moduleReleaseLocked(user, module)) return dataResponse(modulePreview(module, "release"));
    if (!moduleAllowed(user, module)) return dataResponse(modulePreview(module, "premium"));
    const sequenceStatus = moduleSequenceStatus(user, module, modules);
    if (!sequenceStatus.allowed) return dataResponse(modulePreview(module, "sequence", sequenceStatus));
    const status = await progressUnlockStatus(user, module, modules);
    return dataResponse(status.allowed ? module : modulePreview(module, "progress", status));
  }
  if (url === "/content/journey-stages") return dataResponse(content.journeyStages || []);
  if (url === "/content/knowledge") {
    return dataResponse((content.knowledgePages || []).map((page) => (knowledgeAllowed(user, page) ? page : knowledgePreview(page))));
  }
  if (url === "/content/learning-drills") return dataResponse(content.learningDrills || []);
  if (url === "/content/challenges") return dataResponse(seed.challenges || []);
  if (url === "/content/badges") {
    const perf = await performanceFor(user.id);
    return dataResponse(perf.badges);
  }
  if (url.startsWith("/attempts/by-question/")) {
    const questionId = decodeURIComponent(url.split("/").pop());
    const attempts = storageGet("attempts", []).filter(
      (a) =>
        a.user_id === user.id &&
        a.question_id === questionId &&
        (!params.module_id || a.module_id === params.module_id) &&
        (!params.scope || a.scope === params.scope)
    );
    return dataResponse(attempts);
  }
  if (url === "/journal/export") {
    return dataResponse(storageGet("journal", []).filter((entry) => entry.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  if (url === "/journal") {
    return dataResponse(storageGet("journal", []).filter((entry) => entry.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  if (url === "/commissions") {
    return dataResponse(storageGet("commissions", []).filter((entry) => entry.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  if (url === "/user/performance") return dataResponse(await performanceFor(user.id));
  if (url === "/user/report") return dataResponse(await reportFor(user));
  if (url === "/admin/stats") {
    if (user.role !== "admin") throw { response: { status: 403, data: { detail: "Acesso admin necessario." } } };
    return dataResponse({
      students: seedUsers().filter((u) => u.role !== "admin").length,
      onboarded: seedUsers().filter((u) => u.role !== "admin" && u.has_onboarded).length,
      total_attempts: storageGet("attempts", []).length,
      journal_entries: storageGet("journal", []).length,
      logins: 0,
      failed_logins: 0,
      last_access_events: [],
    });
  }
  if (url === "/admin/students") {
    if (user.role !== "admin") throw { response: { status: 403, data: { detail: "Acesso admin necessario." } } };
    const students = await Promise.all(
      seedUsers()
        .filter((u) => u.role !== "admin")
        .map(async (student) => {
          const metrics = await performanceFor(student.id);
          const learning = studentLearningProgress(student, modules);
          return {
            user: publicUser(student),
            points: metrics.points,
            level: metrics.level,
            overall_accuracy: metrics.overall_accuracy,
            weak_tags: metrics.weak_tags.slice(0, 3),
            strong_tags: metrics.strong_tags.slice(0, 3),
            total_attempted: metrics.total_questions_attempted,
            learning: {
              total_modules: learning.total_modules,
              completed_modules: learning.completed_modules,
              videos_completed: learning.videos_completed,
              percent: learning.percent,
            },
          };
        })
    );
    return dataResponse(students);
  }
  if (url === "/admin/registrations") {
    if (user.role !== "admin") throw { response: { status: 403, data: { detail: "Acesso admin necessario." } } };
    const students = seedUsers().filter((item) => item.role !== "admin").map(publicUser);
    return dataResponse({
      stats: {
        pending: students.filter((item) => item.account_status === "pending").length,
        active: students.filter((item) => item.account_status === "active").length,
        blocked: students.filter((item) => item.account_status === "blocked").length,
        codes: 0,
        events: 0,
      },
      students,
      pending_students: students.filter((item) => item.account_status === "pending"),
      blocked_students: students.filter((item) => item.account_status === "blocked"),
      codes: [],
      events: [],
    });
  }
  if (url === "/admin/commissions") {
    if (user.role !== "admin") throw { response: { status: 403, data: { detail: "Acesso admin necessario." } } };
    const requests = storageGet("commissions", []).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return dataResponse({
      requests,
      stats: {
        waiting_technical: requests.filter((item) => item.approval_status === "waiting_technical").length,
        pending: requests.filter((item) => item.approval_status === "pending").length,
        approved: requests.filter((item) => item.approval_status === "approved").length,
        not_completed: requests.filter((item) => ["not_eligible", "rejected"].includes(item.approval_status)).length,
      },
    });
  }
  if (url.startsWith("/admin/students/")) {
    if (user.role !== "admin") throw { response: { status: 403, data: { detail: "Acesso admin necessario." } } };
    const id = decodeURIComponent(url.split("/").pop());
    const student = seedUsers().find((u) => u.id === id);
    if (!student) throw { response: { status: 404, data: { detail: "Colaborador nao encontrado" } } };
    return dataResponse({
      user: publicUser(student),
      metrics: await performanceFor(student.id),
      learning: studentLearningProgress(student, modules),
      journal_count: storageGet("journal", []).filter((entry) => entry.user_id === student.id).length,
      suggested_upsells: [],
    });
  }
  if (url === "/admin/upsells") {
    if (user.role !== "admin") throw { response: { status: 403, data: { detail: "Acesso admin necessario." } } };
    return dataResponse(seed.upsell_rules || []);
  }

  throw { response: { status: 404, data: { detail: "Rota demo nao encontrada" } } };
}

async function handlePost(url, payload = {}) {
  const { modules } = await getContent();

  if (url === "/auth/login") {
    const email = String(payload.email || "").toLowerCase().trim();
    const users = seedUsers();
    const user = users.find((u) => u.email === email);
    if (!user) {
      throw {
        response: {
          status: 401,
          data: { detail: "Conta não encontrada. Novos colaboradores devem clicar em Criar conta e responder todas as perguntas." },
        },
      };
    }
    if (user.password && user.password !== payload.password) {
      throw { response: { status: 401, data: { detail: "Senha demo incorreta." } } };
    }
    if (user.role !== "admin" && user.account_status !== "active") {
      throw { response: { status: 403, data: { detail: "Cadastro aguardando aprovacao da equipe GL Academy." } } };
    }
    const accessToken = `${TOKEN_PREFIX}${user.id}`;
    return dataResponse({ ...publicUser(user), access_token: accessToken, refresh_token: accessToken });
  }
  if (url === "/auth/register") {
    const email = String(payload.email || "").toLowerCase().trim();
    const users = seedUsers();
    if (users.some((u) => u.email === email)) throw { response: { status: 409, data: { detail: "E-mail ja cadastrado" } } };
    const allowedRoles = ["recrutador", "ativo", "tecnico"];
    const requestedRoles = Array.isArray(payload.team_roles) ? payload.team_roles : [payload.team_role];
    const selectedRoles = [...new Set(requestedRoles.filter((role) => allowedRoles.includes(role)))];
    const selectedRole = selectedRoles[0] || "";
    if (!selectedRole || !payload.experience || !payload.goal || !payload.challenge) {
      throw {
        response: {
          status: 422,
          data: { detail: "Responda todas as quatro perguntas antes de enviar o cadastro para aprovação." },
        },
      };
    }
    const user = {
      id: newId("user"),
      email,
      password: payload.password || "",
      name: payload.name || "Colaborador",
      role: "student",
      account_status: "pending",
      entitlements: [],
      has_onboarded: Boolean(selectedRole && payload.experience && payload.goal && payload.challenge),
      onboarding: selectedRole ? {
        role: selectedRole,
        roles: selectedRoles,
        experience: payload.experience || "",
        goal: payload.goal || "",
        challenge: payload.challenge || "",
      } : null,
      created_at: nowIso(),
    };
    storageSet("users", [...users, user]);
    return dataResponse({ ...publicUser(user), approval_required: true });
  }
  if (url === "/auth/logout") return dataResponse({ ok: true });

  const user = requireUser();
  if (url === "/user/onboarding") {
    const users = seedUsers().map((u) =>
      u.id === user.id
        ? {
            ...u,
            has_onboarded: true,
            onboarding: payload,
            account_status: "pending",
            approval_required: true,
          }
        : u
    );
    storageSet("users", users);
    return dataResponse({
      ...publicUser(users.find((u) => u.id === user.id)),
      approval_required: true,
    });
  }
  if (url.match(/^\/content\/modules\/.+\/lesson-done$/)) {
    const moduleId = url.split("/")[3];
    const module = modules.find((m) => m.id === moduleId);
    if (module) {
      if (moduleReleaseLocked(user, module)) {
        throw { response: { status: 403, data: { detail: "Aula em gravacao. Aguarde a liberacao oficial do mentor." } } };
      }
      const sequenceStatus = moduleSequenceStatus(user, module, modules);
      if (!sequenceStatus.allowed) {
        throw { response: { status: 403, data: { detail: "Conclua a aula anterior antes de avancar nesta etapa." } } };
      }
      const status = await progressUnlockStatus(user, module, modules);
      if (!status.allowed) throw { response: { status: 403, data: { detail: "Aprofundamento bloqueado por evolucao. Conclua os requisitos antes de marcar como estudado." } } };
    }
    const docs = storageGet("lesson_progress", []).filter((lp) => !(lp.user_id === user.id && lp.module_id === moduleId));
    docs.push({ user_id: user.id, module_id: moduleId, completed_at: nowIso() });
    storageSet("lesson_progress", docs);
    return dataResponse({ ok: true });
  }
  if (url === "/attempts") {
    const found = findQuestion(modules, payload.question_id);
    if (!found) throw { response: { status: 404, data: { detail: "Questao nao encontrada" } } };
    if (moduleReleaseLocked(user, found.module)) {
      throw { response: { status: 403, data: { detail: "Aula em gravacao. Aguarde a liberacao oficial do mentor." } } };
    }
    const sequenceStatus = moduleSequenceStatus(user, found.module, modules);
    if (!sequenceStatus.allowed) {
      throw { response: { status: 403, data: { detail: "Conclua a aula anterior antes de responder este teste." } } };
    }
    if (!moduleAllowed(user, found.module)) {
      throw { response: { status: 403, data: { detail: "Modulo premium do GL Risk Auto. Assista ao workshop para liberar o proximo passo." } } };
    }
    const status = await progressUnlockStatus(user, found.module, modules);
    if (!status.allowed) {
      throw { response: { status: 403, data: { detail: "Aprofundamento bloqueado por evolucao. Conclua os requisitos antes de responder." } } };
    }
    if (found.module?.lesson?.require_full_video) {
      const watched = storageGet("lesson_progress", []).some(
        (lp) => lp.user_id === user.id && lp.module_id === found.module.id
      );
      if (!watched) {
        throw { response: { status: 403, data: { detail: "Assista ao video completo antes de responder o questionario." } } };
      }
    }
    const attempts = storageGet("attempts", []);
    const previous = attempts.filter((a) => a.user_id === user.id && a.question_id === payload.question_id && a.module_id === payload.module_id && a.scope === payload.scope);
    if (previous.length >= 3 && !found.module.require_all_correct) {
      throw { response: { status: 400, data: { detail: "Limite de tentativas atingido" } } };
    }
    const attemptNumber = previous.length + 1;
    const selected = payload.selected_option_ids || [];
    const isCorrect = new Set(found.question.correct_option_ids).size === new Set(selected).size && found.question.correct_option_ids.every((id) => selected.includes(id));
    const doc = {
      id: newId("attempt"),
      user_id: user.id,
      question_id: payload.question_id,
      module_id: payload.module_id,
      scope: payload.scope || "module",
      selected_option_ids: selected,
      correct_option_ids: found.question.correct_option_ids,
      is_correct: isCorrect,
      score: score(attemptNumber, isCorrect),
      attempt_number: attemptNumber,
      decision_input: payload.decision_input || null,
      feedback: isCorrect ? found.question.feedback_correct : found.question.feedback_incorrect,
      tags: found.module.tags || [],
      created_at: nowIso(),
      ...attemptDiagnostics(found.question, selected),
    };
    storageSet("attempts", [...attempts, doc]);
    return dataResponse(doc);
  }
  if (url === "/journal") {
    const entry = { ...payload, id: newId("journal"), user_id: user.id, created_at: nowIso() };
    storageSet("journal", [entry, ...storageGet("journal", [])]);
    return dataResponse(entry);
  }
  if (url === "/commissions") {
    const stored = storageGet("commissions", []);
    const reportRole = String(payload.report_role || "").trim();
    const leadName = String(payload.lead_name || payload.client_name || "").trim();
    const leadKey = leadName.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
    const existing = stored.find(
      (item) => item.lead_key === leadKey && item.workflow_status === "waiting_technical"
    );
    const chainId = existing?.chain_id || newId("chain");
    const isTechnical = reportRole === "tecnico";
    const completed = isTechnical && payload.sale_outcome === "completed";
    const notCompleted = isTechnical && payload.sale_outcome === "not_completed";
    const workflowStatus = completed
      ? "sale_completed"
      : notCompleted
        ? "sale_not_completed"
        : reportRole === "recrutador" || reportRole === "ativo"
          ? "waiting_technical"
          : payload.workflow_status || "";
    const approvalStatus = completed
      ? "pending"
      : notCompleted
        ? "not_eligible"
        : reportRole === "recrutador" || reportRole === "ativo"
          ? "waiting_technical"
          : "pending";
    const technicalName = String(
      payload.technical_seller_name || (isTechnical ? payload.employee_name || user.name : "")
    ).trim();
    const linked = isTechnical
      ? stored.map((item) =>
          item.lead_key === leadKey &&
          ["recrutador", "ativo"].includes(item.report_role) &&
          item.workflow_status === "waiting_technical"
            ? {
                ...item,
                chain_id: chainId,
                workflow_status: workflowStatus,
                approval_status: approvalStatus,
                technical_seller_name: technicalName,
                sale_outcome: payload.sale_outcome,
                sale_date: payload.sale_date,
                sale_value: payload.sale_value,
                payment_date: payload.payment_date,
                product_name: payload.product_name,
                loss_reason: payload.loss_reason,
                updated_at: nowIso(),
              }
            : item
        )
      : stored;
    const entry = {
      ...payload,
      id: newId("commission"),
      chain_id: chainId,
      lead_key: leadKey,
      lead_name: leadName,
      user_id: user.id,
      user_email: user.email,
      employee_name: payload.employee_name || user.name,
      report_role: reportRole,
      workflow_status: workflowStatus,
      approval_status: approvalStatus,
      technical_seller_name: technicalName,
      created_at: nowIso(),
      approved_at: null,
      approved_by: null,
      admin_reason: "",
    };
    storageSet("commissions", [entry, ...linked]);
    return dataResponse(entry);
  }
  if (url.match(/^\/admin\/students\/.+\/(approve|block|unblock)$/)) {
    if (user.role !== "admin") throw { response: { status: 403, data: { detail: "Acesso admin necessario." } } };
    const parts = url.split("/");
    const id = parts[3];
    const action = parts[4];
    const accountStatus = action === "block" ? "blocked" : "active";
    const users = seedUsers().map((item) => item.id === id ? { ...item, account_status: accountStatus } : item);
    storageSet("users", users);
    return dataResponse(publicUser(users.find((item) => item.id === id)));
  }
  if (url.match(/^\/admin\/commissions\/.+\/(approve|reject)$/)) {
    if (user.role !== "admin") throw { response: { status: 403, data: { detail: "Acesso admin necessario." } } };
    const parts = url.split("/");
    const id = parts[3];
    const action = parts[4];
    const status = action === "approve" ? "approved" : "rejected";
    const stored = storageGet("commissions", []);
    const selected = stored.find((item) => item.id === id);
    const requests = stored.map((item) =>
      (selected?.chain_id
        ? item.chain_id === selected.chain_id && item.approval_status === "pending"
        : item.id === id)
        ? {
            ...item,
            approval_status: status,
            approved_at: action === "approve" ? nowIso() : item.approved_at,
            approved_by: action === "approve" ? user.email : item.approved_by,
            admin_reason: payload.reason || "",
          }
        : item
    );
    storageSet("commissions", requests);
    return dataResponse(requests.find((item) => item.id === id));
  }

  return dataResponse({ ok: true });
}

async function handleDelete(url) {
  const user = requireUser();
  if (url.startsWith("/journal/")) {
    const id = decodeURIComponent(url.split("/").pop());
    storageSet("journal", storageGet("journal", []).filter((entry) => !(entry.user_id === user.id && entry.id === id)));
    return dataResponse({ ok: true });
  }
  return dataResponse({ ok: true });
}

export function isDemoToken(token) {
  return token?.startsWith(TOKEN_PREFIX);
}

export async function demoRequest(method, url, payload, config) {
  window.dispatchEvent(new CustomEvent("gl-demo-mode"));
  if (method === "get") return handleGet(url, config);
  if (method === "post") return handlePost(url, payload);
  if (method === "patch") return dataResponse({ ok: true });
  if (method === "delete") return handleDelete(url);
  throw { response: { status: 405, data: { detail: "Metodo demo nao suportado" } } };
}

const runtimeConfig = window.GL_MODEL_ACADEMY_CONFIG || {};

export const SUPPORT_LINKS = {
  website: runtimeConfig.WEBSITE_URL || "https://glacademytrading.com",
  linktree: runtimeConfig.LINKTREE_URL || "https://linktr.ee/glacademytrading",
  whatsapp:
    runtimeConfig.WHATSAPP_URL ||
    "https://wa.me/5511933226422?text=Ola%2C%20sou%20da%20equipe%20GL%20Academy%20e%20preciso%20de%20suporte.",
  discord: runtimeConfig.DISCORD_URL || "https://discord.gg/tEcsuymuBm",
  riskWorkshopVideoUrl: runtimeConfig.RISK_WORKSHOP_VIDEO_URL || "",
};

export const IMPORTANT_LINKS = {
  recruitment: [
    {
      id: "formulario-pre-entrevista-colaboradores",
      title: "Formulário de pré-entrevista",
      description: "Preenchimento obrigatório para colaboradores iniciarem o processo de entrevista com a equipe GL.",
      url: "https://forms.gle/bbdVKEonHWGJJYgB9",
    },
  ],
  institutional: [
    {
      id: "site-oficial",
      title: "Site oficial GL Academy",
      description: "Produtos, tecnologias, mentorias e ecossistema GL.",
      url: "https://glacademytrading.com/",
    },
    {
      id: "comunidade-whatsapp",
      title: "Comunidade gratuita no WhatsApp",
      description: "Grupo oficial da comunidade GL Academy.",
      url: "https://chat.whatsapp.com/D3fnBVdXQbXED466vSUtQX",
    },
    {
      id: "instagram-trading",
      title: "Instagram GL Academy Trading",
      description: "Conteúdos, produtos e novidades da GL Academy.",
      url: "https://www.instagram.com/glacademytrading/",
    },
    {
      id: "instagram-br",
      title: "Instagram GL Academy Brasil",
      description: "Perfil oficial da GL Academy no Brasil.",
      url: "https://www.instagram.com/glacademybr/",
    },
    {
      id: "instagram-lazaro",
      title: "Instagram Lázaro Trades",
      description: "Bastidores, rotina e mercado.",
      url: "https://www.instagram.com/lazarotrades/",
    },
    {
      id: "whatsapp-bia",
      title: "Falar com a Bia",
      description: "Recrutadora oficial e suporte da equipe.",
      url: SUPPORT_LINKS.whatsapp,
    },
  ],
  international: [
    {
      id: "stripe-mfm-lifetime",
      title: "Multi Fractal Model — vitalício",
      description: "Pagamento internacional do plano vitalício MFM.",
      url: "https://buy.stripe.com/3cI14ne4zaTW1jm2Fh7ok0l",
    },
    {
      id: "stripe-mfm-anual",
      title: "Multi Fractal Model — anual",
      description: "Pagamento internacional do plano anual MFM.",
      url: "https://buy.stripe.com/3cI4gz9Oj6DG3ru1Bd7ok0n",
    },
    {
      id: "stripe-gamma",
      title: "GL Gamma",
      description: "Pagamento internacional do GL Gamma.",
      url: "https://buy.stripe.com/28E00j1hN4vy2nqcfR7ok0o",
    },
    {
      id: "stripe-mentoria-risco",
      title: "Mentoria 1:1 — gerenciamento de risco",
      description: "Mentoria individual de gerenciamento de risco.",
      url: "https://buy.stripe.com/bJe5kDaSn8LO7HK93F7ok0g",
    },
    {
      id: "stripe-mentoria-indicador",
      title: "Mentoria gravada + indicador de risco",
      description: "Mentoria gravada com indicador de gerenciamento de risco.",
      url: "https://buy.stripe.com/8x228r3pV4vy2nqbbN7ok0h",
    },
    {
      id: "stripe-risk-auto",
      title: "Indicador GL Risk Auto",
      description: "Indicador de gerenciamento de risco automático.",
      url: "https://buy.stripe.com/8x2cN5gcHaTW2nq2Fh7ok0i",
    },
    {
      id: "stripe-risk-gamepad",
      title: "GL Risk Auto + GamePad — anual",
      description: "Combo anual do indicador GL Risk Auto com GamePad.",
      url: "https://buy.stripe.com/aFa00jbWr6DGd241Bd7ok0j",
    },
    {
      id: "stripe-mentoria-dupla",
      title: "Mentoria dupla gravada — MFM + GL Model",
      description: "Mentoria gravada do Multi Fractal Model e GL Model.",
      url: "https://buy.stripe.com/5kQ7sL8KfbY04vyfs37ok0k",
    },
  ],
  national: [
    {
      id: "mp-gamma",
      title: "GL Gamma — assinatura mensal",
      description: "Assinatura mensal de R$ 170.",
      url: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=471f57e3243e46aa91a2ae06d97910b6",
    },
    {
      id: "mp-mfm-anual",
      title: "Multi Fractal Model — plano anual",
      description: "Plano anual do Multi Fractal Model.",
      url: "https://mpago.li/1GsDq1D",
    },
    {
      id: "mp-mfm-vitalicio",
      title: "Multi Fractal Model + Mentoria MMXM — vitalício",
      description: "Pacote de entrada GL Academy, R$ 2.400.",
      url: "https://mpago.li/1jDg5vd",
    },
    {
      id: "mp-mentoria-risco",
      title: "Mentoria de gerenciamento de risco",
      description: "Formação para mesas proprietárias, R$ 480.",
      url: "https://mpago.li/11MUV8Z",
    },
    {
      id: "mp-call-2h",
      title: "Call com Giovane Lázaro — 2 horas",
      description: "Call estratégica individual, R$ 450.",
      url: "https://mpago.li/2YXF8jU",
    },
    {
      id: "mp-risk-gamepad",
      title: "Combo Risk Auto + GamePad Risk Auto",
      description: "Combo para NinjaTrader, promoção de lançamento de R$ 400.",
      url: "https://mpago.li/2m444D1",
    },
    {
      id: "mp-risk-auto",
      title: "Indicador Risk Auto — NinjaTrader",
      description: "Gerenciamento de risco automático no gráfico, R$ 150.",
      url: "https://mpago.li/2PKkxFh",
    },
    {
      id: "mp-gamepad-vitalicio",
      title: "GL GamePad Risk Auto — vitalício",
      description: "Plano vitalício em até 2x sem juros, R$ 330.",
      url: "https://mpago.li/2Xn4awa",
    },
    {
      id: "mp-tradingview-anual-curto",
      title: "TradingView — GL Model + MFM + Mentoria, anual",
      description: "Pacote anual de R$ 2.899.",
      url: "https://mpago.li/1dZ6oMf",
    },
    {
      id: "mp-tradingview-vitalicio",
      title: "TradingView — GL Model + MFM + Mentoria, vitalício",
      description: "Novo checkout nacional do plano vitalício, R$ 3.400.",
      url: "https://www.mercadopago.com.br/checkout/v1/payment/redirect/593fd3a6-8644-4114-98f3-60af67f0c924/payment-option-form/?source=link&preference-id=150847666-a8bb4505-97c5-49f8-9970-9c89c79984ac&router-request-id=0798d01c-1052-46f8-8ea3-21e58508da93&p=01f33569b230cf9561e09b2101df82a4",
    },
    {
      id: "mp-tradingview-anual",
      title: "TradingView — GL Model + MFM + Mentoria, anual",
      description: "Novo checkout nacional do plano anual, R$ 2.899.",
      url: "https://www.mercadopago.com.br/checkout/v1/payment/redirect/ce56e3bc-4a9c-4c21-b3a9-484711d90c77/payment-option-form/?source=link&preference-id=150847666-63fcbd09-c2c1-4bf4-b762-41338a84b175&router-request-id=e16502e6-3fd9-4bb2-a63b-685f6388ebd6&p=01f33569b230cf9561e09b2101df82a4",
    },
    {
      id: "mp-ninja-vitalicio",
      title: "NinjaTrader + TradingView — GL Model vitalício + Mentoria",
      description: "Novo checkout nacional do plano vitalício, R$ 4.300.",
      url: "https://www.mercadopago.com.br/checkout/v1/payment/redirect/373e0bcd-2102-49d5-8dc2-c511bf675064/payment-option-form/?source=link&preference-id=150847666-1d4e7209-5bd6-4a1c-92af-6b4cb6cd93f5&router-request-id=17cabce2-5d0f-457a-b96d-1c701e6259ae&p=01f33569b230cf9561e09b2101df82a4",
    },
    {
      id: "mp-ninja-anual",
      title: "NinjaTrader + TradingView — GL Model anual + Mentoria",
      description: "Novo checkout nacional do plano anual, R$ 3.700.",
      url: "https://www.mercadopago.com.br/checkout/v1/payment/redirect/d17a6d24-232d-4b93-9f83-a860f3970787/payment-option-form/?source=link&preference-id=150847666-105d4b7a-2968-4527-b2cb-17e9bda93b7c&router-request-id=9e897ad0-c2af-4762-affb-0e9e3012360c&p=01f33569b230cf9561e09b2101df82a4",
    },
  ],
};

export const ROLE_TRACKS = {
  recrutador: {
    route: "/recrutadores",
    navLabel: "Recrutadores",
    title: "Trilha do Recrutador",
    shortTitle: "Recrutador",
    track: "recrutador",
    dailyGoal: "3 entrevistas qualificadas",
    secondaryGoal: "15 abordagens e 1 candidato aprovado para a Bia",
    monthlyGoals: [
      "Entrevistas qualificadas",
      "Abordagens realizadas",
      "Candidatos aprovados pela gestão",
    ],
    playbookPageId: "playbook-recrutador",
    materialId: "playbook-recrutador",
    accent: "var(--gl-cyan)",
    responsibilities: [
      "Encontrar pessoas com energia comercial.",
      "Vender a vaga com verdade e ambicao.",
      "Filtrar disponibilidade, postura e potencial de venda.",
      "Encaminhar candidatos com score e motivo claro.",
    ],
    metrics: ["Abordagens", "Entrevistas", "Aprovados", "Canal de origem"],
  },
  ativo: {
    route: "/vendedor-ativo",
    navLabel: "Vendedor Ativo",
    title: "Trilha do Vendedor Ativo",
    shortTitle: "Vendedor Ativo",
    track: "ativo",
    dailyGoal: "50 prospeccoes frias",
    secondaryGoal: "10 conversas e 5 leads qualificados",
    monthlyGoals: [
      "Prospecções realizadas",
      "Conversas iniciadas",
      "Leads qualificados",
      "Follow-ups concluídos",
    ],
    playbookPageId: "playbook-ativo",
    materialId: "playbook-ativo",
    accent: "var(--gl-green)",
    responsibilities: [
      "Gerar volume diario sem perder criterio.",
      "Abrir conversas com pergunta diagnostica.",
      "Classificar leads frios, mornos e quentes.",
      "Manter CRM e follow-up vivos.",
    ],
    metrics: ["Prospeccoes", "Conversas", "Leads qualificados", "Follow-ups"],
  },
  tecnico: {
    route: "/vendedor-tecnico",
    navLabel: "Vendedor Tecnico",
    title: "Trilha do Vendedor Tecnico",
    shortTitle: "Vendedor Tecnico",
    track: "tecnico",
    dailyGoal: "2 leads quentes fechados",
    secondaryGoal: "3 propostas e 6 diagnosticos tecnicos",
    monthlyGoals: [
      "Diagnósticos técnicos",
      "Propostas enviadas",
      "Vendas confirmadas pela gestão",
      "Receita gerada",
    ],
    playbookPageId: "playbook-tecnico",
    materialId: "playbook-tecnico",
    accent: "var(--gl-gold-2)",
    responsibilities: [
      "Dominar produtos, precos, garantias e beneficios.",
      "Responder objecoes com postura consultiva.",
      "Conduzir lead quente ate checkout correto.",
      "Orientar o pos-venda e entrada na comunidade.",
    ],
    metrics: ["Diagnosticos", "Propostas", "Fechamentos", "Receita"],
  },
};

export const ROLE_KEYS = Object.keys(ROLE_TRACKS);

export function getUserRoleKeys(user) {
  if (user?.role === "admin" || user?.onboarding?.role === "gestao") return [...ROLE_KEYS];
  const assigned = Array.isArray(user?.onboarding?.roles) ? user.onboarding.roles : [];
  const legacyRole = user?.onboarding?.role;
  return [...new Set([...assigned, legacyRole].filter((role) => ROLE_KEYS.includes(role)))];
}

export function getUserRoleKey(user) {
  if (user?.role === "admin") return "gestao";
  if (user?.onboarding?.role === "gestao") return "gestao";
  return getUserRoleKeys(user)[0] || null;
}

export function canAccessRole(user, roleKey) {
  return user?.role === "admin" || user?.onboarding?.role === "gestao" || getUserRoleKeys(user).includes(roleKey);
}

export function getRoleTrack(user) {
  const roleKey = getUserRoleKey(user);
  return ROLE_TRACKS[roleKey] || null;
}

export function getRoleTracks(user) {
  return getUserRoleKeys(user).map((roleKey) => ROLE_TRACKS[roleKey]).filter(Boolean);
}

export function isModuleForUser(module, user) {
  if (!module || user?.role === "admin" || user?.onboarding?.role === "gestao") return true;
  const roleTracks = getRoleTracks(user).map((role) => role.track);
  if (!roleTracks.length) return module?.track === "geral";
  return module?.track === "geral" || roleTracks.includes(module?.track);
}

export const DAILY_FOCUS = [
  {
    role: "Recrutador",
    goal: "3 entrevistas",
    body: "Prioridade: buscar vendedores com energia, vender a vaga com comissao por performance e registrar score.",
    route: "/recrutadores",
  },
  {
    role: "Vendedor Ativo",
    goal: "50 prospeccoes",
    body: "Prioridade: abrir conversas com pergunta diagnostica e separar leads frios, mornos e quentes.",
    route: "/vendedor-ativo",
  },
  {
    role: "Vendedor Técnico",
    goal: "2 fechamentos",
    body: "Prioridade: revisar leads quentes, responder objecoes e acompanhar checkout ate confirmacao.",
    route: "/vendedor-tecnico",
  },
];

export const STUDENT_MATERIALS = [
  {
    id: "guia-colaborador",
    title: "Guia do Colaborador GL Sales Training",
    description: "Acesso, rotina diaria, metas, cultura e prestacao de contas.",
    href: "/materials/equipe/Guia_Colaborador_GL_Sales_Training.md",
    stage: "Comece aqui",
  },
  {
    id: "playbook-recrutador",
    title: "Playbook do Recrutador",
    description: "Canais, pitch da vaga, score e triagem.",
    href: "/materials/equipe/Playbook_Recrutador_GL.md",
    stage: "Recrutador",
  },
  {
    id: "recrutador-proposta-funcao",
    title: "Proposta e Função do Recrutador",
    description: "Documento de referência sobre a proposta, o papel e as responsabilidades da função.",
    href: "/materials/recrutadores/Documento_Recrutador_Proposta_Funcao.pdf",
    stage: "Recrutador",
  },
  {
    id: "recrutador-manual-gestao",
    title: "Manual: Como Recrutar e Gerir a Equipe",
    description: "Orientações práticas para selecionar, treinar, acompanhar e desenvolver vendedores.",
    href: "/materials/recrutadores/Manual_Recrutador_Como_Recrutar_Gerir_Equipe.pdf",
    stage: "Recrutador",
  },
  {
    id: "recrutador-checklist-liberacao",
    title: "Checklist de Liberação do Captador e Recrutador",
    description: "Processo de vendas e pontos de conferência antes da liberação operacional.",
    href: "/materials/recrutadores/Checklist_Liberacao_Captador_Recrutador.pdf",
    stage: "Recrutador",
  },
  {
    id: "recrutador-regras-comissao",
    title: "Regras de Comissão e Conduta",
    description: "Regras oficiais de comissão, registro, postura e conduta do recrutador.",
    href: "/materials/recrutadores/Regras_Comissao_Conduta_Recrutador.pdf",
    stage: "Recrutador",
  },
  {
    id: "recrutador-estrutura-global",
    title: "Estrutura Global de Vendas e Recrutamento",
    description: "Visão geral da organização comercial, do recrutamento e do fluxo entre as funções.",
    href: "/materials/recrutadores/Estrutura_Global_Vendas_Recrutamento_Recrutadores.pdf",
    stage: "Recrutador",
  },
  {
    id: "playbook-ativo",
    title: "Playbook do Vendedor Ativo",
    description: "Prospecao, script, CRM e follow-up.",
    href: "/materials/equipe/Playbook_Vendedor_Ativo_GL.md",
    stage: "Vendedor Ativo",
  },
  {
    id: "ativo-como-ganhar",
    title: "Como Ganhar com a GL Academy",
    description: "Documento para o captador sobre função, oportunidades e regras de remuneração.",
    href: "/materials/vendedor-ativo/Documento_Captador_Como_Ganhar_GL_Academy.pdf",
    stage: "Vendedor Ativo",
  },
  {
    id: "ativo-gestao-objecoes",
    title: "Gestão de Objeções para Vendedores",
    description: "Processo comercial com orientações para responder dúvidas, resistência e objeções.",
    href: "/materials/vendedor-ativo/Gestao_Objecoes_Vendedores.pdf",
    stage: "Vendedor Ativo",
  },
  {
    id: "ativo-formas-pagamento",
    title: "Formas de Pagamento",
    description: "Referência sobre os meios, condições e informações de pagamento disponíveis.",
    href: "/materials/vendedor-ativo/Formas_de_Pagamento.pdf",
    stage: "Vendedor Ativo",
  },
  {
    id: "ativo-scripts-captacao",
    title: "Scripts de Captação por DM e WhatsApp",
    description: "Modelos de mensagens para iniciar conversas e conduzir a abordagem comercial.",
    href: "/materials/vendedor-ativo/Scripts_DM_WhatsApp_Captacao.pdf",
    stage: "Vendedor Ativo",
  },
  {
    id: "ativo-checklist-handoff",
    title: "Checklist do Lead Qualificado, CRM e Handoff",
    description: "Campos e verificações para entregar um lead completo à próxima etapa da venda.",
    href: "/materials/vendedor-ativo/Checklist_Lead_Qualificado_CRM_Handoff.pdf",
    stage: "Vendedor Ativo",
  },
  {
    id: "playbook-tecnico",
    title: "Playbook do Vendedor Tecnico",
    description: "Produtos, objecoes e fechamento consultivo.",
    href: "/materials/equipe/Playbook_Vendedor_Tecnico_GL.md",
    stage: "Vendedor Tecnico",
  },
  {
    id: "tecnico-formas-pagamento",
    title: "Formas de Pagamento",
    description: "Referência sobre meios de pagamento, condições e informações comerciais para fechamento técnico.",
    href: "/materials/vendedor-tecnico/Formas_de_Pagamento.pdf",
    stage: "Vendedor Técnico",
  },
  {
    id: "tecnico-gestao-objecoes",
    title: "Gestão de Objeções para Vendedores",
    description: "Processo comercial para responder dúvidas, resistências e objeções durante a call técnica.",
    href: "/materials/vendedor-tecnico/Gestao_Objecoes_Vendedores.pdf",
    stage: "Vendedor Técnico",
  },
  {
    id: "produtos",
    title: "Raio-X de Produtos GL Academy",
    description: "Produtos, beneficios, encaixe por perfil e cuidados de promessa.",
    href: "/materials/equipe/Raio_X_Produtos_GL_Academy.md",
    stage: "GL Academy",
  },
];

export const PRODUCT_CATEGORIES = [
  {
    id: "gl-model",
    title: "Produtos que vocês irão vender",
    description: "As quatro opções oficiais do GL Model: anual e vitalício para NinjaTrader e TradingView.",
  },
  {
    id: "diversos",
    title: "Produtos diversos",
    description: "Tecnologias, serviços e infoprodutos do ecossistema GL Academy com seus valores de referência.",
  },
];

export const PRODUCTS = [
  {
    id: "gl-model-ninjatrader-vitalicio",
    category: "gl-model",
    name: "GL Model NinjaTrader — vitalício",
    badge: "vitalício",
    featured: true,
    price: "R$ 4.300,00",
    installments: "12x de R$ 358,33",
    installmentValue: "Acesso vitalício",
    description: "Pacote principal para NinjaTrader com os bônus oficiais informados no site.",
    includes: ["GL Model NinjaTrader", "TradingView incluso", "Multi Fractal incluso", "OrderFlow e Risk Auto"],
    primaryUrl: "https://mpago.li/2StKduA",
    note: "Valor consultado no site oficial em 18/06/2026.",
  },
  {
    id: "gl-model-ninjatrader-anual",
    category: "gl-model",
    name: "GL Model NinjaTrader — anual",
    badge: "anual",
    featured: true,
    price: "R$ 3.700,00",
    installments: "12x de R$ 308,33",
    installmentValue: "Acesso por 1 ano",
    description: "Versão anual do ecossistema GL Model para NinjaTrader.",
    includes: ["GL Model NinjaTrader", "Multi Fractal anual", "OrderFlow anual", "GL Risk Auto anual"],
    primaryUrl: "https://mpago.li/1sTLNr6",
    note: "Valor consultado no site oficial em 18/06/2026.",
  },
  {
    id: "gl-model-tradingview-vitalicio",
    category: "gl-model",
    name: "GL Model TradingView — vitalício",
    badge: "vitalício",
    featured: true,
    price: "R$ 3.400,00",
    installments: "6x de R$ 566,67",
    installmentValue: "Acesso vitalício",
    description: "Mapa institucional para TradingView com Multi Fractal e recursos Quant.",
    includes: ["TradingView", "Mapa institucional", "Multi Fractal", "HUD Quant"],
    primaryUrl: "https://mpago.li/1bSu4X7",
    note: "Valor consultado no site oficial em 18/06/2026.",
  },
  {
    id: "gl-model-tradingview-anual",
    category: "gl-model",
    name: "GL Model TradingView — anual",
    badge: "anual",
    featured: true,
    price: "R$ 2.899,00",
    installments: "12x de R$ 241,58",
    installmentValue: "Acesso por 1 ano",
    description: "Entrada anual no GL Model para TradingView com Multi Fractal.",
    includes: ["TradingView", "Multi Fractal", "Gamepad At Market", "Mentoria gravada no app"],
    primaryUrl: "https://mpago.li/1dZ6oMf",
    note: "Valor consultado no site oficial em 18/06/2026.",
  },
  {
    id: "multifractal-model",
    category: "diversos",
    name: "Multifractal Model",
    badge: "tecnologia",
    compact: true,
    price: "R$ 2.400 vitalício",
    installments: "Anual: R$ 1.600",
    installmentValue: "TradingView e NinjaTrader",
    description: "Fluxo fractal para TradingView e NinjaTrader.",
    primaryUrl: "https://mpago.li/1jDg5vd",
    secondaryUrl: "https://buy.stripe.com/3cI4gz9Oj6DG3ru1Bd7ok0n",
    secondaryLabel: "Anual internacional",
  },
  {
    id: "gl-gamma",
    category: "diversos",
    name: "GL Gamma",
    badge: "assinatura",
    compact: true,
    price: "R$ 170/mês",
    installments: "Assinatura mensal",
    installmentValue: "TradingView",
    description: "Microplataforma de Gamma para TradingView.",
    primaryUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=471f57e3243e46aa91a2ae06d97910b6",
  },
  {
    id: "plugin-orderflow",
    category: "diversos",
    name: "Plugin OrderFlow",
    badge: "plugin",
    compact: true,
    price: "R$ 330",
    installments: "3x sem juros",
    installmentValue: "De R$ 430",
    description: "Footprint e leitura dentro do candle.",
    primaryUrl: "https://mpago.li/15sq7PL",
  },
  {
    id: "gl-risk-auto",
    category: "diversos",
    name: "GL Risk Auto",
    badge: "gerenciamento de risco",
    compact: true,
    price: "R$ 150",
    installments: "Combo com Gamepad: R$ 400",
    installmentValue: "NinjaTrader",
    description: "Mentor de risco em tempo real para apoiar disciplina e controle operacional.",
    primaryUrl: "https://mpago.li/2PKkxFh",
    secondaryUrl: "https://mpago.li/2m444D1",
    secondaryLabel: "Ver combo",
  },
  {
    id: "gl-gamepad-trader-pro",
    category: "diversos",
    name: "GL Gamepad Trader Pro",
    badge: "execução",
    compact: true,
    price: "R$ 330",
    installments: "2x sem juros",
    installmentValue: "Combo com Risk Auto: R$ 400",
    description: "Solução de controle, teclado e risco automático para execução.",
    primaryUrl: "https://mpago.li/2Xn4awa",
    secondaryUrl: "https://mpago.li/2m444D1",
    secondaryLabel: "Ver combo",
  },
  {
    id: "sala-analise-investimentos",
    category: "diversos",
    name: "Sala de Análise e Investimentos",
    badge: "serviço",
    compact: true,
    price: "A partir de R$ 250",
    installments: "Anual: R$ 1.200",
    installmentValue: "Mensal, trimestral, semestral e anual",
    description: "Sala dedicada a ações, mercado e análises de médio e longo prazo.",
    primaryUrl: "https://mpago.li/2LFGsKJ",
    secondaryUrl: "https://mpago.la/2j53FoJ",
    secondaryLabel: "Plano mensal",
  },
  {
    id: "mentoria-1x1",
    category: "diversos",
    name: "Mentoria 1:1 e Call Estratégica",
    badge: "serviço",
    compact: true,
    price: "R$ 2.800",
    installments: "8x de R$ 350",
    installmentValue: "Call de 2h: R$ 450",
    description: "Acompanhamento individual e call estratégica para diagnóstico técnico e direcionamento.",
    primaryUrl: "https://mpago.li/2SiEPEb",
    secondaryUrl: "https://mpago.li/2YXF8jU",
    secondaryLabel: "Call de 2h",
  },
  {
    id: "app-gl-model-academy",
    category: "diversos",
    name: "APP GL Model Academy",
    badge: "infoproduto",
    compact: true,
    price: "R$ 1.700",
    installments: "12x de R$ 141,67",
    installmentValue: "App + GL Model + Multi Fractal",
    description: "GL Model e MultiFractal reunidos em uma jornada estruturada dentro do aplicativo.",
    primaryUrl: "https://mpago.li/2UaFU2G",
  },
  {
    id: "mentoria-gestao-risco",
    category: "diversos",
    name: "Mentoria Gestão de Risco",
    badge: "infoproduto",
    compact: true,
    price: "R$ 480",
    installments: "Com GL Risk Auto",
    installmentValue: "Super combo: R$ 600",
    description: "Treinamento para passar e sobreviver em mesas proprietárias com disciplina de risco.",
    primaryUrl: "https://mpago.li/11MUV8Z",
  },
  {
    id: "bootcamp-gl-academy",
    category: "diversos",
    name: "Bootcamp GL Academy",
    badge: "ao vivo",
    compact: true,
    price: "A liberar trimestralmente",
    installments: "4 semanas ao vivo",
    installmentValue: "Janela curta",
    description: "Imersão ao vivo de quatro semanas, disponibilizada em janelas específicas.",
    primaryUrl: SUPPORT_LINKS.website,
  },
];

export const OFFICIAL_PACKAGES = [
  {
    id: "pacote-gl-model-ninja",
    name: "Pacote GL Model NinjaTrader",
    badge: "Pacote principal",
    price: "12x de R$ 358,33",
    detail: "Vitalício R$ 4.300,00 · Anual R$ 3.700,00 em 12x de R$ 308,33",
  },
  {
    id: "pacote-gl-model-tv",
    name: "Pacote GL Model TradingView",
    badge: "Segundo pacote principal",
    price: "12x de R$ 241,58",
    detail: "Anual R$ 2.899,00 · Vitalício R$ 3.400,00 em 6x de R$ 566,67",
  },
  {
    id: "pacote-mentoria-risco",
    name: "Mentoria 1:1 + gestão de risco",
    badge: "Acompanhamento",
    price: "8x de R$ 350,00",
    detail: "Total R$ 2.800,00",
  },
  {
    id: "pacote-app-call",
    name: "APP GL Model Academy + call de 2h",
    badge: "Estudo",
    price: "12x de R$ 141,67",
    detail: "Total R$ 1.700,00",
  },
  {
    id: "pacote-multifractal",
    name: "Multi Fractal Model + Mentoria MFM",
    badge: "Entrada",
    price: "12x de R$ 200,00",
    detail: "Vitalício R$ 2.400,00 · Anual R$ 1.600,00 com call de 2h",
  },
  {
    id: "pacote-gamma",
    name: "GL Gamma para TradingView",
    badge: "Assinatura mensal",
    price: "R$ 170,00/mês",
    detail: "Assinatura mensal",
  },
];

export const WORKSHOP_OFFERS = [
  {
    id: "suporte-rh",
    title: "Suporte/RH GL Academy",
    description: "Canal para duvidas de acesso, rotina, cadastros e alinhamento interno.",
    cta: "Chamar suporte",
    url: SUPPORT_LINKS.whatsapp,
  },
  {
    id: "sala-vendas",
    title: "Sala de Vendas Virtual",
    description: "Discord da equipe para tirar duvidas, compartilhar objecoes e comemorar vendas.",
    cta: "Abrir Discord",
    url: SUPPORT_LINKS.discord,
  },
];

export const NEWS_UPDATES = [
  {
    id: "news-kickoff-sales",
    tag: "Alinhamento",
    title: "Novo app interno de treinamento comercial GL Academy",
    body:
      "As trilhas de Recrutador, Vendedor Ativo e Vendedor Tecnico entram como base para onboarding, aulas, quizzes e prestacao de contas.",
    created_at: "2026-06-18T08:00:00-03:00",
    action_url: "/trilha",
  },
  {
    id: "news-record-commission",
    tag: "Equipe",
    title: "Mural de vitorias: use a aba Novidades para celebrar recordes",
    body:
      "Exemplo de uso: novo recorde de comissao batido, primeiro fechamento do dia, melhor recrutador da semana ou campanha com alta conversao.",
    created_at: "2026-06-18T09:15:00-03:00",
    action_url: "/desempenho",
  },
  {
    id: "news-market-payroll",
    tag: "Mercado",
    title: "Dias de noticia forte viram argumento comercial",
    body:
      "Quando mercado estiver volatil, use o briefing para abrir conversa sobre processo, risco e leitura. Nunca prometa resultado.",
    created_at: "2026-06-18T10:30:00-03:00",
    action_url: "/mercado",
  },
];

export const MARKET_REPORTS = [
  {
    id: "briefing-vendas-01",
    period: "Briefing matinal",
    title: "Mercado volatil: argumento para falar de leitura, risco e processo",
    tone: "cautela",
    created_at: "2026-06-18T08:30:00-03:00",
    bullets: [
      "Use volatilidade como gancho de conversa, nao como promessa de oportunidade.",
      "Pergunte ao lead se ele consegue explicar o que esta vendo no mercado hoje.",
      "Conecte a dor com mapa, indicador, mentoria ou acompanhamento.",
      "Reforce que decisao sem processo aumenta ansiedade e erro.",
    ],
    watchlist: ["Dolar", "S&P 500", "Nasdaq", "VIX", "Calendario economico"],
  },
  {
    id: "briefing-vendas-02",
    period: "Calendario economico",
    title: "Payroll, CPI e FOMC: dias para vender disciplina",
    tone: "neutro",
    created_at: "2026-06-18T09:00:00-03:00",
    bullets: [
      "Antes de noticias fortes, fale sobre risco e rotina.",
      "Depois de movimentos grandes, pergunte se o lead tinha plano ou operou no susto.",
      "Use exemplos educacionais e evite qualquer recomendacao individual.",
    ],
    watchlist: ["Payroll", "CPI", "FOMC", "Juros", "DXY"],
  },
  {
    id: "briefing-vendas-03",
    period: "Campanha",
    title: "Quando uma campanha estiver no ar, alinhe script e oferta",
    tone: "construtivo",
    created_at: "2026-06-18T12:00:00-03:00",
    bullets: [
      "Confirme preco e condicao antes de enviar checkout.",
      "Vendedor Ativo gera conversa; Vendedor Tecnico fecha com dominio de produto.",
      "Recrutador deve abastecer equipe quando a campanha exigir mais volume.",
    ],
    watchlist: ["Oferta vigente", "Checkout", "Script", "Objecoes", "Leads quentes"],
  },
];

export const UPGRADE_IDEAS = [
  {
    id: "role-tracks",
    title: "Trilhas por cargo",
    status: "done",
    note: "Recrutador, Vendedor Ativo e Vendedor Tecnico com metas, aulas e quizzes separados.",
  },
  {
    id: "sales-report",
    title: "Relatorio diario para gestao",
    status: "done",
    note: "Base para registrar contatos, entrevistas, propostas, vendas e gargalos.",
  },
];

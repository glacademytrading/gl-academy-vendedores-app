import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp } from "lucide-react";

const GENERAL_FIELDS = [
  {
    key: "meta",
    label: "Meta",
    question: "Qual numero precisa ser entregue?",
    options: [
      { value: "abordagens", label: "Abordagens", cues: ["abordagens", "contatos", "prospeccoes"] },
      { value: "entrevistas", label: "Entrevistas", cues: ["entrevistas", "candidatos"] },
      { value: "propostas", label: "Propostas", cues: ["propostas", "checkout"] },
      { value: "vendas", label: "Vendas", cues: ["fechamentos", "vendas", "receita"] },
    ],
  },
  {
    key: "foco",
    label: "Foco",
    question: "Qual comportamento sustenta a meta?",
    options: [
      { value: "ritmo", label: "Ritmo diario", cues: ["rotina", "diario", "foco"] },
      { value: "registro", label: "Registro real", cues: ["relatorio", "registrar", "numero"] },
      { value: "cultura", label: "Cultura GL", cues: ["cultura", "promessa", "compliance"] },
      { value: "aprendizado", label: "Aprendizado", cues: ["aula", "trilha", "quiz"] },
    ],
  },
  {
    key: "proxima_acao",
    label: "Proxima acao",
    question: "O que deve acontecer depois?",
    options: [
      { value: "estudar", label: "Estudar aula", cues: ["aula", "estudar", "revisar"] },
      { value: "executar", label: "Executar meta", cues: ["executar", "meta", "fazer"] },
      { value: "reportar", label: "Reportar para a Bia", cues: ["relatorio", "bia", "prestacao"] },
      { value: "compartilhar", label: "Compartilhar com o time", cues: ["discord", "equipe", "compartilhar"] },
    ],
  },
];

const RECRUITER_FIELDS = [
  {
    key: "fonte",
    label: "Fonte",
    question: "De onde vem o candidato?",
    options: [
      { value: "indicacao", label: "Indicacao", cues: ["indicacao", "interno"] },
      { value: "linkedin", label: "LinkedIn / comunidade", cues: ["linkedin", "comunidade", "grupo"] },
      { value: "instagram", label: "Instagram", cues: ["instagram", "social"] },
      { value: "base_antiga", label: "Base antiga", cues: ["base", "antigo"] },
    ],
  },
  {
    key: "perfil",
    label: "Perfil",
    question: "Qual sinal comercial apareceu?",
    options: [
      { value: "energia", label: "Energia comercial", cues: ["energia", "velocidade"] },
      { value: "meta", label: "Historico com meta", cues: ["meta", "comissao", "vendas"] },
      { value: "disponibilidade", label: "Disponibilidade", cues: ["disponibilidade", "horario"] },
      { value: "coachability", label: "Aprende com feedback", cues: ["feedback", "aprender", "treinavel"] },
    ],
  },
  {
    key: "acao",
    label: "Acao",
    question: "Qual proximo passo faz sentido?",
    options: [
      { value: "abordar", label: "Abordar", cues: ["abordar", "sourcing"] },
      { value: "entrevistar", label: "Entrevistar", cues: ["entrevista", "agenda"] },
      { value: "aprovar", label: "Encaminhar aprovado", cues: ["aprovar", "encaminhar", "score"] },
      { value: "recusar", label: "Recusar com motivo", cues: ["recusar", "cortar", "sem disponibilidade"] },
    ],
  },
];

const ACTIVE_SELLER_FIELDS = [
  {
    key: "alvo",
    label: "Alvo",
    question: "Quem sera abordado?",
    options: [
      { value: "lead_frio", label: "Lead frio", cues: ["frio", "prospeccao"] },
      { value: "lead_morno", label: "Lead morno", cues: ["morno", "respondeu"] },
      { value: "lead_quente", label: "Lead quente", cues: ["quente", "interesse"] },
      { value: "base", label: "Base antiga", cues: ["base", "lista"] },
    ],
  },
  {
    key: "abordagem",
    label: "Abordagem",
    question: "Como a conversa deve abrir?",
    options: [
      { value: "pergunta_curta", label: "Pergunta curta", cues: ["pergunta", "curta", "diagnostica"] },
      { value: "dor", label: "Dor do lead", cues: ["dor", "dificuldade"] },
      { value: "mercado", label: "Gancho de mercado", cues: ["mercado", "volatil", "noticia"] },
      { value: "follow_up", label: "Follow-up com contexto", cues: ["follow-up", "cadencia", "retomar"] },
    ],
  },
  {
    key: "status",
    label: "Status",
    question: "Como registrar o lead?",
    options: [
      { value: "novo", label: "Novo", cues: ["novo"] },
      { value: "diagnostico", label: "Em diagnostico", cues: ["diagnostico", "qualificar"] },
      { value: "proposta", label: "Enviar ao tecnico", cues: ["tecnico", "proposta", "quente"] },
      { value: "follow_up", label: "Follow-up", cues: ["follow-up", "retorno"] },
    ],
  },
];

const TECHNICAL_SELLER_FIELDS = [
  {
    key: "dor",
    label: "Dor",
    question: "Qual problema do cliente precisa ser resolvido?",
    options: [
      { value: "leitura", label: "Leitura de mercado", cues: ["leitura", "grafico", "mapa"] },
      { value: "execucao", label: "Execucao", cues: ["ninjatrader", "execucao", "fluxo"] },
      { value: "processo", label: "Processo / rotina", cues: ["mentoria", "rotina", "processo"] },
      { value: "confianca", label: "Confianca", cues: ["medo", "confianca", "nao usar"] },
    ],
  },
  {
    key: "produto",
    label: "Produto",
    question: "Qual oferta encaixa melhor?",
    options: [
      { value: "tradingview", label: "TradingView", cues: ["tradingview", "mapa"] },
      { value: "ninjatrader", label: "NinjaTrader", cues: ["ninjatrader", "hud", "fluxo"] },
      { value: "mentoria", label: "Mentoria", cues: ["mentoria", "acompanhamento"] },
      { value: "combo", label: "Combo", cues: ["combo", "ferramenta", "suporte"] },
    ],
  },
  {
    key: "objecao",
    label: "Objecao",
    question: "Qual trava apareceu?",
    options: [
      { value: "preco", label: "Preco", cues: ["caro", "preco", "valor"] },
      { value: "tempo", label: "Tempo", cues: ["tempo", "usar", "rotina"] },
      { value: "confianca", label: "Confianca", cues: ["confianca", "medo", "garantia"] },
      { value: "comparacao", label: "Comparacao", cues: ["ja tenho", "indicador", "comparar"] },
    ],
  },
  {
    key: "fechamento",
    label: "Fechamento",
    question: "Qual proximo passo deve ser conduzido?",
    options: [
      { value: "prova", label: "Mostrar prova/valor", cues: ["prova", "valor", "beneficio"] },
      { value: "checkout", label: "Enviar checkout", cues: ["checkout", "link", "pagamento"] },
      { value: "follow_up", label: "Marcar follow-up", cues: ["follow-up", "pensar"] },
      { value: "pos_venda", label: "Orientar pos-venda", cues: ["comunidade", "onboarding", "pos-venda"] },
    ],
  },
];

const MANAGEMENT_FIELDS = [
  {
    key: "numero",
    label: "Numero",
    question: "Qual indicador sera reportado?",
    options: [
      { value: "atividade", label: "Atividade", cues: ["contatos", "entrevistas", "prospeccoes"] },
      { value: "resultado", label: "Resultado", cues: ["vendas", "fechamentos", "receita"] },
      { value: "gargalo", label: "Gargalo", cues: ["gargalo", "problema", "travou"] },
      { value: "proxima_acao", label: "Proxima acao", cues: ["proxima", "acao", "melhorar"] },
    ],
  },
  {
    key: "postura",
    label: "Postura",
    question: "Qual comportamento protege a operacao?",
    options: [
      { value: "honestidade", label: "Numero honesto", cues: ["honesto", "real"] },
      { value: "compliance", label: "Sem promessa proibida", cues: ["promessa", "lucro", "compliance"] },
      { value: "time", label: "Compartilhar aprendizado", cues: ["time", "discord", "compartilhar"] },
      { value: "foco", label: "Foco na meta", cues: ["meta", "foco"] },
    ],
  },
];

export const DECISION_FIELDS = GENERAL_FIELDS;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textFromQuestion(question, module) {
  const options = (question?.options || []).map((opt) => opt.text).join(" ");
  return normalize(`${module?.title || ""} ${module?.summary || ""} ${module?.objective || ""} ${question?.prompt || ""} ${options} ${(module?.tags || []).join(" ")}`);
}

function findOption(field, value) {
  return field.options.find((opt) => opt.value === value);
}

export function getDecisionMode(module) {
  return module?.track || "geral";
}

export function getDecisionFields(module) {
  if (module?.track === "recrutador") return RECRUITER_FIELDS;
  if (module?.track === "ativo") return ACTIVE_SELLER_FIELDS;
  if (module?.track === "tecnico") return TECHNICAL_SELLER_FIELDS;
  if (module?.track === "gestao") return MANAGEMENT_FIELDS;
  return GENERAL_FIELDS;
}

export function inferDecisionExpected(question, module, fields = getDecisionFields(module)) {
  const text = textFromQuestion(question, module);
  const result = {};

  for (const field of fields) {
    const matches = field.options
      .map((option) => ({
        option,
        score: option.cues.reduce((sum, cue) => sum + (text.includes(normalize(cue)) ? 1 : 0), 0),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    if (matches[0]) result[field.key] = matches[0].option.value;
  }

  return result;
}

export function evaluateDecision(value, expected = {}, fields = DECISION_FIELDS) {
  const missing = [];
  const matched = [];
  const mismatched = [];
  const unansweredExpected = [];

  for (const field of fields) {
    const selected = value?.[field.key];
    const expectedValue = expected?.[field.key];
    if (!selected) {
      missing.push(field);
      if (expectedValue) unansweredExpected.push(field);
      continue;
    }
    if (!expectedValue || selected === expectedValue) matched.push(field);
    else mismatched.push(field);
  }

  const complete = missing.length === 0;
  const status = !complete ? "missing" : mismatched.length ? "warn" : "good";
  return { complete, status, missing, matched, mismatched, unansweredExpected };
}

export function isDecisionComplete(value, fields = DECISION_FIELDS) {
  return fields.every((field) => !!value?.[field.key]);
}

function copyForMode(mode) {
  const base = {
    eyebrow: "Checklist comercial",
    title: "Organize a decisao antes do quiz",
    description: "Marque uma opcao por camada. O sistema usa isso para revisar se seu raciocinio combina com a aula.",
    good: "Boa. Seu raciocinio esta completo para responder o quiz.",
    neutral: "Selecione as camadas para receber uma revisao simples antes do quiz.",
  };
  if (mode === "recrutador") return { ...base, title: "Monte a triagem do candidato" };
  if (mode === "ativo") return { ...base, title: "Monte a abordagem do lead" };
  if (mode === "tecnico") return { ...base, title: "Monte o fechamento tecnico" };
  if (mode === "gestao") return { ...base, title: "Monte a prestacao de contas" };
  return base;
}

export default function DecisionBuilder({ value, onChange, locked = false, hint, expected = {}, fields = DECISION_FIELDS, mode = "geral" }) {
  const [showReview, setShowReview] = useState(false);
  const v = useMemo(() => value || {}, [value]);
  const review = useMemo(() => evaluateDecision(v, expected, fields), [v, expected, fields]);
  const copy = copyForMode(mode);

  const setField = (key, selectedValue) => {
    onChange({ ...v, [key]: selectedValue });
    setShowReview(true);
  };

  const selectedLabel = (field) => findOption(field, v[field.key])?.label;

  return (
    <div className="gl-panel-soft p-4 lg:p-5" data-testid="decision-builder">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <span className="gl-eyebrow">{copy.eyebrow}</span>
          <h3 className="text-lg mt-1">{copy.title}</h3>
        </div>
        {hint && <span className="gl-tag gl-tag-gold">{hint}</span>}
      </div>
      <p className="text-sm gl-text-muted mb-4">{copy.description}</p>

      <div className="grid gap-3">
        {fields.map((field) => (
          <section key={field.key} className="gl-decision-layer">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="gl-label">{field.label}</span>
                <p className="text-xs gl-text-soft mt-0.5">{field.question}</p>
              </div>
              {selectedLabel(field) && <span className="gl-tag gl-tag-gold">{selectedLabel(field)}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {field.options.map((option) => {
                const active = v[field.key] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`gl-choice-chip ${active ? "active" : ""}`}
                    disabled={locked}
                    onClick={() => setField(field.key, option.value)}
                    data-testid={`decision-${field.key}-${option.value}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <DecisionReview review={review} expected={expected} value={v} show={showReview || review.complete} fields={fields} copy={copy} />
    </div>
  );
}

function DecisionReview({ review, expected, value, show, fields, copy }) {
  if (!show) {
    return (
      <div className="gl-decision-review neutral mt-4">
        <CircleHelp size={15} />
        <span>{copy.neutral}</span>
      </div>
    );
  }

  if (review.status === "missing") {
    return (
      <div className="gl-decision-review warn mt-4" data-testid="decision-review">
        <AlertTriangle size={15} />
        <span>
          Faltam {review.missing.map((field) => field.label).join(", ")}. Complete as camadas para o quiz corrigir com mais contexto.
        </span>
      </div>
    );
  }

  if (review.status === "warn") {
    return (
      <div className="gl-decision-review warn mt-4" data-testid="decision-review">
        <AlertTriangle size={15} />
        <div>
          <strong>O raciocinio tem pontos bons, mas algumas camadas parecem fora do cenario.</strong>
          <div className="grid gap-1 mt-2">
            {review.mismatched.map((field) => {
              const selected = findOption(field, value[field.key]);
              const expectedOption = findOption(field, expected[field.key]);
              return (
                <span key={field.key} className="text-xs">
                  {field.label}: voce marcou <strong>{selected?.label}</strong>; o cenario aponta mais para <strong>{expectedOption?.label}</strong>.
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gl-decision-review good mt-4" data-testid="decision-review">
      <CheckCircle2 size={15} />
      <span>{copy.good}</span>
    </div>
  );
}

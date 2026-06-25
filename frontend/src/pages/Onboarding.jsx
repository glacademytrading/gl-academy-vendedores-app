import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";

const ROLES = [
  ["recrutador", "Recrutador"],
  ["ativo", "Vendedor Ativo"],
  ["tecnico", "Vendedor Técnico"],
];

const EXPERIENCE = [
  ["primeiros_dias", "Estou nos primeiros dias"],
  ["ate_3_meses", "Até 3 meses de experiência"],
  ["mais_3_meses", "Mais de 3 meses de experiência"],
  ["lideranca", "Já lidero ou apoio a equipe"],
];

const GOALS = [
  ["dominar_funcao", "Dominar minha função e rotina"],
  ["bater_meta", "Bater minha meta com consistência"],
  ["melhorar_conversao", "Melhorar minha conversão"],
  ["crescer_gl", "Crescer para uma nova responsabilidade"],
];

const CHALLENGES = [
  ["volume", "Manter volume diário"],
  ["abordagem", "Abrir conversas melhores"],
  ["objecoes", "Responder objeções"],
  ["fechamento", "Conduzir até o fechamento"],
  ["organizacao", "Registrar números e follow-ups"],
  ["produto", "Dominar produtos e mercado"],
];

export default function Onboarding() {
  const { saveOnboarding, logout, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const initialRoles = Array.isArray(user?.onboarding?.roles)
    ? user.onboarding.roles
    : [user?.onboarding?.role].filter((role) => ["recrutador", "ativo", "tecnico"].includes(role));
  const [form, setForm] = useState({
    roles: initialRoles,
    experience: "",
    goal: "",
    challenge: "",
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const hasRoles =
      (Array.isArray(user?.onboarding?.roles) && user.onboarding.roles.length > 0) ||
      ["recrutador", "ativo", "tecnico", "gestao"].includes(user?.onboarding?.role);
    if (user?.has_onboarded && hasRoles) navigate("/", { replace: true });
  }, [user, navigate]);

  if (
    user?.has_onboarded &&
    ((Array.isArray(user?.onboarding?.roles) && user.onboarding.roles.length > 0) ||
      ["recrutador", "ativo", "tecnico", "gestao"].includes(user?.onboarding?.role))
  ) return null;

  const steps = [
    {
      key: "roles",
      title: "Quais funções você exerce na equipe?",
      help: "Marque todas as opções que fazem parte da sua atuação. Elas definirão quais trilhas estarão liberadas.",
      options: ROLES,
      multiple: true,
    },
    {
      key: "experience",
      title: "Há quanto tempo você atua nessa função?",
      help: "Vamos calibrar a formação sem pular fundamentos importantes.",
      options: EXPERIENCE,
    },
    {
      key: "goal",
      title: "Qual é o seu principal objetivo agora?",
      help: "O painel usará esse foco para orientar sua próxima ação.",
      options: GOALS,
    },
    {
      key: "challenge",
      title: "Qual é o seu maior desafio hoje?",
      help: "Isso ajuda a priorizar aulas, revisões e acompanhamento da gestão.",
      options: CHALLENGES,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const canAdvance = current.multiple ? form.roles.length > 0 : Boolean(form[current.key]);

  const next = async () => {
    if (!canAdvance) return;
    if (!isLast) {
      setStep((value) => value + 1);
      return;
    }
    setLoading(true);
    try {
      await saveOnboarding({ ...form, role: form.roles[0] });
      await logout();
      toast.success("Perguntas concluídas. Seu cadastro foi enviado para aprovação da gestão.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-10 flex items-center justify-center">
      <div className="w-full max-w-3xl gl-panel p-7 lg:p-10 gl-fade-in" data-testid="onboarding-panel">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <span className="gl-eyebrow">Configuração inicial</span>
          <span className="gl-text-soft text-xs">{step + 1} / {steps.length}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl">{current.title}</h1>
        <p className="gl-text-muted text-sm mt-2">{current.help}</p>

        <div className="gl-progress mt-5">
          <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-6 gl-stagger">
          {current.options.map(([value, label]) => {
            const selected = current.multiple ? form.roles.includes(value) : form[current.key] === value;
            return (
              <button
                type="button"
                key={value}
                onClick={() =>
                  setForm((state) =>
                    current.multiple
                      ? {
                          ...state,
                          roles: state.roles.includes(value)
                            ? state.roles.filter((role) => role !== value)
                            : [...state.roles, value],
                        }
                      : { ...state, [current.key]: value }
                  )
                }
                data-testid={`onb-${current.key}-${value}`}
                className={`p-4 text-left rounded-md border transition-all duration-150 hover:translate-y-[-1px] ${
                  selected ? "gl-glow-gold" : ""
                }`}
                style={{
                  borderColor: selected ? "rgba(255, 103, 84, 0.64)" : "var(--gl-line)",
                  background: selected ? "rgba(255, 103, 84, 0.12)" : "rgba(245, 247, 246, 0.04)",
                  color: selected ? "var(--gl-gold-2)" : "var(--gl-text)",
                }}
              >
                <strong className="block text-sm">{label}</strong>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 mt-7 flex-wrap">
          <button
            type="button"
            className="gl-ghost-btn"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            data-testid="onb-back"
          >
            Voltar
          </button>
          <button
            type="button"
            className="gl-primary-btn"
            onClick={next}
            disabled={!canAdvance || loading}
            data-testid="onb-next"
          >
            {loading ? "Enviando..." : isLast ? "Enviar cadastro para aprovação" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}

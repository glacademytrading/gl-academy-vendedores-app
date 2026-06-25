import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";

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

const STEPS = [
  {
    key: "roles",
    title: "Quais funções você exerce na equipe?",
    help: "Marque todas as opções que fazem parte da sua atuação. Elas definirão quais áreas estarão liberadas.",
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

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("account");
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    accessCode: "",
    agree: false,
  });
  const [profile, setProfile] = useState({
    roles: [],
    experience: "",
    goal: "",
    challenge: "",
  });
  const [loading, setLoading] = useState(false);

  const openConfiguration = (event) => {
    event.preventDefault();
    if (account.password.length < 8) {
      toast.error("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    if (account.password !== account.confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (!account.agree) {
      toast.error("Você precisa concordar com os termos e a privacidade.");
      return;
    }
    setPhase("profile");
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canAdvance = current?.multiple ? profile.roles.length > 0 : Boolean(profile[current?.key]);

  const next = async () => {
    if (!canAdvance) return;
    if (!isLast) {
      setStep((value) => value + 1);
      return;
    }
    setLoading(true);
    try {
      await register(
        account.email,
        account.password,
        account.name,
        account.accessCode,
        profile.roles,
        profile
      );
      toast.success("Perguntas concluídas e cadastro enviado. Aguarde a aprovação da gestão para entrar no app.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  if (phase === "account") {
    return (
      <div className="grid lg:grid-cols-2 min-h-screen">
        <div
          className="hidden lg:block relative overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(180deg, transparent 20%, rgba(15,15,13,0.94)), url('/assets/chart-02.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute bottom-7 left-7 flex items-center gap-3">
            <img
              src="/assets/gl-academy-emblem-transparent.png"
              className="w-11 h-11 rounded-md object-contain bg-black/40 p-1"
              alt="GL"
            />
            <div>
              <strong className="text-lg block">GL Academy Sales Training</strong>
              <span className="gl-text-muted text-sm">Seu acesso começa com a aprovação da gestão.</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-12">
          <form onSubmit={openConfiguration} className="w-full max-w-md gl-panel p-7 lg:p-9 gl-fade-in" data-testid="register-form">
            <span className="gl-eyebrow">Solicitar acesso</span>
            <h1 className="text-3xl sm:text-4xl mt-1">Crie o seu cadastro.</h1>
            <p className="gl-text-muted text-sm mt-3">
              Depois destes dados, responda quatro perguntas. A gestão receberá tudo e liberará o acesso após a aprovação.
            </p>

            <div className="mt-6 grid gap-3">
              <Field label="Nome">
                <input
                  required
                  value={account.name}
                  onChange={(event) => setAccount({ ...account, name: event.target.value })}
                  className="gl-input"
                  placeholder="Como podemos te chamar?"
                  data-testid="register-name"
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  required
                  value={account.email}
                  onChange={(event) => setAccount({ ...account, email: event.target.value })}
                  className="gl-input"
                  placeholder="seu@email.com"
                  data-testid="register-email"
                />
              </Field>
              <Field label="Código de acesso da equipe">
                <input
                  value={account.accessCode}
                  onChange={(event) => setAccount({ ...account, accessCode: event.target.value })}
                  className="gl-input"
                  placeholder="Código enviado pela GL Academy"
                  data-testid="register-access-code"
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Senha">
                  <input
                    type="password"
                    required
                    value={account.password}
                    onChange={(event) => setAccount({ ...account, password: event.target.value })}
                    className="gl-input"
                    placeholder="mínimo 8"
                    data-testid="register-password"
                  />
                </Field>
                <Field label="Confirmar senha">
                  <input
                    type="password"
                    required
                    value={account.confirm}
                    onChange={(event) => setAccount({ ...account, confirm: event.target.value })}
                    className="gl-input"
                    placeholder="confirme"
                    data-testid="register-confirm"
                  />
                </Field>
              </div>
              <label className="flex gap-2 items-start text-sm gl-text-muted mt-1">
                <input
                  type="checkbox"
                  checked={account.agree}
                  onChange={(event) => setAccount({ ...account, agree: event.target.checked })}
                  className="mt-1 accent-yellow-500"
                  data-testid="register-agree"
                />
                <span>
                  Li e aceito os <Link to="/termos" className="gl-text-gold font-bold">Termos</Link> e a{" "}
                  <Link to="/privacidade" className="gl-text-gold font-bold">Privacidade</Link>.
                </span>
              </label>
            </div>

            <button type="submit" className="gl-primary-btn w-full mt-5" data-testid="register-submit">
              Continuar para configuração
            </button>
            <div className="mt-5 text-center text-sm gl-text-muted">
              Já enviou o cadastro? <Link to="/login" className="gl-text-gold font-bold">Entrar</Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-10 flex items-center justify-center">
      <div className="w-full max-w-3xl gl-panel p-7 lg:p-10 gl-fade-in" data-testid="registration-onboarding-panel">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <span className="gl-eyebrow">Configuração inicial</span>
          <span className="gl-text-soft text-xs">{step + 1} / {STEPS.length}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl">{current.title}</h1>
        <p className="gl-text-muted text-sm mt-2">{current.help}</p>

        <div className="gl-progress mt-5">
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-6 gl-stagger">
          {current.options.map(([value, label]) => {
            const selected = current.multiple ? profile.roles.includes(value) : profile[current.key] === value;
            return (
              <button
                type="button"
                key={value}
                onClick={() =>
                  setProfile((state) =>
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
                className={`p-4 text-left rounded-md border transition-all duration-150 hover:translate-y-[-1px] ${
                  selected ? "gl-glow-gold" : ""
                }`}
                style={{
                  borderColor: selected ? "rgba(255, 103, 84, 0.64)" : "var(--gl-line)",
                  background: selected ? "rgba(255, 103, 84, 0.12)" : "rgba(245, 247, 246, 0.04)",
                  color: selected ? "var(--gl-gold-2)" : "var(--gl-text)",
                }}
                data-testid={`registration-${current.key}-${value}`}
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
            onClick={() => {
              if (step === 0) setPhase("account");
              else setStep((value) => value - 1);
            }}
            data-testid="registration-back"
          >
            Voltar
          </button>
          <button
            type="button"
            className="gl-primary-btn"
            onClick={next}
            disabled={!canAdvance || loading}
            data-testid="registration-next"
          >
            {loading ? "Enviando..." : isLast ? "Enviar cadastro para aprovação" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="gl-label">{label}</span>
      {children}
    </label>
  );
}

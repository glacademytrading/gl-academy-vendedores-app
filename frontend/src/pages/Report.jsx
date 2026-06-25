import React, { useCallback, useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getUserRoleKeys, ROLE_TRACKS } from "@/lib/glAcademyContent";
import { toast } from "sonner";
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  Handshake,
  ReceiptText,
  Send,
  UserCheck,
  UserRoundSearch,
  XCircle,
} from "lucide-react";

const ROLE_FORM_VALUE = {
  recrutador: "recrutador",
  ativo: "vendedor_ativo",
  tecnico: "vendedor_tecnico",
};

const ROLE_PANEL = {
  recrutador: {
    title: "Painel do Recrutador",
    eyebrow: "Indicação e acompanhamento",
    description:
      "Registre quem você recrutou, qual lead foi trabalhado e por qual vendedor ativo. Sua comissão fica aguardando até o vendedor técnico concluir a venda.",
    commissionType: "comissao_recrutamento",
  },
  ativo: {
    title: "Painel do Vendedor Ativo",
    eyebrow: "Prospecção e passagem do lead",
    description:
      "Registre o lead que você chamou e quem o recrutou. Sua comissão só será liberada quando o vendedor técnico finalizar a venda.",
    commissionType: "comissao_venda_ativa",
  },
  tecnico: {
    title: "Painel do Vendedor Técnico",
    eyebrow: "Análise para aprovação",
    description:
      "Envie o atendimento para a gestão acompanhar e confirmar se o lead foi fechado. A venda só entra como concluída depois da aprovação.",
    commissionType: "comissao_fechamento_tecnico",
  },
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initialActivity(roleKey) {
  return {
    cargo: ROLE_FORM_VALUE[roleKey] || "vendedor_ativo",
    contatos: 0,
    conversas: 0,
    entrevistas: 0,
    propostas: 0,
    gargalo: "",
    prioridade: "",
  };
}

function initialPipeline(roleKey, user) {
  return {
    employee_name: user?.name || "",
    lead_name: "",
    lead_contact_date: today(),
    recruiter_name: roleKey === "recrutador" ? user?.name || "" : "",
    active_seller_name: roleKey === "ativo" ? user?.name || "" : "",
    technical_seller_name: roleKey === "tecnico" ? user?.name || "" : "",
    product_name: "",
    commission_value: "",
    sale_value: "",
    sale_date: today(),
    payment_date: "",
    sale_outcome: "analysis_pending",
    loss_reason: "",
    notes: "",
  };
}

export default function Report() {
  const { user } = useAuth();
  const availableRoles = useMemo(() => {
    const roles = getUserRoleKeys(user);
    return roles.length ? roles : ["ativo"];
  }, [user]);
  const [activeRole, setActiveRole] = useState(() => availableRoles[0]);
  const [activityForm, setActivityForm] = useState(() => initialActivity(availableRoles[0]));
  const [pipelineForm, setPipelineForm] = useState(() => initialPipeline(availableRoles[0], user));
  const [entries, setEntries] = useState([]);
  const [pipelineEntries, setPipelineEntries] = useState([]);
  const [savingActivity, setSavingActivity] = useState(false);
  const [savingPipeline, setSavingPipeline] = useState(false);
  const [showPipelineForm, setShowPipelineForm] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const loadEntries = useCallback(async () => {
    try {
      const [journalResult, commissionResult] = await Promise.all([
        api.get("/journal"),
        api.get("/commissions"),
      ]);
      setEntries(Array.isArray(journalResult.data) ? journalResult.data : []);
      setPipelineEntries(Array.isArray(commissionResult.data) ? commissionResult.data : []);
    } catch (error) {
      toast.error(formatApiError(error));
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!availableRoles.includes(activeRole)) setActiveRole(availableRoles[0]);
  }, [activeRole, availableRoles]);

  useEffect(() => {
    setActivityForm(initialActivity(activeRole));
    setPipelineForm(initialPipeline(activeRole, user));
    setShowPipelineForm(false);
  }, [activeRole, user]);

  const reports = useMemo(
    () => entries.filter((entry) => entry.operacional === "relatorio_diario"),
    [entries]
  );

  const roleEntries = useMemo(
    () =>
      pipelineEntries.filter((entry) => {
        const entryRole = entry.report_role || roleKeyFromCargo(entry.cargo);
        return !entryRole || entryRole === activeRole;
      }),
    [activeRole, pipelineEntries]
  );

  const monthlyEntries = useMemo(
    () =>
      roleEntries.filter((entry) => {
        const referenceDate = entry.sale_date || entry.lead_contact_date || entry.created_at || "";
        return !month || referenceDate.startsWith(month);
      }),
    [month, roleEntries]
  );

  const grouped = useMemo(
    () => ({
      waiting: monthlyEntries.filter((entry) => pipelineGroup(entry) === "waiting"),
      completed: monthlyEntries.filter((entry) => pipelineGroup(entry) === "completed"),
      notCompleted: monthlyEntries.filter((entry) => pipelineGroup(entry) === "not_completed"),
    }),
    [monthlyEntries]
  );

  const approvedTotal = monthlyEntries.reduce(
    (sum, entry) =>
      entry.approval_status === "approved"
        ? sum + Number(entry.commission_value || 0)
        : sum,
    0
  );

  const setActivity = (key, numeric = false) => (event) => {
    const value = numeric ? Number(event.target.value) : event.target.value;
    setActivityForm((current) => ({ ...current, [key]: value }));
  };

  const setPipeline = (key) => (event) => {
    setPipelineForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const submitActivity = async (event) => {
    event.preventDefault();
    setSavingActivity(true);
    try {
      const payload = {
        operacional: "relatorio_diario",
        contexto: `Cargo: ${activityForm.cargo}`,
        zona: `Contatos: ${activityForm.contatos} | Conversas: ${activityForm.conversas} | Entrevistas: ${activityForm.entrevistas}`,
        confluencias: `Propostas: ${activityForm.propostas}`,
        gatilho: activityForm.prioridade,
        stop: activityForm.gargalo,
        alvo: "Acompanhar no próximo alinhamento",
        risco_r: 3,
        resultado_r: Number(activityForm.propostas || 0),
        erro_tecnico: activityForm.gargalo,
        emocional: "",
        licao: `Prioridade de amanhã: ${activityForm.prioridade || "definir com a gestão"}`,
        metadata: {
          type: "daily_report",
          employee_name: user?.name || "",
          cargo: activityForm.cargo,
          report_role: activeRole,
          ...activityForm,
        },
      };
      const response = await api.post("/journal", payload);
      setEntries((current) => [response.data, ...current]);
      setActivityForm(initialActivity(activeRole));
      toast.success("Relatório diário enviado com sucesso.");
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setSavingActivity(false);
    }
  };

  const submitPipeline = async (event) => {
    event.preventDefault();
    if (!pipelineForm.lead_name.trim()) {
      toast.error("Informe o nome do lead.");
      return;
    }
    if (activeRole === "recrutador" && !pipelineForm.active_seller_name.trim()) {
      toast.error("Informe qual vendedor ativo chamou o lead.");
      return;
    }
    if (activeRole === "ativo" && !pipelineForm.recruiter_name.trim()) {
      toast.error("Informe o nome do recrutador responsável.");
      return;
    }
    if (
      activeRole === "tecnico" &&
      (!pipelineForm.recruiter_name.trim() || !pipelineForm.active_seller_name.trim())
    ) {
      toast.error("Informe o recrutador e o vendedor ativo desta venda.");
      return;
    }
    setSavingPipeline(true);
    try {
      const panel = ROLE_PANEL[activeRole];
      const isTechnicalReview = activeRole === "tecnico";
      const payload = {
        ...pipelineForm,
        report_role: activeRole,
        cargo: ROLE_FORM_VALUE[activeRole],
        commission_type: panel.commissionType,
        commission_value: Number(pipelineForm.commission_value || 0),
        sale_value: isTechnicalReview ? 0 : Number(pipelineForm.sale_value || 0),
        client_name: pipelineForm.lead_name,
        employee_name: user?.name || pipelineForm.employee_name,
        workflow_status: isTechnicalReview ? "analysis_pending" : "waiting_technical",
        sale_outcome: isTechnicalReview ? "analysis_pending" : "",
        sale_date: "",
        payment_date: "",
      };
      const response = await api.post("/commissions", payload);
      setPipelineEntries((current) => [response.data, ...current]);
      setPipelineForm(initialPipeline(activeRole, user));
      toast.success(
        activeRole === "tecnico"
          ? "Análise enviada para a gestão confirmar se houve fechamento."
          : "Lead registrado. Agora ele aguarda o fechamento do vendedor técnico."
      );
      await loadEntries();
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setSavingPipeline(false);
    }
  };

  const panel = ROLE_PANEL[activeRole];

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="report-page">
      <header className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow flex items-center gap-2">
          <FileText size={14} /> Relatórios e comissões
        </span>
        <h1 className="text-3xl sm:text-4xl mt-1">Sua parte na esteira de vendas</h1>
        <p className="gl-text-muted text-sm mt-2 max-w-3xl">
          Cada função registra uma etapa. O sistema acompanha o lead desde o recrutamento até o
          fechamento técnico e só libera comissão quando a venda é concluída e aprovada.
        </p>
        <div className="flex flex-wrap gap-2 mt-5" data-testid="report-role-selector">
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              className={activeRole === role ? "gl-primary-btn" : "gl-ghost-btn"}
              onClick={() => setActiveRole(role)}
              data-testid={`report-role-${role}`}
            >
              {ROLE_TRACKS[role]?.shortTitle || role}
            </button>
          ))}
        </div>
      </header>

      <form onSubmit={submitActivity} className="gl-panel p-5 lg:p-6" data-testid="daily-report-form">
        <span className="gl-eyebrow flex items-center gap-2">
          <BadgeDollarSign size={14} /> Preencher e enviar relatório
        </span>
        <h2 className="text-2xl mt-1">Atividade do dia</h2>
        <p className="gl-text-muted text-sm mt-2 max-w-3xl">
          Registre sua rotina normal primeiro. Se também teve lead, venda ou comissão para acompanhar,
          ative a opção abaixo para abrir os dados da venda.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          <Field label="Contatos feitos">
            <input
              type="number"
              min="0"
              className="gl-input"
              value={activityForm.contatos}
              onChange={setActivity("contatos", true)}
            />
          </Field>
          <Field label="Conversas abertas">
            <input
              type="number"
              min="0"
              className="gl-input"
              value={activityForm.conversas}
              onChange={setActivity("conversas", true)}
            />
          </Field>
          <Field label="Entrevistas / reuniões">
            <input
              type="number"
              min="0"
              className="gl-input"
              value={activityForm.entrevistas}
              onChange={setActivity("entrevistas", true)}
            />
          </Field>
          <Field label="Propostas enviadas">
            <input
              type="number"
              min="0"
              className="gl-input"
              value={activityForm.propostas}
              onChange={setActivity("propostas", true)}
            />
          </Field>
          <Field label="Gargalo principal">
            <input
              className="gl-input"
              placeholder="Ex: pouca resposta ou objeção de preço"
              value={activityForm.gargalo}
              onChange={setActivity("gargalo")}
            />
          </Field>
          <Field label="Prioridade de amanhã">
            <input
              className="gl-input"
              placeholder="O que precisa melhorar no próximo dia?"
              value={activityForm.prioridade}
              onChange={setActivity("prioridade")}
            />
          </Field>
        </div>
        <label className="gl-panel-soft p-4 mt-5 flex gap-3 items-start cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={showPipelineForm}
            onChange={(event) => setShowPipelineForm(event.target.checked)}
            data-testid="toggle-pipeline-form"
          />
          <span>
            <strong className="block text-base">
              Tenho uma venda, lead ou comissão para registrar neste relatório
            </strong>
            <span className="gl-text-muted text-sm block mt-1">
              Ative apenas quando houver uma etapa comercial para acompanhar. A comissão continua dependendo do
              fechamento técnico e da aprovação da gestão.
            </span>
          </span>
        </label>
        <div className="flex justify-end mt-5">
          <button type="submit" className="gl-secondary-btn" disabled={savingActivity}>
            <Send size={14} /> {savingActivity ? "Enviando..." : "Enviar relatório diário"}
          </button>
        </div>
      </form>

      {showPipelineForm && (
        <section className="gl-panel p-5 lg:p-6" data-testid="role-pipeline-panel">
        <span className="gl-eyebrow flex items-center gap-2">
          <Handshake size={14} /> {panel.eyebrow}
        </span>
        <h2 className="text-2xl mt-1">{panel.title}</h2>
        <p className="gl-text-muted text-sm mt-2 max-w-3xl">{panel.description}</p>
        <RoleFlow role={activeRole} />

        <form onSubmit={submitPipeline} className="mt-5" data-testid={`pipeline-form-${activeRole}`}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Lead / cliente">
              <input
                required
                className="gl-input"
                placeholder="Nome do lead"
                value={pipelineForm.lead_name}
                onChange={setPipeline("lead_name")}
              />
            </Field>
            {activeRole !== "tecnico" && (
              <Field label="Data em que o lead foi chamado">
                <input
                  required
                  type="date"
                  className="gl-input"
                  value={pipelineForm.lead_contact_date}
                  onChange={setPipeline("lead_contact_date")}
                />
              </Field>
            )}
            {(activeRole === "ativo" || activeRole === "tecnico") && (
              <Field label="Recrutador responsável">
                <input
                  required
                  className="gl-input"
                  placeholder="Nome do recrutador"
                  value={pipelineForm.recruiter_name}
                  onChange={setPipeline("recruiter_name")}
                />
              </Field>
            )}
            {(activeRole === "recrutador" || activeRole === "tecnico") && (
              <Field label="Vendedor ativo que chamou o lead">
                <input
                  required
                  className="gl-input"
                  placeholder="Nome do vendedor ativo"
                  value={pipelineForm.active_seller_name}
                  onChange={setPipeline("active_seller_name")}
                />
              </Field>
            )}
            {activeRole !== "tecnico" && (
              <Field label="Vendedor técnico responsável">
                <input
                  className="gl-input"
                  placeholder="Pode ser definido depois"
                  value={pipelineForm.technical_seller_name}
                  onChange={setPipeline("technical_seller_name")}
                />
              </Field>
            )}
            <Field label="Produto de interesse">
              <input
                className="gl-input"
                placeholder="Ex.: GL Model TradingView"
                value={pipelineForm.product_name}
                onChange={setPipeline("product_name")}
              />
            </Field>
            <Field label="Valor previsto da sua comissão">
              <input
                type="number"
                min="0"
                step="0.01"
                className="gl-input"
                placeholder="0,00"
                value={pipelineForm.commission_value}
                onChange={setPipeline("commission_value")}
              />
            </Field>

            {activeRole === "tecnico" && (
              <div className="gl-panel-soft p-4 sm:col-span-2 lg:col-span-3 text-sm gl-text-muted">
                Envie esta análise para a gestão conferir o atendimento, validar o fechamento e
                devolver a resposta final para a cadeia de comissão.
              </div>
            )}
            <Field label="Observações">
              <input
                className="gl-input"
                placeholder="Detalhes importantes para a gestão"
                value={pipelineForm.notes}
                onChange={setPipeline("notes")}
              />
            </Field>
          </div>
          <div className="flex justify-end mt-5">
            <button type="submit" className="gl-primary-btn" disabled={savingPipeline}>
              <Send size={14} />
              {savingPipeline
                ? "Enviando..."
                : activeRole === "tecnico"
                  ? "Enviar análise para aprovação da gestão"
                  : "Registrar lead e acompanhar"}
            </button>
          </div>
        </form>
        </section>
      )}

      <section className="gl-panel p-5 lg:p-6" data-testid="pipeline-history">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="gl-eyebrow flex items-center gap-2">
              <ReceiptText size={14} /> Histórico do {ROLE_TRACKS[activeRole]?.shortTitle}
            </span>
            <h2 className="text-2xl mt-1">Acompanhamento de leads e comissões</h2>
          </div>
          <Field label="Mês de referência">
            <input
              type="month"
              className="gl-input min-w-[190px]"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          <Summary label="Aguardando fechamento técnico" value={grouped.waiting.length} />
          <Summary label="Vendas finalizadas" value={grouped.completed.length} />
          <Summary label="Não finalizadas / sem comissão" value={grouped.notCompleted.length} />
          <Summary label="Comissão aprovada no mês" value={currency.format(approvedTotal)} />
        </div>
        <HistoryGroup
          icon={Clock3}
          title="Aguardando fechamento técnico"
          empty="Nenhum lead aguardando fechamento neste mês."
          entries={grouped.waiting}
        />
        <HistoryGroup
          icon={CheckCircle2}
          title="Vendas finalizadas"
          empty="Nenhuma venda finalizada neste mês."
          entries={grouped.completed}
        />
        <HistoryGroup
          icon={XCircle}
          title="Vendas não finalizadas — sem comissão"
          empty="Nenhuma venda não finalizada neste mês."
          entries={grouped.notCompleted}
        />
      </section>

      <section className="gl-panel p-5 lg:p-6" data-testid="report-wall">
        <span className="gl-eyebrow flex items-center gap-2">
          <ClipboardList size={14} /> Mural de relatórios enviados
        </span>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
          {reports.length === 0 ? (
            <EmptyState text="Nenhum relatório diário enviado ainda." />
          ) : (
            reports.map((entry) => <ReportCard key={entry.id} entry={entry} />)
          )}
        </div>
      </section>
    </div>
  );
}

function RoleFlow({ role }) {
  const text =
    role === "recrutador"
      ? "Você registra o vendedor ativo e o lead → o técnico informa o resultado → a gestão aprova a comissão."
      : role === "ativo"
        ? "Você registra o lead contatado → o técnico tenta fechar → a gestão aprova a comissão se houver venda."
        : "Você envia a análise do atendimento → a gestão confirma se houve fechamento → o sistema atualiza a cadeia.";
  return (
    <div className="gl-panel-soft p-4 mt-4 text-sm">
      <strong className="gl-text-gold">Como este painel funciona</strong>
      <p className="gl-text-muted mt-1">{text}</p>
    </div>
  );
}

function HistoryGroup({ icon: Icon, title, empty, entries }) {
  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-lg">
        <Icon size={17} className="gl-text-gold" /> {title}
      </h3>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
        {entries.length === 0 ? (
          <EmptyState text={empty} />
        ) : (
          entries.map((entry) => <PipelineCard key={entry.id} entry={entry} />)
        )}
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

function Summary({ label, value }) {
  return (
    <div className="gl-panel-soft p-4">
      <span className="gl-text-soft text-xs">{label}</span>
      <strong className="block text-2xl mt-1 gl-text-gold">{value}</strong>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="gl-panel-soft p-5 gl-text-muted text-sm">{text}</div>;
}

function ReportCard({ entry }) {
  const data = entry.metadata || {};
  const roleKey = data.report_role || roleKeyFromCargo(data.cargo);
  return (
    <article className="gl-panel-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="gl-tag gl-tag-gold">
          {ROLE_TRACKS[roleKey]?.shortTitle || "Colaborador"}
        </span>
        <span className="gl-text-soft text-xs">{formatDate(entry.created_at)}</span>
      </div>
      <strong className="block mt-3">{data.employee_name || "Colaborador"}</strong>
      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <ReportNumber label="Contatos" value={data.contatos ?? "-"} />
        <ReportNumber label="Conversas" value={data.conversas ?? "-"} />
        <ReportNumber label="Entrevistas" value={data.entrevistas ?? "-"} />
        <ReportNumber label="Propostas" value={data.propostas ?? entry.resultado_r ?? "-"} />
      </div>
      <p className="gl-text-muted text-sm mt-3">
        <strong>Gargalo:</strong> {data.gargalo || entry.erro_tecnico || "Não informado"}
      </p>
      <p className="gl-text-muted text-sm mt-1">
        <strong>Próxima prioridade:</strong>{" "}
        {data.prioridade || entry.gatilho || "Não informada"}
      </p>
    </article>
  );
}

function ReportNumber({ label, value }) {
  return (
    <div>
      <span className="gl-text-soft text-xs">{label}</span>
      <strong className="block">{value}</strong>
    </div>
  );
}

function PipelineCard({ entry }) {
  const role = entry.report_role || roleKeyFromCargo(entry.cargo);
  return (
    <article className="gl-panel-soft p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="gl-tag gl-tag-gold">
          {ROLE_TRACKS[role]?.shortTitle || "Comissão"}
        </span>
        <span className={`gl-tag ${pipelineStatusClass(entry)}`}>{pipelineStatus(entry)}</span>
      </div>
      <strong className="block text-xl mt-3">
        {entry.lead_name || entry.client_name || "Lead não informado"}
      </strong>
      <p className="gl-text-muted text-sm mt-1">
        {entry.product_name || "Produto ainda não definido"}
      </p>
      <div className="grid gap-2 mt-4 text-sm">
        <InfoLine
          icon={UserRoundSearch}
          label="Recrutador"
          value={entry.recruiter_name || (role === "recrutador" ? entry.employee_name : "")}
        />
        <InfoLine
          icon={UserCheck}
          label="Vendedor ativo"
          value={entry.active_seller_name || (role === "ativo" ? entry.employee_name : "")}
        />
        <InfoLine
          icon={Handshake}
          label="Vendedor técnico"
          value={entry.technical_seller_name || (role === "tecnico" ? entry.employee_name : "")}
        />
        <InfoLine
          icon={CalendarDays}
          label={entry.workflow_status === "waiting_technical" ? "Lead chamado em" : "Enviado em"}
          value={formatDate(entry.sale_date || entry.lead_contact_date)}
        />
        <InfoLine
          icon={CircleDollarSign}
          label="Sua comissão"
          value={currency.format(Number(entry.commission_value || 0))}
        />
      </div>
      {Number(entry.sale_value || 0) > 0 && (
        <p className="gl-text-muted text-sm mt-3">
          <strong>Valor da venda:</strong> {currency.format(Number(entry.sale_value || 0))}
        </p>
      )}
      {entry.loss_reason && (
        <p className="gl-text-muted text-sm mt-3">
          <strong>Motivo:</strong> {entry.loss_reason}
        </p>
      )}
      {entry.notes && <p className="gl-text-soft text-xs mt-3">{entry.notes}</p>}
      {entry.admin_reason && (
        <p className="gl-text-soft text-xs mt-2">Gestão: {entry.admin_reason}</p>
      )}
    </article>
  );
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 gl-text-muted">
      <Icon size={14} className="gl-text-gold shrink-0" />
      <span>
        <strong>{label}:</strong> {value || "A definir"}
      </span>
    </div>
  );
}

function pipelineGroup(entry) {
  if (
    entry.workflow_status === "sale_not_completed" ||
    entry.approval_status === "not_eligible"
  ) {
    return "not_completed";
  }
  if (
    entry.workflow_status === "sale_completed" ||
    ["approved", "rejected"].includes(entry.approval_status)
  ) {
    return "completed";
  }
  return "waiting";
}

function pipelineStatus(entry) {
  if (
    entry.workflow_status === "sale_not_completed" ||
    entry.approval_status === "not_eligible"
  ) {
    return "Venda não finalizada · sem comissão";
  }
  if (entry.approval_status === "approved") return "Comissão aprovada";
  if (entry.approval_status === "rejected") return "Comissão recusada";
  if (entry.workflow_status === "sale_completed") {
    return "Venda finalizada · aguardando gestão";
  }
  if (entry.approval_status === "pending") return "Análise enviada · aguardando gestão";
  return "Aguardando fechamento técnico";
}

function pipelineStatusClass(entry) {
  if (entry.approval_status === "approved") return "gl-tag-green";
  if (
    entry.approval_status === "rejected" ||
    entry.approval_status === "not_eligible" ||
    entry.workflow_status === "sale_not_completed"
  ) {
    return "gl-tag-red";
  }
  return "gl-tag-gold";
}

function roleKeyFromCargo(cargo) {
  if (cargo === "recrutador") return "recrutador";
  if (cargo === "vendedor_tecnico") return "tecnico";
  if (cargo === "vendedor_ativo") return "ativo";
  return "";
}

function formatDate(value) {
  if (!value || value === "a definir") return "A definir";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

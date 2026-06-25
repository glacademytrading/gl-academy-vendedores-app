import React, { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Handshake,
  RefreshCw,
  UserCheck,
  UserRoundSearch,
  UserX,
} from "lucide-react";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function CommissionApproval() {
  const [data, setData] = useState({ requests: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/commissions");
      setData(response.data || { requests: [], stats: {} });
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requests = useMemo(() => {
    const order = {
      pending: 0,
      waiting_technical: 1,
      approved: 2,
      not_eligible: 3,
      rejected: 4,
    };
    return [...(data.requests || [])].sort(
      (a, b) => (order[a.approval_status] ?? 5) - (order[b.approval_status] ?? 5)
    );
  }, [data.requests]);

  const decide = async (request, action) => {
    setBusy(`${action}:${request.id}`);
    try {
      await api.post(`/admin/commissions/${request.id}/${action}`, { reason });
      toast.success(
        action === "approve"
          ? "Toda a cadeia de comissões foi aprovada."
          : "A cadeia de comissões foi recusada."
      );
      setReason("");
      await load();
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="grid gap-4" data-testid="commission-approval-tab">
      <div className="gl-panel p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="gl-eyebrow flex items-center gap-2">
              <BadgeDollarSign size={14} /> Gestão da esteira e comissões
            </span>
            <h2 className="text-2xl mt-1">Acompanhar cada etapa da venda</h2>
            <p className="gl-text-muted text-sm mt-2 max-w-3xl">
              Veja quem recrutou, quem chamou o lead e quais análises foram enviadas para a gestão.
              A aprovação libera de uma vez os registros vinculados à mesma cadeia.
            </p>
          </div>
          <button className="gl-ghost-btn" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          <Stat
            icon={Clock3}
            label="Aguardando vendedor técnico"
            value={data.stats?.waiting_technical || 0}
            tone="gold"
          />
          <Stat
            icon={Handshake}
            label="Análises aguardando aprovação"
            value={data.stats?.pending || 0}
            tone="gold"
          />
          <Stat
            icon={CheckCircle2}
            label="Comissões aprovadas"
            value={data.stats?.approved || 0}
            tone="green"
          />
          <Stat
            icon={UserX}
            label="Não finalizadas / recusadas"
            value={data.stats?.not_completed || 0}
            tone="red"
          />
        </div>
      </div>

      <div className="gl-panel p-4">
        <label className="grid gap-1.5">
          <span className="gl-label">Observação da aprovação ou recusa</span>
          <textarea
            className="gl-input gl-textarea"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: venda confirmada no checkout, valor corrigido ou comprovante pendente."
          />
        </label>
      </div>

      <div className="grid gap-3">
        {!loading && requests.length === 0 && (
          <div className="gl-panel p-5 text-sm gl-text-muted">
            Nenhum registro de lead ou comissão enviado.
          </div>
        )}
        {requests.map((request) => (
          <article key={request.id} className="gl-panel p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex gap-2 items-center flex-wrap">
                  <strong>{request.employee_name || "Colaborador"}</strong>
                  <Status status={request.approval_status} />
                </div>
                <div className="text-xs gl-text-soft mt-1">{request.user_email}</div>
                <div className="text-2xl gl-text-gold font-bold mt-3">
                  {currency.format(Number(request.commission_value || 0))}
                </div>
                <p className="gl-text-muted text-sm mt-1">
                  {request.lead_name || request.client_name || "Lead não informado"} ·{" "}
                  {request.product_name || "Produto ainda não definido"}
                </p>
              </div>
              {request.approval_status === "pending" && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="gl-secondary-btn"
                    disabled={busy.includes(request.id)}
                    onClick={() => decide(request, "approve")}
                  >
                    <CheckCircle2 size={14} /> Aprovar cadeia
                  </button>
                  <button
                    className="gl-ghost-btn"
                    disabled={busy.includes(request.id)}
                    onClick={() => decide(request, "reject")}
                  >
                    <UserX size={14} /> Recusar cadeia
                  </button>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4 text-sm">
              <Info
                label="Painel de origem"
                value={roleLabel(request.report_role || request.cargo)}
              />
              <Info
                label="Situação da análise"
                value={workflowLabel(request.workflow_status, request.approval_status)}
              />
              <Info
                label="Valor da venda"
                value={currency.format(Number(request.sale_value || 0))}
              />
              <Info label="Data da venda" value={formatDate(request.sale_date)} />
              <Info
                label="Comissão deste colaborador"
                value={currency.format(Number(request.commission_value || 0))}
              />
              <Info label="Lead chamado em" value={formatDate(request.lead_contact_date)} />
              <Info label="Enviado em" value={formatDate(request.created_at)} />
              <Info label="Aprovado por" value={request.approved_by} />
            </div>

            <div className="mt-4">
              <span className="gl-eyebrow">Cadeia de responsáveis</span>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 text-sm">
                <Info
                  icon={UserRoundSearch}
                  label="Recrutador"
                  value={
                    request.recruiter_name ||
                    (request.report_role === "recrutador" ? request.employee_name : "")
                  }
                />
                <Info
                  icon={UserCheck}
                  label="Vendedor ativo"
                  value={
                    request.active_seller_name ||
                    (request.report_role === "ativo" ? request.employee_name : "")
                  }
                />
                <Info
                  icon={Handshake}
                  label="Vendedor técnico"
                  value={
                    request.technical_seller_name ||
                    (request.report_role === "tecnico" ? request.employee_name : "")
                  }
                />
              </div>
            </div>

            {(request.notes || request.admin_reason || request.loss_reason) && (
              <div className="gl-panel-soft p-3 mt-3 text-sm grid gap-1">
                {request.loss_reason && (
                  <p>
                    <strong>Motivo da venda não finalizada:</strong> {request.loss_reason}
                  </p>
                )}
                {request.notes && (
                  <p>
                    <strong>Colaborador:</strong> {request.notes}
                  </p>
                )}
                {request.admin_reason && (
                  <p>
                    <strong>Gestão:</strong> {request.admin_reason}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function Status({ status }) {
  const config = {
    approved: ["Aprovada", "gl-tag-green"],
    rejected: ["Recusada", "gl-tag-red"],
    not_eligible: ["Não finalizada · sem comissão", "gl-tag-red"],
    waiting_technical: ["Aguardando vendedor técnico", "gl-tag-gold"],
    pending: ["Análise enviada · conferir", "gl-tag-gold"],
  }[status] || ["Aguardando vendedor técnico", "gl-tag-gold"];
  return <span className={`gl-tag ${config[1]}`}>{config[0]}</span>;
}

function Stat({ icon: Icon, label, value, tone }) {
  const color =
    tone === "green" ? "gl-text-green" : tone === "red" ? "gl-text-red" : "gl-text-gold";
  return (
    <div className="gl-panel-soft p-4">
      <div className="flex items-center gap-2 text-xs gl-text-soft">
        <Icon size={14} /> {label}
      </div>
      <strong className={`block text-2xl mt-1 ${color}`}>{value}</strong>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="gl-panel-soft p-3">
      <span className="text-[10px] uppercase tracking-wider gl-text-soft flex items-center gap-1">
        {Icon && <Icon size={12} />} {label}
      </span>
      <strong className="block text-sm mt-1">{value || "Não informado"}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "A definir";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function roleLabel(role) {
  if (role === "recrutador") return "Recrutador";
  if (role === "tecnico" || role === "vendedor_tecnico") return "Vendedor Técnico";
  if (role === "ativo" || role === "vendedor_ativo") return "Vendedor Ativo";
  return role || "Não informado";
}

function workflowLabel(workflow, approval) {
  if (workflow === "sale_not_completed" || approval === "not_eligible") {
    return "Venda não finalizada";
  }
  if (
    workflow === "sale_completed" ||
    ["pending", "approved", "rejected"].includes(approval)
  ) {
    return workflow === "sale_completed" ? "Venda finalizada" : "Análise enviada para gestão";
  }
  return "Aguardando fechamento técnico";
}

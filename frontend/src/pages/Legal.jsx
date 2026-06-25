import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Legal({ type = "terms" }) {
  const location = useLocation();
  const isPrivacy = type === "privacy" || location.pathname.includes("privacidade");

  return (
    <div className="min-h-screen px-5 py-8 lg:px-10" style={{ background: "var(--gl-bg)" }}>
      <main className="max-w-4xl mx-auto grid gap-5 gl-fade-in">
        <Link to="/login" className="gl-ghost-btn w-fit">Voltar</Link>
        <section className="gl-panel p-6 lg:p-8">
          <span className="gl-eyebrow">GL Academy Sales Training</span>
          <h1 className="text-3xl sm:text-4xl mt-1">
            {isPrivacy ? "Política de privacidade" : "Termos de uso interno"}
          </h1>
          {isPrivacy ? <Privacy /> : <Terms />}
        </section>
      </main>
    </div>
  );
}

function Terms() {
  return (
    <div className="grid gap-4 mt-5 text-sm gl-text-muted leading-relaxed">
      <p>
        O GL Academy Sales Training é um ambiente interno de formação, alinhamento e gestão para colaboradores da GL Academy.
        O acesso é pessoal e deve ser utilizado exclusivamente para atividades autorizadas pela empresa.
      </p>
      <Block title="Uso adequado">
        O colaborador deve usar o app para estudar sua função, realizar questionários, consultar materiais,
        registrar atividades e prestar contas dos resultados solicitados pela gestão.
      </Block>
      <Block title="Confidencialidade">
        Scripts, preços, campanhas, materiais, dados de leads, candidatos, clientes e relatórios internos não podem
        ser compartilhados fora dos canais autorizados.
      </Block>
      <Block title="Acesso e conta">
        O acesso pode depender de código, aprovação manual ou vínculo ativo com a equipe. A GL Academy pode suspender
        contas compartilhadas, usadas indevidamente ou de pessoas que não façam mais parte da operação.
      </Block>
      <Block title="Conduta comercial">
        Nenhum colaborador deve prometer lucro, resultado financeiro, aprovação ou desempenho garantido. Produtos e
        condições devem ser apresentados de forma verdadeira e confirmados antes do envio do checkout.
      </Block>
      <Block title="Propriedade intelectual">
        Aulas, roteiros, questionários, imagens, processos e materiais do aplicativo pertencem à GL Academy, salvo
        conteúdos de terceiros devidamente identificados.
      </Block>
      <p className="text-xs gl-text-soft">
        Documento operacional. Recomenda-se revisão jurídica antes de ampliar o uso para contratos ou políticas formais.
      </p>
    </div>
  );
}

function Privacy() {
  return (
    <div className="grid gap-4 mt-5 text-sm gl-text-muted leading-relaxed">
      <p>
        Coletamos os dados necessários para operar o treinamento e a gestão: nome, e-mail, cargo, progresso,
        respostas, relatórios, registros disciplinares e eventos de acesso.
      </p>
      <Block title="Finalidade">
        Os dados são usados para autenticação, acompanhamento de onboarding, liberação de aulas, análise de desempenho,
        gestão de metas e suporte ao colaborador.
      </Block>
      <Block title="Dados comerciais">
        Relatórios podem conter informações de contatos, entrevistas, reuniões, propostas e vendas. Não inclua senhas,
        documentos pessoais ou dados financeiros desnecessários.
      </Block>
      <Block title="Compartilhamento">
        Os dados não devem ser vendidos. Eles podem ser processados por serviços essenciais de hospedagem, banco de dados,
        e-mail, comunicação e suporte utilizados pela GL Academy.
      </Block>
      <Block title="Exclusão de conta">
        A exclusão remove o acesso e os dados associados conforme a política interna e as obrigações legais aplicáveis.
        Relatórios empresariais podem precisar ser preservados quando houver obrigação legítima.
      </Block>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div className="gl-panel-soft p-4">
      <strong className="block text-base gl-text-gold mb-1">{title}</strong>
      <p>{children}</p>
    </div>
  );
}

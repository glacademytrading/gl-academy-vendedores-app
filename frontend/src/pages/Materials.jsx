import React from "react";
import { ArrowRight, BookOpen, Download, FileText, MessageCircle, MessagesSquare, NotebookPen, ShieldCheck } from "lucide-react";
import { STUDENT_MATERIALS, SUPPORT_LINKS, getRoleTracks, getUserRoleKey } from "@/lib/glAcademyContent";
import { smartPt } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const MATERIAL_FLOW = [
  {
    title: "Comece pelo guia",
    body: "Entenda rotina, metas, relatorio, cultura e canais antes de acelerar a execucao.",
    icon: BookOpen,
  },
  {
    title: "Use o playbook do cargo",
    body: "Recrutador, Vendedor Ativo e Vendedor Tecnico tem responsabilidades e scripts diferentes.",
    icon: FileText,
  },
  {
    title: "Registre a pratica",
    body: "Depois de executar, preencha Diario e Relatorio para transformar atividade em gestao.",
    icon: NotebookPen,
  },
];

export default function Materials() {
  const { user } = useAuth();
  const roleKey = getUserRoleKey(user);
  const roles = getRoleTracks(user);
  const firstAccess = STUDENT_MATERIALS.filter((item) => ["Comece aqui", "Consulta rapida", "GL Academy"].includes(item.stage));
  const roleMaterials = STUDENT_MATERIALS.filter((item) => {
    if (["Comece aqui", "Consulta rapida", "GL Academy"].includes(item.stage)) return false;
    if (roleKey === "gestao") return true;
    return roles.some((role) => item.id === role.materialId);
  });

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="materials-page">
      <section
        className="grid lg:grid-cols-[1.25fr_minmax(280px,0.75fr)] gap-5 p-5 lg:p-7 rounded-md overflow-hidden relative"
        style={{
          border: "1px solid var(--gl-line)",
          background:
            "radial-gradient(circle at 12% 10%, rgba(20, 154, 118, 0.15), transparent 28%), radial-gradient(circle at 92% 0%, rgba(216, 180, 92, 0.12), transparent 26%), linear-gradient(135deg, rgba(32,32,24,0.97), rgba(10,12,10,0.98))",
        }}
      >
        <div>
          <span className="gl-eyebrow">Materiais da equipe</span>
          <h1 className="text-3xl sm:text-4xl mt-1">Playbooks, scripts e banco de objecoes.</h1>
          <p className="gl-text-muted text-sm mt-3 max-w-2xl">
            Esta página mostra os arquivos gerais e o playbook liberado para a sua função.
          </p>
          <div className="flex gap-2 flex-wrap mt-4">
            <a href="#downloads" className="gl-primary-btn">
              Ver downloads <ArrowRight size={14} />
            </a>
            <a href={SUPPORT_LINKS.whatsapp} target="_blank" rel="noreferrer" className="gl-ghost-btn">
              <MessageCircle size={14} /> Suporte/RH
            </a>
          </div>
        </div>
        <div className="grid gap-3">
          {MATERIAL_FLOW.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="gl-panel-soft p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="grid w-9 h-9 place-items-center rounded-md font-bold"
                    style={{ border: "1px solid rgba(240,207,122,0.55)", color: "var(--gl-gold-2)" }}
                  >
                    {index + 1}
                  </div>
                  <Icon size={16} className="gl-text-gold" />
                  <strong className="text-sm">{step.title}</strong>
                </div>
                <p className="gl-text-muted text-sm mt-2">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow">Consulta rapida</span>
        <h2 className="text-2xl mt-1">Baixe estes primeiro</h2>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          {firstAccess.map((item) => (
            <MaterialCard key={item.id} item={item} featured />
          ))}
        </div>
      </section>

      <section id="downloads" className="gl-panel p-5 lg:p-6" data-testid="student-material-downloads">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="gl-eyebrow">Playbooks por cargo</span>
            <h2 className="text-2xl mt-1">Downloads operacionais</h2>
            <p className="gl-text-muted text-sm mt-2 max-w-2xl">
              Use o material do seu cargo junto com as aulas e atualize o banco de objecoes quando surgir uma trava nova.
            </p>
          </div>
          <a href={SUPPORT_LINKS.discord} target="_blank" rel="noreferrer" className="gl-ghost-btn">
            <MessagesSquare size={14} /> Sala de Vendas
          </a>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-5 gl-stagger">
          {roleMaterials.map((item) => (
            <MaterialCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="gl-panel p-5 lg:p-6">
        <span className="gl-eyebrow">Uso correto</span>
        <h2 className="text-2xl mt-1">Como transformar material em performance</h2>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <PracticeCard icon={ShieldCheck} title="Nao pule o script" body="Execute o playbook antes de inventar sua propria abordagem." />
          <PracticeCard icon={NotebookPen} title="Registre a pratica" body="Cada conversa, entrevista ou proposta precisa virar aprendizado mensuravel." />
          <PracticeCard icon={BookOpen} title="Revise antes do quiz" body="Se uma pergunta ficou confusa, volte ao playbook correspondente." />
        </div>
      </section>
    </div>
  );
}

function MaterialCard({ item, featured = false }) {
  return (
    <a
      href={item.href}
      download
      className={`gl-panel-soft p-4 block transition hover:translate-y-[-1px] ${featured ? "ring-1 ring-[rgba(240,207,122,0.32)]" : ""}`}
      data-testid={`material-${item.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="gl-tag gl-tag-gold mb-2">{smartPt(item.stage)}</span>
          <strong className="block text-base">{smartPt(item.title)}</strong>
        </div>
        <Download size={16} className="gl-text-green shrink-0 mt-1" />
      </div>
      <p className="gl-text-muted text-sm mt-2 leading-relaxed">{smartPt(item.description)}</p>
    </a>
  );
}

function PracticeCard({ icon: Icon, title, body }) {
  return (
    <div className="gl-panel-soft p-4">
      <Icon size={18} className="gl-text-gold" />
      <strong className="block mt-3 text-base">{title}</strong>
      <p className="gl-text-muted text-sm mt-2">{body}</p>
    </div>
  );
}

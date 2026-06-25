import React from "react";
import { Copy, ExternalLink, Link2, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { IMPORTANT_LINKS } from "@/lib/glAcademyContent";

const SECTIONS = [
  {
    key: "recruitment",
    eyebrow: "Recrutamento",
    title: "Formulários e entrevistas",
    description: "Links que os colaboradores devem preencher antes de iniciar a entrevista com a equipe.",
  },
  {
    key: "institutional",
    eyebrow: "Acesso rápido",
    title: "Canais oficiais e contatos",
    description: "Site, comunidade, redes sociais e contato direto com a equipe.",
  },
  {
    key: "international",
    eyebrow: "Pagamentos internacionais",
    title: "Checkouts Stripe",
    description: "Links para clientes que realizarão o pagamento internacional.",
  },
  {
    key: "national",
    eyebrow: "Pagamentos nacionais",
    title: "Checkouts Mercado Pago",
    description: "Links identificados pelo produto e pela condição exibida no checkout.",
  },
];

export default function ImportantLinks() {
  const copyLink = async (item) => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success(`Link copiado: ${item.title}`);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Abra o link e copie pela barra do navegador.");
    }
  };

  return (
    <div className="grid gap-5 gl-fade-in" data-testid="important-links-page">
      <header className="gl-panel p-6 lg:p-8">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div>
            <span className="gl-eyebrow flex items-center gap-2"><Link2 size={14} /> GL Academy</span>
            <h1 className="text-3xl sm:text-4xl mt-1">Links importantes</h1>
            <p className="gl-text-muted text-sm mt-3 max-w-3xl">
              Central rápida para copiar canais oficiais e checkouts corretos sem precisar procurar em conversas antigas.
            </p>
          </div>
          <div className="gl-panel-soft p-4 max-w-sm">
            <strong className="text-sm flex items-center gap-2"><ShieldCheck size={16} className="gl-text-gold" /> Conferência comercial</strong>
            <p className="gl-text-muted text-xs mt-2">
              Confirme produto, plano, moeda e valor com o cliente antes de enviar qualquer checkout.
            </p>
          </div>
        </div>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.key} className="gl-panel p-5 lg:p-6" data-testid={`links-section-${section.key}`}>
          <span className="gl-eyebrow">{section.eyebrow}</span>
          <h2 className="text-2xl mt-1">{section.title}</h2>
          <p className="gl-text-muted text-sm mt-2">{section.description}</p>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
            {IMPORTANT_LINKS[section.key].map((item) => (
              <article key={item.id} className="gl-panel-soft p-4 flex flex-col" data-testid={`important-link-${item.id}`}>
                <strong className="text-base leading-snug">{item.title}</strong>
                <p className="gl-text-muted text-sm mt-2 flex-1">{item.description}</p>
                {item.warning && (
                  <p className="text-xs mt-3 flex gap-2" style={{ color: "var(--gl-gold-2)" }}>
                    <TriangleAlert size={14} className="shrink-0 mt-0.5" /> {item.warning}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button type="button" className="gl-ghost-btn !px-3" onClick={() => copyLink(item)}>
                    <Copy size={14} /> Copiar
                  </button>
                  <a href={item.url} target="_blank" rel="noreferrer" className="gl-secondary-btn !px-3">
                    Abrir <ExternalLink size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

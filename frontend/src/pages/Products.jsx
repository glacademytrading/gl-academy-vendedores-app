import React from "react";
import {
  PRODUCTS,
  SUPPORT_LINKS,
} from "@/lib/glAcademyContent";
import {
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

export default function Products() {
  const glModelProducts = PRODUCTS.filter((product) => product.category === "gl-model");
  const diverseProducts = PRODUCTS.filter((product) => product.category === "diversos");

  return (
    <div className="grid gap-6 gl-fade-in" data-testid="products-page">
      <section className="gl-product-hero">
        <div className="gl-product-hero-copy">
          <span className="gl-eyebrow flex items-center gap-2">
            <ShoppingBag size={14} /> Catálogo comercial
          </span>
          <h1>Produtos oficiais da GL Academy</h1>
          <p>
            Consulte o produto certo, entenda o encaixe e confirme a condição vigente antes de apresentar a oferta ao cliente.
          </p>
          <div className="flex gap-2 flex-wrap mt-5">
            <a href={SUPPORT_LINKS.website} target="_blank" rel="noreferrer" className="gl-primary-btn">
              Site oficial <ExternalLink size={14} />
            </a>
            <a href={SUPPORT_LINKS.whatsapp} target="_blank" rel="noreferrer" className="gl-ghost-btn">
              Confirmar condição <MessageCircle size={14} />
            </a>
          </div>
        </div>

        <div className="gl-product-spotlight">
          <span className="gl-tag gl-tag-gold">
            <Sparkles size={12} /> Foco principal da equipe
          </span>
          <h2>GL Model</h2>
          <p>
            Produto central com quatro opções de venda: anual e vitalício para NinjaTrader e TradingView.
          </p>
          <div className="grid gap-2 mt-4">
            <div className="gl-product-include"><CheckCircle2 size={14} /> Leitura institucional</div>
            <div className="gl-product-include"><CheckCircle2 size={14} /> Versões por plataforma</div>
            <div className="gl-product-include"><CheckCircle2 size={14} /> Planos anuais e vitalícios</div>
          </div>
        </div>
      </section>

      <ProductSection
        eyebrow="Produto principal"
        title="Produtos que vocês irão vender"
        description="O GL Model é o produto central desta equipe. Compare as quatro opções oficiais antes de orientar o cliente."
        products={glModelProducts}
        testId="main-products"
      />

      <ProductSection
        eyebrow="Ecossistema GL Academy"
        title="Produtos diversos"
        description="Demais tecnologias, serviços e infoprodutos apresentados no site oficial da GL Academy."
        products={diverseProducts}
        testId="diverse-products"
      />

      <section className="gl-product-footer">
        <div>
          <span className="gl-eyebrow flex items-center gap-2">
            <ShieldCheck size={14} /> Venda responsável
          </span>
          <h2>Confirme plataforma, perfil e condição.</h2>
          <p>
            Não prometa resultado financeiro. Explique o produto, valide o encaixe e confirme preço e disponibilidade no canal oficial.
          </p>
        </div>
        <a href={SUPPORT_LINKS.whatsapp} target="_blank" rel="noreferrer" className="gl-secondary-btn">
          Falar com suporte <MessageCircle size={14} />
        </a>
      </section>
    </div>
  );
}

function ProductSection({ eyebrow, title, description, products, testId }) {
  return (
    <section className="grid gap-4" data-testid={testId}>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="gl-eyebrow flex items-center gap-2">
            <PackageCheck size={14} /> {eyebrow}
          </span>
          <h2 className="text-3xl mt-1">{title}</h2>
          <p className="gl-text-muted text-sm mt-2 max-w-3xl">{description}</p>
        </div>
        <span className="gl-tag gl-tag-gold">{products.length} produtos</span>
      </div>
      <div className={`grid gap-4 gl-stagger ${
        products.some((product) => product.compact)
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "md:grid-cols-2"
      }`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }) {
  return (
    <article
      className={`gl-product-card ${product.featured ? "featured" : ""} ${product.compact ? "compact" : ""}`}
      data-testid={`product-${product.id}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="gl-tag gl-tag-gold">{product.badge}</span>
        {product.featured && <span className="gl-tag gl-tag-green">GL Model</span>}
      </div>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="gl-product-price">
        <strong>{product.price}</strong>
        <small>{product.installments}</small>
        <span>{product.installmentValue}</span>
      </div>
      {!product.compact && (
        <div className="grid gap-2 mt-4">
          {(product.includes || []).map((item) => (
            <div key={item} className="gl-product-include">
              <CheckCircle2 size={14} /> <span>{item}</span>
            </div>
          ))}
        </div>
      )}
      {product.note && <div className="gl-product-note">{product.note}</div>}
      <div className={`grid gap-2 ${product.compact ? "mt-4" : "mt-5"}`}>
        <a href={product.primaryUrl} target="_blank" rel="noreferrer" className="gl-primary-btn w-full">
          Abrir checkout <ExternalLink size={14} />
        </a>
        {product.secondaryUrl && (
          <a href={product.secondaryUrl} target="_blank" rel="noreferrer" className="gl-ghost-btn w-full">
            {product.secondaryLabel || "Outra opção"} <ExternalLink size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

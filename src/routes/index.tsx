import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";

import { CATALOGO } from "@/lib/fingerprints";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { SiteHeader } from "@/components/brand/SiteHeader";

const TITLE = "Farol · Ficha instantânea de empresas brasileiras";
const DESCRIPTION =
  "Digite o CNPJ. O Farol lê o cadastro público da Receita Federal, detecta a stack do site e devolve razão social, CNAE, porte, quadro societário e ferramentas em uso, com uma prioridade calculada e a conta aberta de como chegou nela.";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://farol.pereirasaraiva.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://farol.pereirasaraiva.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Farol",
          url: "https://farol.pereirasaraiva.com/",
          description:
            "Ficha de empresa brasileira a partir do CNPJ: cadastro da Receita, tecnografia do site e priorização por rubrica.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Pereira Saraiva",
          url: "https://pereirasaraiva.com",
          brand: { "@type": "Brand", name: "Farol" },
          sameAs: ["https://farol.pereirasaraiva.com/"],
        }),
      },
    ],
  }),
});

/**
 * Mock da ficha exibido na landing. Empresa FICTÍCIA, no mesmo padrão da
 * "Acme Distribuidora" do Cascata: nada aqui é consulta real, e os valores
 * existem só para mostrar a forma do resultado.
 */
const PREVIEW_ROWS: { label: string; value: string; kind?: "head" | "num" | "stack" }[] = [
  { label: "Razão social", value: "ACME SAÚDE DIGITAL LTDA", kind: "head" },
  { label: "CNPJ", value: "12.345.678/0001-90", kind: "num" },
  { label: "CNAE principal", value: "6201-5/01 · Desenvolvimento de programas sob encomenda" },
  { label: "Porte (Receita)", value: "Demais · nem micro, nem pequeno porte" },
  { label: "Capital social", value: "R$ 4.200.000", kind: "num" },
  { label: "Quadro societário", value: "3 sócios · 1 administrador" },
  { label: "Stack detectada", value: "RD Station Marketing · Pagar.me · VTEX", kind: "stack" },
];

const BEFORE_LINES = [
  "receita.economia.gov.br — captcha, uma consulta por vez",
  "site da empresa — abrir o código pra ver o que roda",
  "linkedin.com/company — headcount aproximado, sem CNPJ",
  "planilha_prospects_v4.xlsx — copiar e colar campo por campo",
];

const AFTER_BLOCKS = [
  {
    label: "CADASTRO",
    body: "CNPJ resolvido na Receita Federal: razão social, CNAE, porte, capital, sócios e situação cadastral.",
  },
  {
    label: "TECNOGRAFIA",
    body: `A stack do site contra ${CATALOGO} fingerprints brasileiros. RD Station, Totvs, VTEX e Pagar.me não aparecem em scanner global.`,
  },
  {
    label: "PRIORIDADE",
    body: "Pré-tier A, B ou C com os quatro eixos abertos. Você vê o que somou ponto e o que rebaixou.",
  },
];

const STEPS = [
  {
    n: "01",
    // Este passo prometia busca por nome — "até cinco candidatos com razão
    // social" — e ela nunca existiu, porque as fontes públicas gratuitas não têm
    // índice textual (ver Fase 3 no ROADMAP). A /demo já dizia a verdade; a home
    // contradizia a demo do mesmo produto. Alinhado com a /demo em 03/ago/2026.
    //
    // A promessa também estava na DESCRIPTION e no JSON-LD desta página, que
    // diziam "nome ou CNPJ" — corrigidos junto, no achado A2: copy falsa em meta
    // tag é falsa do mesmo jeito, e ainda vai para buscador e para card de link.
    title: "Digite o CNPJ",
    body: "Os dígitos verificadores são conferidos no navegador, então CNPJ errado não gasta consulta. Busca por nome não existe: as fontes públicas gratuitas não têm índice textual, e eu prefiro dizer isso a te devolver resultado ruim.",
  },
  {
    n: "02",
    title: "O Farol lê as fontes",
    body: "Cadastro na Receita Federal via Brasil API. Se você informar o site, a stack sai da própria página: scripts, cabeçalhos, cookies e o que uma ferramenta implica sobre a outra.",
  },
  {
    n: "03",
    title: "A rubrica calcula a prioridade",
    body: "Setor, porte, gatilho e alcance do comprador. Porte e gatilho você informa, porque nenhum dos dois está em cadastro público. O score aparece com a conta na frente, e o eixo de alcance está calibrado para consultor solo, não para time de vendas. Isso é premissa, e a tela diz isso.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="beam-hero py-24">
          <div className="mx-auto max-w-5xl px-6">
            <p className="eyebrow mb-8">Ficha de empresa brasileira</p>
            <h1
              className="font-display italic mb-10"
              style={{
                fontSize: "clamp(64px, 8vw, 112px)",
                lineHeight: 1.0,
                letterSpacing: "-0.025em",
                fontWeight: 700,
                fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
                maxWidth: "18ch",
                color: "var(--farol-ink)",
              }}
            >
              O que as ferramentas globais{" "}
              <em style={{ fontStyle: "italic", fontWeight: 700, color: "var(--farol-beam)" }}>
                não veem
              </em>{" "}
              no Brasil.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-12">
              Ferramentas globais inferem a identidade de uma empresa brasileira por scraping. O
              Farol lê a fonte primária: CNPJ na Receita, CNAE, capital, quadro societário. Some a
              isso a stack que roda no site, incluindo as ferramentas brasileiras que scanner global
              não reconhece, e uma prioridade calculada com a rubrica que eu uso na consultoria.
            </p>
            <div className="flex flex-wrap items-start gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 h-10 px-8 text-xs font-semibold uppercase tracking-[0.18em] bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Criar conta
              </Link>
              <div className="inline-flex flex-col gap-1.5">
                <Link
                  to="/demo"
                  className="inline-flex items-center justify-center gap-2 h-10 px-8 text-xs font-semibold uppercase tracking-[0.18em] border-[1.5px] border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver demo
                </Link>
                <p className="text-[11px] text-[var(--farol-fog)] leading-[1.7]">
                  Não precisa de cadastro
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center self-start mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground transition-colors"
              >
                Entrar
              </Link>
            </div>
          </div>
        </section>

        {/* O que você recebe */}
        <section className="border-t border-border bg-card/40 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex items-end justify-between gap-8 mb-10">
              <div>
                <p className="eyebrow">O que você recebe</p>
                <h2
                  className="mt-4 font-display italic font-medium text-[color:var(--farol-ink)] text-4xl md:text-5xl leading-[1.05] max-w-2xl"
                  style={{ fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0' }}
                >
                  Uma ficha{" "}
                  <em className="font-medium text-[color:var(--farol-beam)]">por empresa</em>, da
                  Receita à stack.
                </h2>
              </div>
              <p className="hidden md:block text-sm text-muted-foreground max-w-xs">
                Cadastro da fonte primária, {CATALOGO} fingerprints de ferramentas brasileiras e a
                rubrica de priorização com os quatro eixos abertos.
              </p>
            </div>

            <div className="rounded-md border border-border bg-background overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--farol-tier-c)]/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  Acme Saúde Digital · exemplo · fonte: Receita Federal
                </span>
              </div>
              <div className="p-4">
                {PREVIEW_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline gap-4 py-2 border-b border-border/40"
                  >
                    <span className="w-40 shrink-0 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                      {row.label}
                    </span>
                    <span
                      className={`flex-1 text-sm ${
                        row.kind === "head"
                          ? "font-semibold text-foreground"
                          : row.kind === "num"
                            ? "font-mono tabular-nums"
                            : row.kind === "stack"
                              ? "text-[color:var(--farol-beam)]"
                              : "text-muted-foreground"
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}

                <div className="-mx-4 mt-1 flex items-center gap-4 bg-muted/30 px-4 py-3">
                  <span className="w-40 shrink-0 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-foreground">
                    Pré-tier
                  </span>
                  <span className="pill-tier-b rounded-sm px-2 py-0.5 text-xs font-semibold">
                    B · 3 de 5
                  </span>
                  <span className="text-xs italic text-muted-foreground">parcial</span>
                </div>
                <div className="flex items-center gap-4 py-2">
                  <span className="w-40 shrink-0" />
                  <span className="text-xs italic text-primary/70">
                    ↳ os quatro eixos que formaram o score…
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-[var(--farol-fog)]">
              Porte e gatilho não estão em cadastro público. Na ficha real, você escolhe os dois e
              vê o tier recalcular.
            </p>
          </div>
        </section>

        {/* Antes / depois */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="eyebrow">Antes / depois</p>
            <h2
              className="mt-4 font-display italic font-medium text-[color:var(--farol-ink)] text-4xl md:text-5xl leading-[1.05] max-w-3xl"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0' }}
            >
              De quatro abas abertas a{" "}
              <em className="font-medium text-[color:var(--farol-beam)]">uma consulta</em>.
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/30 p-6">
                <p className="eyebrow text-muted-foreground">Antes — pesquisa manual</p>
                <div className="mt-4 space-y-2 font-mono text-sm leading-relaxed text-muted-foreground">
                  {BEFORE_LINES.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-[var(--farol-fog)]">
                    … + uma aba por fonte, e o dado envelhece na planilha
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-primary/30 bg-background p-6">
                <p className="eyebrow text-primary">Depois — ficha montada</p>
                <div className="mt-4 space-y-4">
                  {AFTER_BLOCKS.map((b) => (
                    <div key={b.label}>
                      <p className="font-mono text-xs text-muted-foreground">{b.label}</p>
                      <p className="mt-1 text-base leading-snug">{b.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Método */}
        <section className="border-t border-border bg-card/40 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="eyebrow mb-10">Método</p>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="border-t border-foreground/30 pt-6">
                  <div
                    className="font-display mb-6 text-4xl text-[color:var(--farol-beam)]"
                    style={{ fontVariationSettings: '"opsz" 96' }}
                  >
                    {s.n}
                  </div>
                  <h3 className="font-display mb-3 text-xl text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <BrandFooter />
    </div>
  );
}

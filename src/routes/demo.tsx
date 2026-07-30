import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/brand/SiteHeader";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { getFichaFn, type FichaError } from "@/lib/ficha.functions";
import { describePartners, formatBRL, type Enrichment } from "@/lib/enrichment";
import { formatFetchedAt, type Ficha } from "@/lib/ficha";
import { CATALOGO } from "@/lib/fingerprints";
import {
  countLabel,
  type Detection,
  type SiteFetchError,
  type StackResult,
} from "@/lib/technographics";
import type { NameMatch } from "@/lib/enrichment.server";
import { formatCnpj } from "@/lib/cnpj";

const DESCRIPTION =
  "Digite um CNPJ e veja a ficha montada a partir do cadastro público da Receita Federal: razão social, CNAE, porte, capital e quadro societário. Sem cadastro.";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Demo — Farol" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Demo — Farol" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://farol.pereirasaraiva.com/demo" },
      { property: "og:image", content: "/og-social.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og-social.png" },
    ],
    links: [{ rel: "canonical", href: "https://farol.pereirasaraiva.com/demo" }],
  }),
});

/**
 * Uma frase por código de erro. O contrato é o `FichaError` da fatia: se
 * aparecer código novo lá, o TypeScript cobra a frase aqui.
 */
const ERROR_COPY: Record<FichaError, string> = {
  INVALID_CNPJ: "Esse CNPJ não fecha nos dígitos verificadores. Confira e tente de novo.",
  COMPANY_NOT_FOUND:
    "CNPJ válido, mas sem registro na Receita. Pode ser baixa cadastral ou erro de digitação.",
  NAME_NO_MATCH: "Não achei empresa com esse nome. Tente a razão social ou o CNPJ direto.",
  NAME_SEARCH_UNAVAILABLE:
    "Por ora o Farol consulta só por CNPJ. As fontes públicas gratuitas não têm busca por nome, e eu prefiro dizer isso a te devolver resultado ruim.",
  SOURCE_RATE_LIMITED: "A fonte pública limitou as consultas por agora. Tente em alguns minutos.",
  SOURCE_UNAVAILABLE: "A fonte da Receita está fora do ar. Não é você, é ela.",
};

/**
 * Exemplos com CNPJ real, para o primeiro clique não gastar digitação. Os oito
 * definidos na copy entram quando existir o cache; estes três são os que já
 * consultei ao vivo e conferi.
 */
const EXEMPLOS = [
  { nome: "Petrobras", cnpj: "33000167000101", site: "petrobras.com.br" },
  { nome: "Ambev", cnpj: "07526557000100", site: "ambev.com.br" },
  { nome: "Banco do Brasil", cnpj: "00000000000191", site: "bb.com.br" },
];

type Estado =
  | { tipo: "vazio" }
  | { tipo: "carregando" }
  | { tipo: "ficha"; ficha: Ficha }
  | { tipo: "escolher"; matches: NameMatch[] }
  | { tipo: "erro"; error: FichaError };

function DemoPage() {
  const [query, setQuery] = useState("");
  const [site, setSite] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "vazio" });

  async function consultar(termo: string, dominio: string) {
    const t = termo.trim();
    if (!t) return;
    setEstado({ tipo: "carregando" });
    try {
      const d = dominio.trim();
      const r = await getFichaFn({ data: { query: t, ...(d ? { domain: d } : {}) } });
      if (r.status === "ok") setEstado({ tipo: "ficha", ficha: r.ficha });
      else if (r.status === "choose") setEstado({ tipo: "escolher", matches: r.matches });
      else setEstado({ tipo: "erro", error: r.error });
    } catch {
      setEstado({ tipo: "erro", error: "SOURCE_UNAVAILABLE" });
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <div className="border-b border-border bg-[color:var(--farol-beam)]/5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-[color:var(--farol-beam)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--farol-beam)]/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--farol-beam)]" />
            </span>
            <span className="font-medium uppercase tracking-[0.14em]">
              Demo pública · dados reais da Receita Federal
            </span>
          </div>
          <Link
            to="/signup"
            className="rounded-sm border border-[color:var(--farol-beam)]/60 bg-background px-2.5 py-1 font-medium text-[color:var(--farol-beam)] transition-colors hover:bg-[color:var(--farol-beam)] hover:text-[color:var(--farol-night-deep)]"
          >
            Criar conta
          </Link>
        </div>
      </div>

      <main className="flex-1">
        <section className="beam-hero py-16">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow">Consulta</p>
            <h1
              className="font-display mt-4 text-3xl font-medium italic leading-tight md:text-4xl"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0' }}
            >
              Aponte o farol para uma empresa.
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Digite o CNPJ. Se souber o site, informe também: é dele que sai a stack.
            </p>

            <form
              className="mt-8 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void consultar(query, site);
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="q">
                  CNPJ da empresa
                </label>
                <input
                  id="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="33.000.167/0001-01"
                  className="h-11 flex-1 border border-input bg-card px-4 text-base transition-colors placeholder:text-[color:var(--farol-fog)] focus-visible:border-[color:var(--farol-beam)] focus-visible:outline-none"
                />
                <label className="sr-only" htmlFor="site">
                  Site da empresa (opcional)
                </label>
                <input
                  id="site"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="Site (opcional) — petrobras.com.br"
                  className="h-11 flex-1 border border-input bg-card px-4 text-base transition-colors placeholder:text-[color:var(--farol-fog)] focus-visible:border-[color:var(--farol-beam)] focus-visible:outline-none"
                />
                <button
                  type="submit"
                  disabled={estado.tipo === "carregando" || !query.trim()}
                  className="inline-flex h-11 items-center justify-center gap-2 bg-primary px-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {estado.tipo === "carregando" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Consultar
                </button>
              </div>
              <p className="text-xs text-[color:var(--farol-fog)]">
                Sem o site, a ficha sai sem a seção de stack.
              </p>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[color:var(--farol-fog)]">Experimente com:</span>
              {EXEMPLOS.map((ex) => (
                <button
                  key={ex.cnpj}
                  type="button"
                  onClick={() => {
                    setQuery(formatCnpj(ex.cnpj));
                    setSite(ex.site);
                    void consultar(ex.cnpj, ex.site);
                  }}
                  className="rounded-sm border border-input px-2.5 py-1 text-foreground transition-colors hover:border-[color:var(--farol-beam)]/60 hover:text-[color:var(--farol-beam)]"
                >
                  {ex.nome}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-12">
          <div className="mx-auto max-w-3xl px-6">
            {estado.tipo === "vazio" && (
              <p className="text-sm text-[color:var(--farol-fog)]">
                Nenhuma consulta ainda. Escolha um exemplo acima ou digite um CNPJ.
              </p>
            )}

            {estado.tipo === "carregando" && (
              <p className="beam-sweep text-sm text-muted-foreground">Procurando…</p>
            )}

            {estado.tipo === "erro" && (
              <div className="border-l-2 border-destructive bg-card p-5">
                <p className="text-sm text-foreground">{ERROR_COPY[estado.error]}</p>
              </div>
            )}

            {estado.tipo === "escolher" && (
              <div>
                <p className="eyebrow mb-4">Qual delas?</p>
                <ul className="divide-y divide-border border border-border">
                  {estado.matches.map((m) => (
                    <li key={m.cnpj}>
                      <button
                        type="button"
                        onClick={() => void consultar(m.cnpj, site)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <span>
                          <span className="block text-sm font-medium text-foreground">
                            {m.legalName}
                          </span>
                          {m.tradeName && (
                            <span className="block text-xs text-muted-foreground">
                              {m.tradeName}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {formatCnpj(m.cnpj)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {estado.tipo === "ficha" && <FichaCard ficha={estado.ficha} />}
          </div>
        </section>

        <section className="border-t border-border bg-card/40 py-10">
          <div className="mx-auto max-w-3xl px-6">
            <p className="text-xs leading-relaxed text-[color:var(--farol-fog)]">
              Cadastro público da Receita Federal via Brasil API; a stack sai da leitura do próprio
              site, contra {CATALOGO} fingerprints de ferramentas brasileiras.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              O cálculo de prioridade entra na próxima fase.{" "}
              <Link
                to="/metodologia"
                className="text-[color:var(--farol-beam)] underline underline-offset-4"
              >
                Como a rubrica funciona
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <BrandFooter />
    </div>
  );
}

function Linha({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/40 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-44 shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-sm">{children}</span>
    </div>
  );
}

/**
 * Frase por estado de falha de leitura. Aprovadas em 28/jul/2026 — implementar
 * literal. O contrato é o `SiteFetchError`: estado novo lá, o TypeScript cobra
 * a frase aqui.
 *
 * Nenhuma diz "erro", de propósito: não houve erro. A stack é opcional na ficha,
 * e a ficha entregue está completa no que prometeu — é isso que a linha fixa
 * abaixo sustenta.
 */
const STACK_ERROR_COPY: Record<SiteFetchError, string> = {
  unreachable: "O site não respondeu ao endereço informado.",
  timeout: "O site demorou demais para responder.",
  blocked: "O site recusou a leitura.",
};

/** Rótulo da via, para o chip dizer COMO foi detectado. */
const VIA_LABEL: Record<Detection["via"], string> = {
  script: "script",
  header: "header",
  meta: "meta",
  cookie: "cookie",
  dom: "dom",
  implied: "inferido",
};

/**
 * A seção de stack. Quatro caminhos, e a diferença entre dois deles é a decisão
 * de produto que mais importa aqui:
 *
 * - `null` — **nem tentou**: ninguém informou site. Seção não existe.
 * - `error` — não conseguiu ler. Seção não existe; a frase vai no rodapé.
 * - `empty` — **leu e não achou nada**. Seção EXISTE, com uma linha no lugar dos
 *   chips. "Nenhuma das N" é achado, não ausência: diz que a empresa não roda
 *   nada do catálogo brasileiro, o que é informação sobre a empresa. Se a seção
 *   sumisse aqui, o achado ficaria indistinguível de "nem tentou".
 * - `ok` — os chips, agrupados por categoria.
 */
function SecaoStack({ stack, domain }: { stack: StackResult | null; domain: string | null }) {
  if (!stack) return null;

  if (stack.status === "error") {
    return (
      <div className="border-t border-border px-5 py-4">
        {/* Hierarquia deliberada: o estado em `fog`, a linha fixa em `mist`, um
            passo mais clara. Com o mesmo tom, o visitante lê a de cima e para —
            e a de cima é a que não interessa. Quem faz o trabalho é a segunda:
            ela impede a leitura de que a ficha inteira falhou. */}
        <p className="text-xs text-[color:var(--farol-fog)]">{STACK_ERROR_COPY[stack.reason]}</p>
        <p className="mt-1 text-xs text-[color:var(--farol-mist)]">
          O cadastro da Receita não depende disso.
        </p>
      </div>
    );
  }

  const total = stack.status === "ok" ? stack.technologies.length : 0;
  const porCategoria =
    stack.status === "ok"
      ? stack.technologies.reduce<Record<string, Detection[]>>((acc, d) => {
          (acc[d.category] ??= []).push(d);
          return acc;
        }, {})
      : {};

  return (
    <div className="border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          Stack
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {domain ? `fonte: ${domain}` : "fonte: site da empresa"} ·{" "}
          {stack.status === "ok" ? countLabel(total) : `lido · nenhuma das ${CATALOGO}`}
        </span>
      </div>

      <div className="p-5">
        {stack.status === "empty" ? (
          <p className="text-sm text-[color:var(--farol-mist)]">
            O site foi lido. Nenhuma das {CATALOGO} ferramentas do catálogo apareceu.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(porCategoria).map(([categoria, itens]) => (
              <div key={categoria}>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {categoria}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {itens.map((d) => (
                    <span
                      key={d.tool}
                      title={`${d.via}: ${d.evidence}`}
                      className="inline-flex items-baseline gap-2 rounded-sm border border-border bg-[color:var(--farol-surface-alt)] px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-medium text-foreground">{d.tool}</span>
                      {/* Detecção inferida ganha o marcador visualmente mais
                          fraco: honestidade de procedência na UI. */}
                      <span
                        className={`rounded-sm px-1.5 py-0.5 text-[10px] ${
                          d.via === "implied" ? "chip-implied" : "chip-direct"
                        }`}
                      >
                        {VIA_LABEL[d.via]}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FichaCard({ ficha }: { ficha: Ficha }) {
  const e: Enrichment = ficha.enrichment;
  const lidoEm = formatFetchedAt(ficha.fetchedAt);
  return (
    <div className="border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          Ficha
        </span>
        {/* Procedência é lista de fontes: o token diz de onde veio e de quando.
            Não diz "do cache" de propósito — que o Farol tenha cache é problema
            do Farol; o que muda a leitura de quem vê é a idade do dado. */}
        <span className="font-mono text-xs text-muted-foreground">
          fonte: Receita Federal{lidoEm ? ` · lido em ${lidoEm}` : ""}
        </span>
      </div>

      <div className="p-5">
        <Linha label="Razão social">
          <span className="font-semibold text-foreground">{e.legalName}</span>
        </Linha>
        {e.tradeName && <Linha label="Nome fantasia">{e.tradeName}</Linha>}
        <Linha label="CNPJ">
          <span className="font-mono tabular-nums">{e.cnpjFormatted}</span>
        </Linha>
        {e.cnae && (
          <Linha label="CNAE principal">
            <span className="font-mono tabular-nums">{e.cnae.code}</span>{" "}
            <span className="text-muted-foreground">· {e.cnae.description}</span>
          </Linha>
        )}
        <Linha label="Porte (Receita)">
          {e.porte}
          {e.porteNote && <span className="text-muted-foreground"> · {e.porteNote}</span>}
        </Linha>
        {e.shareCapital !== null && (
          <Linha label="Capital social">
            <span className="font-mono tabular-nums">{formatBRL(e.shareCapital)}</span>
          </Linha>
        )}
        {e.legalNature && <Linha label="Natureza jurídica">{e.legalNature}</Linha>}
        {e.registrationStatus && <Linha label="Situação cadastral">{e.registrationStatus}</Linha>}
        {e.location && <Linha label="Município">{e.location}</Linha>}
        <Linha label="Quadro societário">{describePartners(e.partners)}</Linha>

        {e.partners.length > 0 && (
          <ul className="mt-3 space-y-1">
            {e.partners.map((p) => (
              <li key={`${p.name}-${p.role ?? ""}`} className="flex items-baseline gap-2 text-xs">
                <span className={p.isAdmin ? "text-foreground" : "text-muted-foreground"}>
                  {p.name}
                </span>
                {p.role && (
                  <span
                    className={`rounded-sm px-1.5 py-0.5 text-[10px] ${
                      p.isAdmin ? "pill-beam" : "chip-implied"
                    }`}
                  >
                    {p.role}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 border-t border-border/40 pt-4 text-xs text-[color:var(--farol-fog)]">
          O quadro societário da Receita não traz participação acionária, então o Farol não infere
          quem é o sócio majoritário. Os destacados são os que administram.
        </p>
      </div>

      <SecaoStack stack={ficha.stack} domain={ficha.domain} />

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
        <span className="pill-tier-c rounded-sm px-2 py-0.5 text-xs font-semibold">Sem tier</span>
        <span className="text-xs text-muted-foreground">
          O cálculo de prioridade precisa de porte e gatilho, que você informa.
        </span>
        <Link
          to="/metodologia"
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--farol-beam)]"
        >
          Rubrica <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

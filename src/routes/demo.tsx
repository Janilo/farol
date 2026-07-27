import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/brand/SiteHeader";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { getFichaFn, type FichaError } from "@/lib/ficha.functions";
import { describePartners, formatBRL, type Enrichment } from "@/lib/enrichment";
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
  { nome: "Petrobras", cnpj: "33000167000101" },
  { nome: "Ambev", cnpj: "07526557000100" },
  { nome: "Banco do Brasil", cnpj: "00000000000191" },
];

type Estado =
  | { tipo: "vazio" }
  | { tipo: "carregando" }
  | { tipo: "ficha"; enrichment: Enrichment }
  | { tipo: "escolher"; matches: NameMatch[] }
  | { tipo: "erro"; error: FichaError };

function DemoPage() {
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "vazio" });

  async function consultar(termo: string) {
    const t = termo.trim();
    if (!t) return;
    setEstado({ tipo: "carregando" });
    try {
      const r = await getFichaFn({ data: { query: t } });
      if (r.status === "ok") setEstado({ tipo: "ficha", enrichment: r.enrichment });
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
            className="rounded-sm border border-[color:var(--farol-beam)]/40 bg-background px-2.5 py-1 font-medium text-[color:var(--farol-beam)] transition-colors hover:bg-[color:var(--farol-beam)] hover:text-[color:var(--farol-night-deep)]"
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
              Digite o CNPJ. O cadastro vem da Receita Federal, via Brasil API.
            </p>

            <form
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void consultar(query);
              }}
            >
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
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[color:var(--farol-fog)]">Experimente com:</span>
              {EXEMPLOS.map((ex) => (
                <button
                  key={ex.cnpj}
                  type="button"
                  onClick={() => {
                    setQuery(formatCnpj(ex.cnpj));
                    void consultar(ex.cnpj);
                  }}
                  className="rounded-sm border border-border px-2.5 py-1 text-foreground transition-colors hover:border-[color:var(--farol-beam)]/50 hover:text-[color:var(--farol-beam)]"
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
                        onClick={() => void consultar(m.cnpj)}
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

            {estado.tipo === "ficha" && <FichaCard e={estado.enrichment} />}
          </div>
        </section>

        <section className="border-t border-border bg-card/40 py-10">
          <div className="mx-auto max-w-3xl px-6">
            <p className="text-xs leading-relaxed text-[color:var(--farol-fog)]">
              Dados públicos da Receita Federal, consultados via Brasil API. O Farol não guarda nada
              além da consulta feita.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              A stack do site e o cálculo de prioridade entram na próxima fase.{" "}
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

function FichaCard({ e }: { e: Enrichment }) {
  return (
    <div className="border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          Ficha
        </span>
        <span className="font-mono text-xs text-muted-foreground">fonte: Receita Federal</span>
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

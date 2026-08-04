/**
 * Pré-tier interativo (Fase 5).
 *
 * Roda inteiro no cliente: `computePreTier` é puro e não toca em rede, então
 * **não consome quota**. Isso é de propósito — a rubrica é o que o Farol tem de
 * próprio, e cobrar por mexer nela puniria o caminho que queremos que a pessoa
 * use.
 *
 * A tela expõe dois dos quatro eixos (gatilho e porte). O resultado vem marcado
 * como parcial por isso: um C de dois eixos quer dizer "não sei", e deixar isso
 * passar por "não serve" seria mentir sobre o que a rubrica afirmou.
 */

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computePreTier, type RubricPorte, type Tier } from "@/lib/tier";
import { TRIGGERS } from "@/lib/triggers";

const PORTES: readonly { valor: RubricPorte; label: string }[] = [
  { valor: "Early", label: "Early — pré-tração ou início" },
  { valor: "Scale-up", label: "Scale-up — crescendo com receita" },
  { valor: "Grande", label: "Grande — empresa consolidada" },
];

/**
 * Cada tier sai do seu par de tokens, nunca de hex à mão: o contraste de
 * `--farol-tier-c` foi medido **sobre `--farol-tier-c-soft`** (AA 4.53), então
 * separar a cor do fundo dela invalida a medição que o DESIGN.md §2 registra.
 */
const COR_TIER: Record<Tier, { texto: string; fundo: string }> = {
  A: { texto: "var(--farol-tier-a)", fundo: "var(--farol-tier-a-soft)" },
  B: { texto: "var(--farol-tier-b)", fundo: "var(--farol-tier-b-soft)" },
  C: { texto: "var(--farol-tier-c)", fundo: "var(--farol-tier-c-soft)" },
};

const LEGENDA_TIER: Record<Tier, string> = {
  A: "vale abrir o dossiê agora",
  B: "nutrir e monitorar o gatilho",
  C: "watch — revisitar no refresh",
};

export function PreTier() {
  const [gatilho, setGatilho] = useState<string | null>(null);
  const [porte, setPorte] = useState<RubricPorte | null>(null);

  const resultado = useMemo(() => computePreTier({ gatilho, porte }), [gatilho, porte]);

  const escolheuAlgo = gatilho !== null || porte !== null;

  return (
    <div className="rounded-lg border border-border bg-card/40 p-6">
      <p className="eyebrow">Rubrica</p>
      <h2 className="font-display mt-3 text-2xl font-medium text-foreground">Simule o pré-tier</h2>
      <p className="mt-3 max-w-prose text-sm text-muted-foreground">
        Os mesmos pesos que a esteira aplica a cada sinal. Escolha e veja o tier recalcular — é
        cálculo no seu navegador, não consome consulta.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Gatilho
          </span>
          <Select value={gatilho ?? undefined} onValueChange={setGatilho}>
            <SelectTrigger aria-label="Gatilho">
              <SelectValue placeholder="Escolha o gatilho" />
            </SelectTrigger>
            <SelectContent>
              {TRIGGERS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.id} — {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Porte
          </span>
          <Select value={porte ?? undefined} onValueChange={(v) => setPorte(v as RubricPorte)}>
            <SelectTrigger aria-label="Porte">
              <SelectValue placeholder="Escolha o porte" />
            </SelectTrigger>
            <SelectContent>
              {PORTES.map((p) => (
                <SelectItem key={p.valor} value={p.valor}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="mt-6 border-t border-border/60 pt-6">
        <div
          className="flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-md px-4 py-3"
          style={{ backgroundColor: COR_TIER[resultado.tier].fundo }}
        >
          <span
            className="font-display text-5xl font-medium leading-none"
            style={{ color: COR_TIER[resultado.tier].texto }}
            aria-live="polite"
          >
            {resultado.tier}
          </span>
          <span className="text-sm" style={{ color: COR_TIER[resultado.tier].texto }}>
            {LEGENDA_TIER[resultado.tier]} · score {resultado.score} de 5
          </span>
        </div>

        {resultado.partial && (
          <p className="mt-4 text-sm text-[color:var(--farol-fog)]">
            {escolheuAlgo
              ? "Parcial: o setor não entra aqui, e sem ele o score é um piso — o tier pode subir, nunca descer."
              : "Escolha um gatilho e um porte para ver o cálculo."}
          </p>
        )}

        {escolheuAlgo && resultado.reasons.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {resultado.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-muted-foreground">
                <span aria-hidden="true" className="text-[color:var(--farol-rule-control)]">
                  ↳
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        Texto fixo exigido pela spec da Fase 5. O eixo 4 não é medição: é a
        premissa de que o comprador precisa caber num consultor solo. Sem dizer
        isso, "Grande" parecer punição vira leitura óbvia — e é o contrário, é o
        eixo que impede a conta de pontuar pelo que a torna inalcançável.
      */}
      <p className="mt-6 border-t border-border/60 pt-4 text-xs leading-relaxed text-[color:var(--farol-fog)]">
        O eixo de alcance é premissa do operador, calibrada para consultor solo — não é medição da
        empresa.{" "}
        <Link
          to="/metodologia"
          className="text-[color:var(--farol-beam)] underline underline-offset-4"
        >
          Como a rubrica funciona
        </Link>
        .
      </p>
    </div>
  );
}

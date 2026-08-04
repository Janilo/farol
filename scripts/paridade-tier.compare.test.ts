/**
 * Lado TypeScript do comparador de paridade da rubrica — o par de
 * , e o passo 2 do procedimento descrito lá.
 *
 * Fica em `scripts/` de propósito: o vitest não varre esta pasta, então ele NÃO
 * roda no CI. É ferramenta manual, para quando a rubrica mudar de um dos dois
 * lados. O alarme do dia a dia é o espelho das constantes em `tier.test.ts`.
 *
 * A regra do README desta pasta vale aqui: o gerador Python estava versionado e
 * este comparador não, então a afirmação "2268 casos, 100% de paridade" do
 * ROADMAP só era reproduzível pela metade.
 *
 * Uso:
 *   python3 scripts/paridade-tier.py > /tmp/py.json
 *   npx pnpm@10 vitest run --dir scripts scripts/paridade-tier.compare.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

import { computePreTier, type RubricPorte } from "../src/lib/tier";

/**
 * O Python lê o valor da rodada do TEXTO do sinal; a porta em TS recebe o número
 * já extraído. Esta função reproduz só o recorte da regex que a matriz exercita,
 * para poder alimentar os dois lados com a mesma entrada.
 */
function rodadaDoTrecho(trecho: string): number | null {
  if (trecho.includes("2,5 milhões")) return 2_500_000;
  if (trecho.includes("50 milhões")) return 50_000_000;
  return null;
}

interface Caso {
  setor: string;
  porte: string;
  gatilho: string;
  trecho: string;
  score: number;
  tier: string;
}

const casos: Caso[] = JSON.parse(readFileSync(process.env.PARIDADE_JSON ?? "/tmp/py.json", "utf8"));

describe("paridade com compute_pre_tier do Python", () => {
  it(`bate score e tier nos ${casos.length} casos da matriz`, () => {
    const divergencias: string[] = [];

    for (const c of casos) {
      const r = computePreTier({
        setor: c.setor,
        porte: (c.porte || null) as RubricPorte | null,
        gatilho: c.gatilho,
        rodada: rodadaDoTrecho(c.trecho),
      });
      if (r.score !== c.score || r.tier !== c.tier) {
        divergencias.push(
          `setor=${c.setor || "∅"} porte=${c.porte || "∅"} gatilho=${c.gatilho || "∅"} ` +
            `rodada=${c.trecho ? rodadaDoTrecho(c.trecho) : "∅"} → ` +
            `py(${c.score}/${c.tier}) ts(${r.score}/${r.tier})`,
        );
      }
    }

    expect(divergencias.slice(0, 15)).toEqual([]);
    expect(divergencias).toHaveLength(0);
  });
});

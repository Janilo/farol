/**
 * Núcleo puro do cache de ficha. Sem I/O, sem relógio implícito: quem chama
 * passa o `agora`, e é por isso que os testes não precisam de fake timers.
 *
 * A decisão que mora aqui é uma só, e é a que vale a pena isolar: **dado o que
 * está no cache e que horas são, bater na fonte ou não?** Ela parece trivial
 * até aparecer o terceiro caso — cache velho e fonte fora do ar — em que a
 * resposta certa não é erro nem é recusa, é servir o velho dizendo que é velho.
 */
import type { Enrichment } from "./enrichment";

/** Janela de frescor. 30 dias é o que a Fase 3 fixou no roadmap. */
export const CACHE_MAX_AGE_DAYS = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * A ficha como a tela recebe. `fetchedAt` e `fromCache` não são detalhe de
 * implementação vazando: este produto vende procedência, então quando um dado
 * foi lido é parte do dado.
 */
export interface Ficha {
  cnpj: string;
  enrichment: Enrichment;
  /** ISO 8601. Quando a FONTE foi lida — não quando a linha foi escrita. */
  fetchedAt: string;
  fromCache: boolean;
}

/** A linha crua do cache, como o adapter a entrega. */
export interface CachedRow {
  cnpj: string;
  enrichment: Enrichment;
  fetchedAt: string;
}

export type CacheDecision =
  | { action: "serve"; ficha: Ficha }
  /** `stale` é a carta na manga: se a fonte falhar, sirva isto em vez de erro. */
  | { action: "refetch"; stale: Ficha | null };

/** Idade em dias. Data ilegível vira Infinity — cache ruim nunca é fresco. */
export function cacheAgeInDays(fetchedAt: string, agora: Date): number {
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  // Data no futuro (relógio torto na escrita) conta como idade zero, não
  // negativa: o pior que acontece é servir do cache, e não invalidar tudo.
  return Math.max(0, (agora.getTime() - t) / MS_POR_DIA);
}

export function isFresh(
  fetchedAt: string,
  agora: Date,
  maxAgeDays: number = CACHE_MAX_AGE_DAYS,
): boolean {
  return cacheAgeInDays(fetchedAt, agora) < maxAgeDays;
}

function toFicha(row: CachedRow, fromCache: boolean): Ficha {
  return {
    cnpj: row.cnpj,
    enrichment: row.enrichment,
    fetchedAt: row.fetchedAt,
    fromCache,
  };
}

/**
 * A decisão. Três saídas, não duas:
 *
 * - sem linha        → `refetch`, sem carta na manga
 * - linha fresca     → `serve`
 * - linha velha      → `refetch`, **carregando a velha junto**
 *
 * O terceiro caso é o que justifica a função existir. Sem ele, quem orquestra
 * escreve `if (fresca) servir; else buscar` e joga fora a única cópia que
 * tinha quando a Brasil API responde 503. Devolver a velha em `stale` faz a
 * fatia poder degradar em vez de falhar, e a ficha diz a data.
 */
export function decideFromCache(
  row: CachedRow | null,
  agora: Date,
  maxAgeDays: number = CACHE_MAX_AGE_DAYS,
): CacheDecision {
  if (!row) return { action: "refetch", stale: null };
  if (isFresh(row.fetchedAt, agora, maxAgeDays)) {
    return { action: "serve", ficha: toFicha(row, true) };
  }
  return { action: "refetch", stale: toFicha(row, true) };
}

/** Ficha recém-lida da fonte. `fromCache` é falso por construção. */
export function fichaFromSource(cnpj: string, enrichment: Enrichment, agora: Date): Ficha {
  return { cnpj, enrichment, fetchedAt: agora.toISOString(), fromCache: false };
}

/**
 * A data de leitura como a procedência mostra: `28/07/2026`.
 *
 * A tela mostra **quando a fonte foi lida**, não se veio do cache. Que o Farol
 * tenha cache é problema do Farol; o que muda a decisão de quem lê é a idade
 * do dado. Data ilegível devolve `null` e a tela omite a linha, em vez de
 * escrever "Invalid Date" na cara do visitante.
 */
export function formatFetchedAt(fetchedAt: string): string | null {
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
import type { StackResult } from "./technographics";

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
  /** Host lido, quando houve leitura. `null` = ninguém informou site. */
  domain: string | null;
  /**
   * `null` significa **nem tentou** — o quarto estado, e o que separa "não
   * informou site" de "leu e não achou nada" (`empty`). A tela usa a diferença:
   * `null` não desenha seção de stack, `empty` desenha com uma linha.
   */
  stack: StackResult | null;
}

/**
 * O contrato que a tela consome. Mora aqui, no núcleo puro, e **não** no
 * orquestrador: `demo.tsx` precisa de `FichaError` para escolher a frase, e se o
 * tipo viver junto do código que fala com a Receita, importar o tipo arrasta o
 * módulo servidor para o grafo do cliente. Foi exatamente essa a issue #2.
 */
export type FichaError =
  | "INVALID_CNPJ"
  | "COMPANY_NOT_FOUND"
  /** Digitou algo que não é CNPJ. Não existe busca por nome — ver `enrichment.server.ts`. */
  | "NAME_SEARCH_UNAVAILABLE"
  | "SOURCE_RATE_LIMITED"
  | "SOURCE_UNAVAILABLE"
  | "QUOTA_VISITANTE"
  | "QUOTA_GLOBAL"
  | "QUOTA_INDISPONIVEL";

/**
 * Duas saídas, não três. Havia uma variante `choose` com candidatos de busca por
 * nome, removida em 03/ago/2026 (achado A2): ela **nunca podia acontecer**, e um
 * tipo que descreve um estado impossível é uma promessa que o produto não cumpre.
 */
export type FichaResult = { status: "ok"; ficha: Ficha } | { status: "error"; error: FichaError };

/** A linha crua do cache, como o adapter a entrega. */
export interface CachedRow {
  cnpj: string;
  enrichment: Enrichment;
  fetchedAt: string;
  domain: string | null;
  stack: StackResult | null;
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
    domain: row.domain,
    stack: row.stack,
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
  return {
    cnpj,
    enrichment,
    fetchedAt: agora.toISOString(),
    fromCache: false,
    domain: null,
    stack: null,
  };
}

/* ------------------------------------------------------------------ *
 * A stack tem chave diferente do cadastro
 * ------------------------------------------------------------------ */

export type StackCacheDecision =
  /** Reaproveita o que está guardado. `stack` pode ser `null` = nem tentou. */
  | { action: "serve"; stack: StackResult | null; domain: string | null }
  /** Precisa ler o site. */
  | { action: "fetch"; domain: string };

/**
 * **A armadilha que esta função existe para fechar:** a linha do cache é
 * indexada por CNPJ, mas a stack depende do *domínio*. Sem esta separação, quem
 * consultasse o CNPJ X informando `a.com` e depois o mesmo X informando `b.com`
 * receberia a stack de `a.com` rotulada como sendo de `b.com` — dado errado com
 * cara de procedência, que é o pior defeito possível neste produto.
 *
 * As três saídas:
 *
 * - **domínio pedido igual ao guardado**, e o cache serve → devolve o guardado;
 * - **domínio pedido diferente** (ou o cache não tinha stack) → lê o site;
 * - **nenhum domínio pedido** → `null`, sempre. Nem tentou.
 *
 * O terceiro caso mudou em 30/jul/2026, e a razão é um defeito reproduzido em
 * produção. A regra antiga era servir o domínio guardado a quem não pediu site,
 * apoiada na premissa de que "a stack é atributo da empresa, não da consulta".
 * A premissa é falsa aqui: quem informa o site é um visitante anônimo, e o campo
 * de site não limpava ao trocar o CNPJ. Bastou clicar no exemplo da Ambev e
 * digitar outro CNPJ para o cache compartilhado gravar um MEI de São Vicente
 * com `domain: ambev.com.br` — e a regra antiga serviria essa associação a todo
 * mundo que consultasse aquele CNPJ pelos 30 dias seguintes, com cara de fato
 * apurado.
 *
 * A trava não podia ficar só na gravação: o servidor não tem como saber se o par
 * digitado é verdadeiro. Então ela fica na afirmação. **O Farol nunca afirma por
 * conta própria qual é o site de uma empresa**; ele só reporta a leitura do site
 * que o próprio visitante informou. Quem digitar o par errado vê o próprio erro;
 * mais ninguém vê.
 *
 * O `domain` continua sendo gravado, porque é a chave que permite reaproveitar a
 * leitura quando o mesmo site for pedido de novo. O que deixou de existir é
 * oferecê-lo sem que alguém tenha perguntado.
 *
 * Os chips de exemplo não perdem nada: eles carregam o site junto do CNPJ, então
 * caem no primeiro caso.
 */
export function decideStackFromCache(
  row: CachedRow | null,
  domainPedido: string | null,
  podeServirCache: boolean,
): StackCacheDecision {
  if (!domainPedido) return { action: "serve", stack: null, domain: null };

  if (podeServirCache && row && row.domain === domainPedido && row.stack) {
    return { action: "serve", stack: row.stack, domain: row.domain };
  }
  return { action: "fetch", domain: domainPedido };
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

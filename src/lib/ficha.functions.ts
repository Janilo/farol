/**
 * Fatia vertical da consulta. Orquestra: valida, resolve nome → CNPJ quando
 * preciso, chama as fontes, monta a ficha.
 *
 * O resultado é união discriminada em vez de exceção: cada falha da fonte
 * pública tem uma frase diferente na tela, e o cliente decide qual mostrar
 * pelo `error`, sem parsear mensagem.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { cleanCnpj, isValidCnpj, looksLikeCnpj } from "./cnpj";
import { extractEnrichment } from "./enrichment";
import { fetchCnpj, searchCnpjByName, type NameMatch } from "./enrichment.server";
import {
  decideFromCache,
  decideStackFromCache,
  fichaFromSource,
  isFresh,
  type CachedRow,
  type Ficha,
  type StackCacheDecision,
} from "./ficha";
import { readCachedFicha, writeCachedFicha } from "./ficha.server";
import { consumirQuota } from "./rate-limit.server";
import { normalizeDomain, stackFromSnapshot, type StackResult } from "./technographics";
import { fetchTargetSite } from "./technographics.server";

export type FichaError =
  | "INVALID_CNPJ"
  | "COMPANY_NOT_FOUND"
  | "NAME_NO_MATCH"
  | "NAME_SEARCH_UNAVAILABLE"
  | "SOURCE_RATE_LIMITED"
  | "SOURCE_UNAVAILABLE"
  | "QUOTA_VISITANTE"
  | "QUOTA_GLOBAL"
  | "QUOTA_INDISPONIVEL";

export type FichaResult =
  | { status: "ok"; ficha: Ficha }
  | { status: "choose"; matches: NameMatch[] }
  | { status: "error"; error: FichaError };

/** Traduz a falha do adapter no código de erro do domínio. */
function mapFetchError(error: "not_found" | "rate_limited" | "upstream_down" | "invalid_response") {
  if (error === "not_found") return "COMPANY_NOT_FOUND" as const;
  if (error === "rate_limited") return "SOURCE_RATE_LIMITED" as const;
  return "SOURCE_UNAVAILABLE" as const;
}

/**
 * Três códigos e não um, porque são três conversas diferentes: o visitante estourou
 * o dele (e cadastro resolve), a casa estourou o do dia (e nada que ele faça
 * resolve), ou a quota não pôde ser apurada (culpa nossa, e a frase tem que dizer
 * isso em vez de acusá-lo de ter consultado demais).
 */
function quotaErro(reason: "visitante" | "global" | "indisponivel") {
  if (reason === "visitante") return "QUOTA_VISITANTE" as const;
  if (reason === "global") return "QUOTA_GLOBAL" as const;
  return "QUOTA_INDISPONIVEL" as const;
}

/**
 * Resolve a stack a partir do cache ou do site. **Nunca lança e nunca vira erro
 * da ficha**: a tecnografia é a segunda fonte, e o cadastro da Receita não
 * depende dela. Falha vira `{ status: "error", reason }`, que na tela é uma
 * frase — não uma ficha quebrada.
 */
async function resolverStack(
  decisao: StackCacheDecision,
): Promise<{ stack: StackResult | null; domain: string | null; leuAgora: boolean }> {
  if (decisao.action === "serve") {
    return { stack: decisao.stack, domain: decisao.domain, leuAgora: false };
  }

  const res = await fetchTargetSite(decisao.domain);
  const stack: StackResult = res.ok
    ? stackFromSnapshot(res.snapshot)
    : { status: "error", reason: res.error };
  return { stack, domain: decisao.domain, leuAgora: true };
}

/**
 * Cache → decisão → fonte, com um detalhe que não é opcional: quando a fonte
 * falha e existe cópia velha, **serve a velha em vez de errar**. A ficha diz
 * a data, então o visitante vê dado de 40 dias atrás rotulado como tal — o
 * que é melhor do que "a Receita está fora do ar" quando temos a resposta.
 *
 * A exceção é `COMPANY_NOT_FOUND`: se a fonte afirma que o CNPJ não existe,
 * isso é informação nova sobre o mundo e ganha do cache. Servir a cópia velha
 * aí seria esconder uma baixa cadastral.
 */
async function resolverPorCnpj(
  cnpjDigits: string,
  domainPedido: string | null,
  agora: Date,
): Promise<FichaResult> {
  const row = await readCachedFicha(cnpjDigits);
  const decisao = decideFromCache(row, agora);
  const cacheServivel = row ? isFresh(row.fetchedAt, agora) : false;
  const stackDecisao = decideStackFromCache(row, domainPedido, cacheServivel);

  // O portão da quota fica AQUI, depois de as duas decisões de cache saírem e antes
  // de qualquer `fetch`. É o único ponto do fluxo em que se sabe se a consulta vai
  // custar saída de rede — e a unidade contada é isso, não requisição.
  //
  // Nega a consulta inteira, inclusive quando só a stack precisaria de rede e o
  // cadastro estava em cache. A alternativa era servir o cadastro com `stack: null`,
  // e ela é pior por um motivo de tipo: `null` significa "nem tentou" (armadilha 5
  // do GLOSSARIO), e usá-lo para "não te deixei tentar" faz o visitante que digitou
  // um site receber silêncio sem explicação. Frase clara ganha de ficha parcial muda.
  if (decisao.action === "refetch" || stackDecisao.action === "fetch") {
    // `anonimo` fixo: a área logada é a Fase 8, e é lá que este argumento passa a
    // depender de quem está pedindo.
    const quota = await consumirQuota("anonimo", agora);
    if (quota.action === "deny") {
      return { status: "error", error: quotaErro(quota.reason) };
    }
  }

  // A stack roda em paralelo com o cadastro: são fontes independentes, e
  // esperar uma pela outra só soma latência.
  const stackPromise = resolverStack(stackDecisao);

  if (decisao.action === "serve") {
    const { stack, domain, leuAgora } = await stackPromise;
    const ficha: Ficha = { ...decisao.ficha, stack, domain };
    if (leuAgora) await writeCachedFicha(ficha);
    return { status: "ok", ficha };
  }

  const res = await fetchCnpj(cnpjDigits);
  if (!res.ok) {
    const erro = mapFetchError(res.error);
    if (decisao.stale && erro !== "COMPANY_NOT_FOUND") {
      const { stack, domain } = await stackPromise;
      return { status: "ok", ficha: { ...decisao.stale, stack, domain } };
    }
    // A leitura do site não interessa mais, mas precisa ser aguardada para não
    // deixar promessa solta no Worker.
    await stackPromise.catch(() => {});
    return { status: "error", error: erro };
  }

  const { stack, domain } = await stackPromise;
  const ficha: Ficha = {
    ...fichaFromSource(cnpjDigits, extractEnrichment(res.raw), agora),
    stack,
    domain,
  };
  // Gravar é otimização: se falhar, o visitante já tem a resposta na mão.
  await writeCachedFicha(ficha);
  return { status: "ok", ficha };
}

const GetFichaSchema = z.object({
  query: z.string().min(1).max(120),
  /** Site da empresa, opcional. Sem ele não há tecnografia — e isso é `null`,
   *  não erro: "nem tentou" é diferente de "leu e não achou". */
  domain: z.string().max(253).optional(),
});

export const getFichaFn = createServerFn({ method: "POST" })
  .validator((d) => GetFichaSchema.parse(d))
  .handler(async ({ data }): Promise<FichaResult> => {
    const query = data.query.trim();
    if (!query) return { status: "error", error: "INVALID_CNPJ" };

    // Normaliza aqui, na borda: o núcleo e o adapter recebem host, nunca o que
    // o visitante digitou. `null` quando não dá para extrair host — campo
    // opcional preenchido com lixo não deve virar erro da consulta.
    const domain = data.domain ? normalizeDomain(data.domain) : null;

    // Um `agora` só para a requisição inteira: assim a decisão de frescor e o
    // carimbo do que for gravado não podem discordar por milissegundos.
    const agora = new Date();

    // Parece CNPJ (mesmo incompleto)? Então o erro certo é de CNPJ, não de
    // nome: quem digitou 13 dígitos quer saber que faltou um.
    if (looksLikeCnpj(query)) {
      if (!isValidCnpj(query)) return { status: "error", error: "INVALID_CNPJ" };
      return resolverPorCnpj(cleanCnpj(query), domain, agora);
    }

    // Busca por nome depende de fonte com índice textual, que não existe nas
    // gratuitas — ver a nota em `searchCnpjByName`. O erro é específico para a
    // tela poder pedir o CNPJ em vez de culpar a Receita.
    const busca = await searchCnpjByName(query);
    if (!busca.ok) {
      if (busca.error === "unavailable")
        return { status: "error", error: "NAME_SEARCH_UNAVAILABLE" };
      if (busca.error === "none_found") return { status: "error", error: "NAME_NO_MATCH" };
      if (busca.error === "rate_limited") return { status: "error", error: "SOURCE_RATE_LIMITED" };
      return { status: "error", error: "SOURCE_UNAVAILABLE" };
    }

    // Um único candidato com CNPJ completo dispensa a escolha.
    const unico = busca.matches.length === 1 ? busca.matches[0] : null;
    if (unico && isValidCnpj(unico.cnpj)) {
      return resolverPorCnpj(cleanCnpj(unico.cnpj), domain, agora);
    }

    return { status: "choose", matches: busca.matches };
  });

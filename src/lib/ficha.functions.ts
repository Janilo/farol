/**
 * Fatia vertical da consulta. Orquestra: valida, resolve nome → CNPJ quando
 * preciso, chama a fonte e devolve a ficha montada.
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
import { decideFromCache, fichaFromSource, type Ficha } from "./ficha";
import { readCachedFicha, writeCachedFicha } from "./ficha.server";

export type FichaError =
  | "INVALID_CNPJ"
  | "COMPANY_NOT_FOUND"
  | "NAME_NO_MATCH"
  | "NAME_SEARCH_UNAVAILABLE"
  | "SOURCE_RATE_LIMITED"
  | "SOURCE_UNAVAILABLE";

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
 * Cache → decisão → fonte, com um detalhe que não é opcional: quando a fonte
 * falha e existe cópia velha, **serve a velha em vez de errar**. A ficha diz
 * a data, então o visitante vê dado de 40 dias atrás rotulado como tal — o
 * que é melhor do que "a Receita está fora do ar" quando temos a resposta.
 *
 * A exceção é `COMPANY_NOT_FOUND`: se a fonte afirma que o CNPJ não existe,
 * isso é informação nova sobre o mundo e ganha do cache. Servir a cópia velha
 * aí seria esconder uma baixa cadastral.
 */
async function resolverPorCnpj(cnpjDigits: string, agora: Date): Promise<FichaResult> {
  const decisao = decideFromCache(await readCachedFicha(cnpjDigits), agora);
  if (decisao.action === "serve") return { status: "ok", ficha: decisao.ficha };

  const res = await fetchCnpj(cnpjDigits);
  if (!res.ok) {
    const erro = mapFetchError(res.error);
    if (decisao.stale && erro !== "COMPANY_NOT_FOUND") {
      return { status: "ok", ficha: decisao.stale };
    }
    return { status: "error", error: erro };
  }

  const ficha = fichaFromSource(cnpjDigits, extractEnrichment(res.raw), agora);
  // Gravar é otimização: se falhar, o visitante já tem a resposta na mão.
  await writeCachedFicha(ficha.cnpj, ficha.enrichment, ficha.fetchedAt);
  return { status: "ok", ficha };
}

const GetFichaSchema = z.object({ query: z.string().min(1).max(120) });

export const getFichaFn = createServerFn({ method: "POST" })
  .validator((d) => GetFichaSchema.parse(d))
  .handler(async ({ data }): Promise<FichaResult> => {
    const query = data.query.trim();
    if (!query) return { status: "error", error: "INVALID_CNPJ" };

    // Um `agora` só para a requisição inteira: assim a decisão de frescor e o
    // carimbo do que for gravado não podem discordar por milissegundos.
    const agora = new Date();

    // Parece CNPJ (mesmo incompleto)? Então o erro certo é de CNPJ, não de
    // nome: quem digitou 13 dígitos quer saber que faltou um.
    if (looksLikeCnpj(query)) {
      if (!isValidCnpj(query)) return { status: "error", error: "INVALID_CNPJ" };
      return resolverPorCnpj(cleanCnpj(query), agora);
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
      return resolverPorCnpj(cleanCnpj(unico.cnpj), agora);
    }

    return { status: "choose", matches: busca.matches };
  });

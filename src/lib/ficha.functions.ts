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
import { extractEnrichment, type Enrichment } from "./enrichment";
import { fetchCnpj, searchCnpjByName, type NameMatch } from "./enrichment.server";

export type FichaError =
  | "INVALID_CNPJ"
  | "COMPANY_NOT_FOUND"
  | "NAME_NO_MATCH"
  | "NAME_SEARCH_UNAVAILABLE"
  | "SOURCE_RATE_LIMITED"
  | "SOURCE_UNAVAILABLE";

export type FichaResult =
  | { status: "ok"; enrichment: Enrichment }
  | { status: "choose"; matches: NameMatch[] }
  | { status: "error"; error: FichaError };

/** Traduz a falha do adapter no código de erro do domínio. */
function mapFetchError(error: "not_found" | "rate_limited" | "upstream_down" | "invalid_response") {
  if (error === "not_found") return "COMPANY_NOT_FOUND" as const;
  if (error === "rate_limited") return "SOURCE_RATE_LIMITED" as const;
  return "SOURCE_UNAVAILABLE" as const;
}

const GetFichaSchema = z.object({ query: z.string().min(1).max(120) });

export const getFichaFn = createServerFn({ method: "POST" })
  .validator((d) => GetFichaSchema.parse(d))
  .handler(async ({ data }): Promise<FichaResult> => {
    const query = data.query.trim();
    if (!query) return { status: "error", error: "INVALID_CNPJ" };

    // Parece CNPJ (mesmo incompleto)? Então o erro certo é de CNPJ, não de
    // nome: quem digitou 13 dígitos quer saber que faltou um.
    if (looksLikeCnpj(query)) {
      if (!isValidCnpj(query)) return { status: "error", error: "INVALID_CNPJ" };
      const res = await fetchCnpj(cleanCnpj(query));
      if (!res.ok) return { status: "error", error: mapFetchError(res.error) };
      return { status: "ok", enrichment: extractEnrichment(res.raw) };
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
      const res = await fetchCnpj(cleanCnpj(unico.cnpj));
      if (!res.ok) return { status: "error", error: mapFetchError(res.error) };
      return { status: "ok", enrichment: extractEnrichment(res.raw) };
    }

    return { status: "choose", matches: busca.matches };
  });

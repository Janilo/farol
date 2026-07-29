/**
 * Adapter do cache. Fino como o `enrichment.server.ts`: aqui mora o I/O com o
 * Postgres, e a decisão de servir ou rebuscar é do núcleo puro em `ficha.ts`.
 *
 * Uma regra governa este arquivo inteiro: **o cache nunca derruba a consulta.**
 * Toda função devolve o estado degradado em vez de lançar. Se o Supabase
 * estiver fora, o Farol vira o que era na Fase 2 — mais lento, não quebrado.
 * É por isso que não há `throw` aqui e há `console.error` em todo `catch`: a
 * falha some da tela e tem que aparecer no log.
 *
 * Sobre `supabaseAdmin` e RLS — ver o bloco em SEGURANCA.md. Resumo: esta
 * tabela não tem dono e o conteúdo é cadastro público, então não há
 * autorização a checar. O que este arquivo garante é a outra ponta: só se
 * escreve o que `fetchCnpj` devolveu, nunca payload vindo do cliente.
 */
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import type { Enrichment } from "./enrichment";
import type { CachedRow } from "./ficha";

/**
 * Guarda de forma na leitura. O cache guarda o `Enrichment` já interpretado,
 * então uma mudança em `extractEnrichment` deixa linhas antigas com a forma
 * velha — e sem esta checagem elas seriam servidas como se fossem atuais,
 * com campos `undefined` chegando na tela.
 *
 * Confere só o esqueleto que a tela consome sem checar: o resto pode ser nulo
 * de origem. Forma velha vira miss, e o miss rebusca. Barato e silencioso na
 * direção certa: prefere trabalho a mentira.
 */
const EnrichmentShape = z.object({
  cnpj: z.string(),
  cnpjFormatted: z.string(),
  legalName: z.string(),
  porte: z.string(),
  partners: z.array(z.object({ name: z.string(), isAdmin: z.boolean() })),
});

/**
 * Lê a linha do cache. `null` significa "siga sem cache" e cobre três casos
 * que o chamador não precisa distinguir: não existe, o banco falhou, ou a
 * forma guardada não é mais a de hoje.
 */
export async function readCachedFicha(cnpjDigits: string): Promise<CachedRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("fichas")
      .select("cnpj, enrichment, fetched_at")
      .eq("cnpj", cnpjDigits)
      .maybeSingle();

    if (error) {
      console.error("[farol] falha ao ler cache de ficha", cnpjDigits, error.message);
      return null;
    }
    if (!data) return null;

    if (!EnrichmentShape.safeParse(data.enrichment).success) {
      console.error("[farol] cache com forma antiga, tratando como miss", cnpjDigits);
      return null;
    }

    return {
      cnpj: data.cnpj,
      enrichment: data.enrichment as unknown as Enrichment,
      fetchedAt: data.fetched_at,
    };
  } catch (e) {
    console.error("[farol] erro inesperado ao ler cache de ficha", cnpjDigits, e);
    return null;
  }
}

/**
 * Grava o que acabou de vir da fonte. Não devolve nada e não lança: gravar é
 * otimização, e falhar em otimizar não é falhar em responder.
 *
 * `upsert` porque a chave é o CNPJ e reescrever é o comportamento certo — a
 * linha nova é mais recente por construção.
 */
export async function writeCachedFicha(
  cnpjDigits: string,
  enrichment: Enrichment,
  fetchedAt: string,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("fichas").upsert(
      {
        cnpj: cnpjDigits,
        // `Enrichment` é serializável por construção (só string/número/nulo e
        // arrays disso), mas o TS não consegue provar isso contra `Json`.
        enrichment: enrichment as unknown as Json,
        fetched_at: fetchedAt,
      },
      { onConflict: "cnpj" },
    );
    if (error) console.error("[farol] falha ao gravar cache de ficha", cnpjDigits, error.message);
  } catch (e) {
    console.error("[farol] erro inesperado ao gravar cache de ficha", cnpjDigits, e);
  }
}

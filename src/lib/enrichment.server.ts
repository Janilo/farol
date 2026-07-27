/**
 * Adapter da fonte de cadastro. Fino de propósito: aqui mora o I/O e a
 * tradução de falha em estado; a interpretação do payload é do núcleo puro
 * em `enrichment.ts`.
 *
 * A fonte é pública e gratuita, então o padrão é falhar com estado nomeado em
 * vez de exceção: a ficha ainda tem valor sem uma das partes, e "a Receita
 * está fora do ar" é uma frase diferente de "essa empresa não existe".
 */
import type { BrasilApiCnpj } from "./enrichment";

const BRASIL_API = "https://brasilapi.com.br/api/cnpj/v1";
const TIMEOUT_MS = 10_000;

export type FetchCnpjResult =
  | { ok: true; raw: BrasilApiCnpj }
  | { ok: false; error: "not_found" | "rate_limited" | "upstream_down" | "invalid_response" };

async function getJson(
  url: string,
  timeoutMs = TIMEOUT_MS,
): Promise<{ status: number; body: unknown } | { status: -1; body: null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json", "user-agent": "Farol/1.0 (+pereirasaraiva.com)" },
    });
    // 404 tem corpo de erro; ler o JSON só quando vale
    const body = res.status === 200 ? await res.json() : null;
    return { status: res.status, body };
  } catch (e) {
    // abort (timeout), DNS, TLS, corpo não-JSON — indistinguíveis para o
    // chamador, mas a causa vai para o log: é a única pista de operação.
    console.error("[farol] falha ao consultar fonte pública", url, e);
    return { status: -1, body: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cadastro por CNPJ. Um retry em 429, porque a fonte é compartilhada e o
 * limite dela é por IP: o segundo tento costuma passar.
 */
export async function fetchCnpj(cnpjDigits: string): Promise<FetchCnpjResult> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const { status, body } = await getJson(`${BRASIL_API}/${cnpjDigits}`);

    if (status === 200) {
      if (!body || typeof body !== "object") return { ok: false, error: "invalid_response" };
      const raw = body as BrasilApiCnpj;
      // Sem razão social o registro não serve para nada na tela.
      if (!raw.razao_social) return { ok: false, error: "invalid_response" };
      return { ok: true, raw };
    }
    if (status === 404) return { ok: false, error: "not_found" };
    if (status === 429) {
      if (tentativa === 0) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      return { ok: false, error: "rate_limited" };
    }
    return { ok: false, error: "upstream_down" };
  }
  return { ok: false, error: "rate_limited" };
}

export interface NameMatch {
  cnpj: string;
  legalName: string;
  tradeName: string | null;
}

export type SearchByNameResult =
  | { ok: true; matches: NameMatch[] }
  | { ok: false; error: "none_found" | "rate_limited" | "upstream_down" | "unavailable" };

/**
 * Busca por nome — NÃO IMPLEMENTADA, e isso é um fato sobre as fontes, não
 * uma pendência de código.
 *
 * O plano previa `publica.cnpj.ws/cnpj/search`, herdado de
 * `Clientes/Leads/enriquecer_cnpj.py:118`. Testado ao vivo em 27/jul/2026:
 * a rota devolve `400 {"detalhes":"CNPJ inválido"}` — ela interpreta
 * "search" como um CNPJ no path. O endpoint não existe, e nunca existiu:
 * a busca por nome do script Python também nunca funcionou.
 *
 * Devolver `unavailable` em vez de tentar e falhar é deliberado. Chamar uma
 * rota inexistente faria a tela dizer "a fonte da Receita está fora do ar",
 * culpando a Receita por um defeito nosso.
 *
 * Para implementar de verdade, é preciso uma fonte com busca textual:
 * cnpj.ws em plano pago, Casa dos Dados, ou o dataset do Minha Receita
 * carregado localmente (o fallback que `farol.md` já prevê para a Brasil API).
 */
export async function searchCnpjByName(_nome: string): Promise<SearchByNameResult> {
  return { ok: false, error: "unavailable" };
}

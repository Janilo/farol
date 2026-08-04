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

/* ------------------------------------------------------------------ *
 * Busca por nome: NÃO EXISTE, e o código não finge que existe
 * ------------------------------------------------------------------ *
 *
 * Havia aqui um `searchCnpjByName` que devolvia `unavailable` incondicionalmente,
 * mais o tipo `NameMatch` e a união `SearchByNameResult`. **Removidos em
 * 03/ago/2026** (achado A2 da auditoria de arquitetura).
 *
 * O stub não era inofensivo. Ele sustentava, rio abaixo, um estado `choose` na
 * fatia, um código `NAME_NO_MATCH` e uma tela de seleção de candidatos — toda
 * uma estrutura afirmando que o produto tem um recurso que ele não tem. Foi essa
 * mesma afirmação que sobreviveu na home até 03/ago prometendo "até cinco
 * candidatos com razão social", contradizendo a própria `/demo`.
 *
 * **O fato sobre as fontes, que é o que importa preservar:** o plano previa
 * `publica.cnpj.ws/cnpj/search`, herdado de `Clientes/Leads/enriquecer_cnpj.py`.
 * Testado ao vivo em 27/jul/2026, a rota devolve `400 {"detalhes":"CNPJ
 * inválido"}` — ela interpreta "search" como um CNPJ no path. O endpoint não
 * existe e nunca existiu; a busca por nome daquele script Python também nunca
 * funcionou.
 *
 * **Para implementar de verdade** é preciso uma fonte com índice textual:
 * cnpj.ws em plano pago, Casa dos Dados, ou o dataset do Minha Receita carregado
 * localmente (o fallback que `farol.md` já prevê para a Brasil API). Quando essa
 * fonte existir, o lugar de começar é aqui — e aí sim os tipos rio abaixo voltam,
 * junto com a função que os honra.
 */

/**
 * Adapter da leitura do site. Fino: aqui mora o I/O, o teto de bytes, o timeout
 * e a tradução de falha em estado. A redução do HTML a `PageSnapshot` e a
 * detecção são puras, em `technographics.ts`.
 *
 * Erro é estado de primeira classe, não exceção: `unreachable | timeout |
 * blocked`, cada um com uma frase própria na tela. **Ficha sem stack nunca
 * quebra** — o cadastro da Receita não depende disto.
 *
 * ## O redirecionamento é seguido à mão, e isso é segurança
 *
 * `fetch` segue redirect por padrão, e isso furaria o portão de SSRF: bastaria
 * um domínio público devolver `302 → http://169.254.169.254/` para o servidor
 * buscar o endpoint de metadados da nuvem em nome de quem pediu. Aqui o redirect
 * é `manual` e **cada salto passa por `isAllowedTarget` de novo**, com teto de
 * saltos. Validar só o endereço digitado é a forma clássica de achar que se
 * defendeu.
 *
 * ## Só HTTPS
 *
 * Não há queda para `http`. Duas razões: o servidor não deve emitir requisição
 * em texto claro em nome de terceiro, e site de empresa sem HTTPS em 2026 é
 * sinal por si — `unreachable` é resposta honesta.
 */
import {
  extractSnapshot,
  isAllowedTarget,
  type PageSnapshot,
  type SiteFetchError,
} from "./technographics";

const TIMEOUT_MS = 8_000;
/**
 * Teto do corpo lido. Página maior é truncada, não recusada.
 *
 * Era 500 KB e **isso causava falso negativo silencioso**, medido em 30/jul/2026:
 * `farmrio.com.br` devolve 609.886 bytes de HTML, e a única ocorrência de
 * `vtexassets.com` — que o fingerprint do VTEX já casava — está no byte 609.358.
 * Fora do teto por 98 KB. O detector dizia `empty`, que na tela significa "li o
 * site e não achei nada", quando o certo era "li menos da metade do site".
 *
 * Vitrine moderna embute JSON grande no documento (a Farm roda deco.cx), então
 * as URLs de CDN do fornecedor caem no fim. Truncar por tamanho é razoável;
 * truncar em 500 KB não é.
 *
 * 2 MB cobre a Farm com folga de 3×. O custo é CPU de regex sobre mais bytes —
 * o teste `extractSnapshot aguenta documento no teto` mede isso e falha se passar
 * de um segundo.
 */
export const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SALTOS = 3;

export type FetchSiteResult =
  | { ok: true; snapshot: PageSnapshot; finalUrl: string; truncated: boolean }
  | { ok: false; error: SiteFetchError };

/**
 * Lê o corpo até o teto e para. `response.text()` não tem teto, então uma página
 * de 80 MB viraria 80 MB de memória no Worker. O reader existe nos dois
 * runtimes (Node 18+ e `workerd`).
 */
async function readCapped(res: Response): Promise<{ html: string; truncated: boolean }> {
  if (!res.body) return { html: "", truncated: false };
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let total = 0;
  let html = "";
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const restante = MAX_BYTES - total;
      if (value.byteLength >= restante) {
        html += decoder.decode(value.subarray(0, restante), { stream: false });
        truncated = true;
        break;
      }
      total += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
  } finally {
    // Cancelar solta a conexão quando saímos pelo teto, em vez de deixar o
    // corpo escoando à toa.
    await reader.cancel().catch(() => {});
  }
  return { html, truncated };
}

function classificarStatus(status: number): SiteFetchError | null {
  // Recusa deliberada de leitura: o site está de pé e não quer ser lido.
  if (status === 401 || status === 403 || status === 429 || status === 451) return "blocked";
  if (status >= 200 && status < 300) return null;
  // 404 e 5xx caem em `unreachable`. A frase é "o site não respondeu ao endereço
  // informado", que é esticada para um 500 — ele respondeu, com erro. Deixamos
  // esticada de propósito: um quarto estado exigiria copy nova e aprovação, e o
  // efeito para quem lê é idêntico (ficha sem stack). Se a distinção passar a
  // importar, o conserto é um estado a mais e uma frase a mais, não uma gambiarra.
  return "unreachable";
}

function ehAbort(e: unknown): boolean {
  const nome = (e as { name?: string })?.name;
  return nome === "AbortError" || nome === "TimeoutError";
}

export async function fetchTargetSite(host: string): Promise<FetchSiteResult> {
  if (!isAllowedTarget(host)) return { ok: false, error: "unreachable" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    let url = `https://${host}/`;

    for (let salto = 0; salto <= MAX_SALTOS; salto++) {
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "accept-language": "pt-BR,pt;q=0.9",
          "user-agent": "Farol/1.0 (+https://farol.pereirasaraiva.com)",
        },
      });

      // 3xx com Location: revalida o destino antes de ir.
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return { ok: false, error: "unreachable" };
        let proximo: URL;
        try {
          proximo = new URL(location, url);
        } catch {
          return { ok: false, error: "unreachable" };
        }
        if (proximo.protocol !== "https:") return { ok: false, error: "unreachable" };
        if (!isAllowedTarget(proximo.hostname)) {
          console.error("[farol] redirect para alvo não permitido", host, "→", proximo.hostname);
          return { ok: false, error: "unreachable" };
        }
        url = proximo.toString();
        continue;
      }

      const falha = classificarStatus(res.status);
      if (falha) return { ok: false, error: falha };

      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });

      // `getSetCookie` é o único jeito de ver múltiplos Set-Cookie; onde não
      // existe, o `get` devolve o primeiro (ou os concatenados).
      const setCookies =
        typeof res.headers.getSetCookie === "function"
          ? res.headers.getSetCookie()
          : (res.headers.get("set-cookie") ?? "").split(/,(?=[^;]+=)/).filter(Boolean);

      const { html, truncated } = await readCapped(res);
      return {
        ok: true,
        snapshot: extractSnapshot(html, headers, setCookies),
        finalUrl: url,
        truncated,
      };
    }

    // Passou do teto de saltos: cadeia de redirect longa demais.
    return { ok: false, error: "unreachable" };
  } catch (e) {
    if (ehAbort(e)) return { ok: false, error: "timeout" };
    // DNS, TLS, conexão recusada, corpo ilegível — indistinguíveis para quem
    // chama, mas a causa vai para o log: é a única pista de operação.
    console.error("[farol] falha ao ler site alvo", host, e);
    return { ok: false, error: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

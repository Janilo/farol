/**
 * Detecção de tecnografia — núcleo puro. Sem rede, sem DOM, sem relógio: recebe
 * um retrato do documento e devolve o que casou e por qual via.
 *
 * O adapter (`technographics.server.ts`) é quem busca a página e a reduz ao
 * `PageSnapshot`. Essa fronteira é o que torna a detecção testável: os testes
 * montam retratos à mão, incluindo os patológicos que nenhum site real serviria
 * na hora certa.
 *
 * ---
 *
 * ## As quatro correções sobre o detector Python
 *
 * O motor original (`Clientes/Leads/detectar_tecnografias.py`) casava tudo
 * contra `html_lower` — o documento inteiro em minúsculas. Isso produz quatro
 * defeitos, e o roadmap tinha mapeado três. O quarto é o mais grave.
 *
 * **1. `dom` era substring no HTML inteiro.** O Python fazia
 * `selector.lstrip("#.")` e procurava o resto em qualquer lugar do documento.
 * Errava nas duas direções: `.vtex` casava com a palavra "vtex" em prosa, num
 * comentário ou na menção a um concorrente; e `[data-pix]` sobrevivia ao
 * `lstrip` inteiro, então procurava a string literal `[data-pix]`, que nunca
 * aparece no HTML — o atributo real é `data-pix="…"`. Aqui os seletores são
 * casados contra listas extraídas: `id`, tokens de `class`, nomes de `data-*`.
 *
 * **2. `cookies` era substring no HTML.** Nome de cookie procurado no corpo da
 * página, não nos `Set-Cookie`. Aqui casa contra os nomes de cookie reais.
 *
 * **3. `implies` dependia da ordem de iteração** do dicionário. Aqui a
 * propagação roda até ponto fixo, então a ordem não importa.
 *
 * **4. `implies` estava INVERTIDO** — este o roadmap não previu. O JSON diz
 * `Stone: implies: ["Pagar.me"]`, que na convenção do Wappalyzer significa "se
 * Stone foi detectado, Pagar.me também está presente". O Python fazia
 * `if implied in detected: matched = True`, isto é, concluía **Stone** a partir
 * de Pagar.me. Inferência errada: Pagar.me existe sem Stone (é o adquirido, não
 * o adquirente). Aqui a direção é a do JSON.
 *
 * E uma quinta, que era da base e não do código: o padrão de PIX era o literal
 * `pix`, que casa com `pixel.gif` e `pixi.js`. PIX saiu do catálogo — ver
 * `fingerprints.ts`.
 *
 * ## O que NÃO roda: detecção por CNAME
 *
 * Oito dos 23 fingerprints têm `cname` (Sankhya, Omie, Conta Azul, Loja
 * Integrada, VTEX, PipeRun, Moskit, Ploomes). Resolver CNAME exige uma chamada
 * DNS-over-HTTPS por consulta, e ficou para depois. **Isso custa sensibilidade,
 * não cobertura:** os oito têm padrão de `scripts` também, então nenhuma
 * ferramenta fica indetectável — só fica mais difícil de achar quando a empresa
 * usa o produto em subdomínio próprio sem carregar script do fornecedor.
 */
import { FINGERPRINTS, POR_NOME, type DetectionVia, type Fingerprint } from "./fingerprints";

/**
 * O documento reduzido ao que a detecção precisa. Serializável de propósito:
 * é isso que vai para o `technographics jsonb` do cache e o que os testes
 * montam à mão.
 */
export interface PageSnapshot {
  /** URLs de `src`, `href` e `action` encontradas no documento. */
  urls: string[];
  /** Valores de `id`. */
  ids: string[];
  /** Tokens de `class`, já separados por espaço. */
  classes: string[];
  /** Nomes de atributos `data-*`, com o prefixo. */
  dataAttributes: string[];
  /** Headers da resposta, nomes em minúscula. */
  headers: Record<string, string>;
  /** `name` ou `property` da meta, em minúscula → `content`. */
  metas: Record<string, string>;
  /** Nomes de cookie vindos dos `Set-Cookie`. */
  cookieNames: string[];
}

export interface Detection {
  tool: string;
  category: string;
  via: DetectionVia;
  /**
   * O que casou. Existe porque este produto vende procedência: sem isso, "VTEX
   * detectado" é uma afirmação sem lastro que ninguém pode conferir.
   */
  evidence: string;
}

/** Retrato vazio — o ponto de partida do adapter e dos testes. */
export function emptySnapshot(): PageSnapshot {
  return {
    urls: [],
    ids: [],
    classes: [],
    dataAttributes: [],
    headers: {},
    metas: {},
    cookieNames: [],
  };
}

/* ------------------------------------------------------------------ *
 * Domínio: normalização e o portão de SSRF
 * ------------------------------------------------------------------ */

/**
 * Reduz o que o visitante digitou a um host. Aceita com ou sem protocolo, com
 * caminho, com `www`. Devolve `null` quando não dá para extrair host.
 */
export function normalizeDomain(entrada: string): string | null {
  const bruto = entrada.trim().toLowerCase();
  if (!bruto) return null;
  const comEsquema = /^[a-z][a-z0-9+.-]*:\/\//.test(bruto) ? bruto : `https://${bruto}`;
  let host: string;
  try {
    host = new URL(comEsquema).hostname;
  } catch {
    return null;
  }
  if (host.startsWith("www.")) host = host.slice(4);
  return host || null;
}

/**
 * O portão de SSRF. O visitante escolhe um endereço e **o servidor busca**, então
 * sem isto a demo é um proxy para a rede interna de quem hospeda: bastaria pedir
 * `169.254.169.254` para tentar o endpoint de metadados da nuvem, ou
 * `localhost` para varrer o que roda ao lado.
 *
 * A regra é grosseira de propósito: **exige nome de domínio com TLD e rejeita
 * todo literal de IP.** Empresa tem domínio; ninguém digita o IP da própria
 * loja. Recusar IP de uma vez mata a classe inteira de endereço interno sem
 * precisar acertar cada faixa reservada — que é onde essas listas costumam
 * falhar por uma faixa esquecida.
 */
export function isAllowedTarget(host: string): boolean {
  if (!host || host.length > 253) return false;
  // Literal de IPv6 (o URL devolve entre colchetes) ou IPv4 puro.
  if (host.startsWith("[") || host.includes(":")) return false;
  if (/^\d+(\.\d+)*$/.test(host)) return false;
  // Precisa de rótulo + TLD alfabético de 2+ letras.
  if (!/^([a-z0-9](-*[a-z0-9])*\.)+[a-z]{2,}$/.test(host)) return false;
  // Sufixos que nomeiam rede interna, não a internet pública.
  const internos = [
    ".localhost",
    ".local",
    ".internal",
    ".intranet",
    ".home.arpa",
    ".test",
    ".invalid",
    ".example",
  ];
  if (internos.some((s) => host.endsWith(s))) return false;
  return true;
}

/* ------------------------------------------------------------------ *
 * HTML → retrato
 * ------------------------------------------------------------------ */

const RE_URL = /\b(?:src|href|action|data-src)\s*=\s*["']([^"']{1,2048})["']/gi;
const RE_ID = /\bid\s*=\s*["']([^"']{1,256})["']/gi;
const RE_CLASS = /\bclass\s*=\s*["']([^"']{1,2048})["']/gi;
const RE_DATA_ATTR = /\s(data-[a-z0-9-]{1,64})\s*=/gi;
const RE_META = /<meta\b[^>]*>/gi;
const RE_META_NOME = /\b(?:name|property)\s*=\s*["']([^"']{1,128})["']/i;
const RE_META_CONTEUDO = /\bcontent\s*=\s*["']([^"']{0,2048})["']/i;

function unicos(valores: string[], limite: number): string[] {
  return [...new Set(valores)].slice(0, limite);
}

/**
 * Decodifica as cinco entidades que aparecem em atributo de HTML real. `&amp;`
 * é a que importa: sem isto a evidência mostrada no tooltip sai como
 * `...?locale=pt-BR&amp;trial_origin=...` — visto ao sondar o rdstation.com.
 * Não muda detecção nenhuma (as regexes casam o domínio), muda a procedência
 * que o visitante lê, e procedência garbulhada é procedência que não convence.
 */
function decodeEntities(v: string): string {
  return v
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/**
 * Extrai o retrato do HTML por expressão regular, e não com um parser.
 *
 * Por que não `HTMLRewriter`, que seria o caminho nativo da Cloudflare: ele não
 * existe no Node, então `pnpm dev` quebraria e o desenvolvimento deixaria de
 * exercitar este caminho. Paridade entre dev e produção vale mais aqui do que
 * elegância de parser — o alvo é curto (atributos e `<meta>`) e o corpo já vem
 * limitado pelo teto de bytes do adapter.
 *
 * O que se perde ao não ter árvore: aninhamento e ordem. A detecção não usa
 * nenhum dos dois — os seletores do catálogo são todos de elemento isolado.
 */
export function extractSnapshot(
  html: string,
  headers: Record<string, string> = {},
  setCookies: string[] = [],
): PageSnapshot {
  const urls: string[] = [];
  for (const m of html.matchAll(RE_URL)) urls.push(decodeEntities(m[1]));

  const ids: string[] = [];
  for (const m of html.matchAll(RE_ID)) ids.push(m[1].trim());

  const classes: string[] = [];
  for (const m of html.matchAll(RE_CLASS)) {
    for (const token of m[1].split(/\s+/)) if (token) classes.push(token);
  }

  const dataAttributes: string[] = [];
  for (const m of html.matchAll(RE_DATA_ATTR)) dataAttributes.push(m[1].toLowerCase());

  const metas: Record<string, string> = {};
  for (const tag of html.match(RE_META) ?? []) {
    const nome = RE_META_NOME.exec(tag)?.[1];
    const conteudo = RE_META_CONTEUDO.exec(tag)?.[1];
    if (nome && conteudo !== undefined) metas[nome.trim().toLowerCase()] = conteudo;
  }

  // `Set-Cookie: nome=valor; Path=/` → só o nome interessa.
  const cookieNames = setCookies
    .map((c) => c.split("=")[0]?.trim())
    .filter((c): c is string => Boolean(c));

  const headersMinusculos: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) headersMinusculos[k.toLowerCase()] = v;

  // Tetos por lista: página hostil com cem mil classes não vira consulta lenta.
  return {
    urls: unicos(urls, 3000),
    ids: unicos(ids, 3000),
    classes: unicos(classes, 5000),
    dataAttributes: unicos(dataAttributes, 1000),
    headers: headersMinusculos,
    metas,
    cookieNames: unicos(cookieNames, 200),
  };
}

/** Compila sem estourar: padrão inválido no catálogo vira "não casa". */
function safeRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

/**
 * As três formas de seletor que o catálogo usa. Qualquer outra devolve `null`,
 * e há teste sobre os dados reais para que um seletor novo fora dessas formas
 * quebre o CI em vez de nunca casar em silêncio.
 */
function parseSelector(selector: string): { kind: "id" | "class" | "attr"; value: string } | null {
  if (/^#[A-Za-z0-9_-]+$/.test(selector)) return { kind: "id", value: selector.slice(1) };
  if (/^\.[A-Za-z0-9_-]+$/.test(selector)) return { kind: "class", value: selector.slice(1) };
  if (/^\[[A-Za-z0-9_-]+\]$/.test(selector)) return { kind: "attr", value: selector.slice(1, -1) };
  return null;
}

/** Todos os seletores de `dom` do catálogo são de forma suportada? */
export function unsupportedSelectors(fingerprints: Fingerprint[] = FINGERPRINTS): string[] {
  return fingerprints.flatMap((f) => f.dom.filter((s) => parseSelector(s) === null));
}

type Hit = { via: DetectionVia; evidence: string } | null;

/** Header: valor vazio no catálogo significa "basta o header existir". */
function matchHeaders(f: Fingerprint, page: PageSnapshot): Hit {
  for (const [nome, padrao] of Object.entries(f.headers)) {
    const valor = page.headers[nome.toLowerCase()];
    if (valor === undefined) continue;
    if (!padrao) return { via: "header", evidence: nome };
    const re = safeRegex(padrao);
    if (re?.test(valor)) return { via: "header", evidence: `${nome}: ${valor}` };
  }
  return null;
}

function matchScripts(f: Fingerprint, page: PageSnapshot): Hit {
  for (const padrao of f.scripts) {
    const re = safeRegex(padrao);
    if (!re) continue;
    const url = page.urls.find((u) => re.test(u));
    if (url) return { via: "script", evidence: url };
  }
  return null;
}

function matchMetas(f: Fingerprint, page: PageSnapshot): Hit {
  for (const [nome, padrao] of Object.entries(f.meta)) {
    const conteudo = page.metas[nome.toLowerCase()];
    if (conteudo === undefined) continue;
    if (!padrao) return { via: "meta", evidence: nome };
    const re = safeRegex(padrao);
    if (re?.test(conteudo)) return { via: "meta", evidence: `${nome}=${conteudo}` };
  }
  return null;
}

/** Prefixo, não igualdade: o catálogo tem `jv_`, que nomeia uma família. */
function matchCookies(f: Fingerprint, page: PageSnapshot): Hit {
  for (const nome of f.cookies) {
    const alvo = nome.toLowerCase();
    const achado = page.cookieNames.find((c) => c.toLowerCase().startsWith(alvo));
    if (achado) return { via: "cookie", evidence: achado };
  }
  return null;
}

function matchDom(f: Fingerprint, page: PageSnapshot): Hit {
  for (const selector of f.dom) {
    const alvo = parseSelector(selector);
    if (!alvo) continue;
    const lista =
      alvo.kind === "id" ? page.ids : alvo.kind === "class" ? page.classes : page.dataAttributes;
    const esperado = alvo.kind === "attr" ? alvo.value.toLowerCase() : alvo.value.toLowerCase();
    if (lista.some((v) => v.toLowerCase() === esperado)) {
      return { via: "dom", evidence: selector };
    }
  }
  return null;
}

/**
 * Ordem das vias, do mais conclusivo ao mais frágil — e é ordem de **força de
 * prova**, não a do Python (que era script, header, meta, dom, cookie).
 *
 * Header proprietário como `X-VTEX` é quase conclusivo: só o próprio produto o
 * emite. Script apontando para o CDN do fornecedor é forte. `meta generator` é
 * forte mas editável. Cookie é bom sinal. Classe de CSS é o mais fraco — nome
 * de classe é escolha de quem escreveu o HTML e pode coincidir.
 *
 * Cada ferramenta aparece **uma vez**, com a via mais forte que casou, porque é
 * um marcador por chip na tela. Se um dia a UI quiser mostrar todas as vias,
 * esta função vira a que devolve a lista em vez da primeira.
 */
const VIAS = [matchHeaders, matchScripts, matchMetas, matchCookies, matchDom];

export function detectTechnologies(
  page: PageSnapshot,
  fingerprints: Fingerprint[] = FINGERPRINTS,
): Detection[] {
  const achados = new Map<string, Detection>();

  for (const f of fingerprints) {
    for (const via of VIAS) {
      const hit = via(f, page);
      if (hit) {
        achados.set(f.name, { tool: f.name, category: f.category, ...hit });
        break;
      }
    }
  }

  // Propagação de `implies` até ponto fixo. A direção é a do JSON: se X foi
  // detectado, o que X implica também está presente. Roda em laço porque uma
  // implicação pode habilitar outra; hoje existe uma só aresta
  // (Stone → Pagar.me) e converge na primeira volta. Termina sempre: o conjunto
  // só cresce e é limitado pelo catálogo, então ciclo não trava.
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const nome of [...achados.keys()]) {
      const f = POR_NOME[nome];
      if (!f) continue;
      for (const implicado of f.implies) {
        if (achados.has(implicado)) continue;
        const alvo = POR_NOME[implicado];
        if (!alvo) continue;
        achados.set(implicado, {
          tool: alvo.name,
          category: alvo.category,
          via: "implied",
          evidence: nome,
        });
        mudou = true;
      }
    }
  }

  // Ordem estável para a tela e para o cache: categoria, depois nome.
  return [...achados.values()].sort(
    (a, b) =>
      a.category.localeCompare(b.category, "pt-BR") || a.tool.localeCompare(b.tool, "pt-BR"),
  );
}

/** "1 ferramenta" / "N ferramentas" — o singular quebra em produção, não em teste. */
export function countLabel(n: number): string {
  return n === 1 ? "1 ferramenta" : `${n} ferramentas`;
}

/* ------------------------------------------------------------------ *
 * O resultado da leitura, como a ficha carrega
 * ------------------------------------------------------------------ */

/** Vive aqui, no núcleo puro, para o adapter e a tela dependerem do domínio. */
export type SiteFetchError = "unreachable" | "timeout" | "blocked";

/**
 * União discriminada em vez de dois campos opcionais. Dois opcionais
 * (`technologies?` + `error?`) deixam representar estado ilegal — ambos
 * preenchidos, ou nenhum — e perdem justamente o `empty`.
 *
 * **`empty` não é erro nem é ausência: é achado.** "Nenhuma das 23" diz que a
 * empresa não roda nada do catálogo brasileiro, o que é informação sobre a
 * empresa. Por isso a seção de stack **existe** no `empty`, com uma linha no
 * lugar dos chips, e **não existe** nos três `error`. Se sumisse nos dois, o
 * achado ficaria indistinguível de "nem tentou".
 */
export type StackResult =
  | { status: "ok"; technologies: Detection[] }
  | { status: "empty" }
  | { status: "error"; reason: SiteFetchError };

/**
 * Retrato → resultado. Existe para tornar `{ status: "ok", technologies: [] }`
 * inatingível: zero detecções é `empty`, e quem chama não escolhe.
 */
export function stackFromSnapshot(
  page: PageSnapshot,
  fingerprints: Fingerprint[] = FINGERPRINTS,
): StackResult {
  const technologies = detectTechnologies(page, fingerprints);
  return technologies.length === 0 ? { status: "empty" } : { status: "ok", technologies };
}

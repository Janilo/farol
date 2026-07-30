/**
 * Porta tipada de `Clientes/Leads/tecnografias_br.json` — as ferramentas
 * brasileiras que scanner global não reconhece. O JSON continua sendo a fonte,
 * porque é ele que o motor Python original lê.
 *
 * ⚠️ **Correção de 30/jul/2026.** Este cabeçalho dizia "este arquivo é GERADO;
 * não editar à mão, e sim regerar (o script de geração está no commit da Fase
 * 4)". A segunda metade era falsa: o script nunca foi commitado, e nenhum commit
 * do repo contém arquivo de geração. Verificado com `git log --all` sobre
 * `scripts/` e sobre todo padrão de nome plausível.
 *
 * Na prática, então: este arquivo foi gerado **uma vez** e hoje é mantido à mão.
 * Quem mudar um fingerprint tem que mudar nos DOIS lugares — aqui e no JSON —
 * senão o motor Python e o Farol passam a discordar em silêncio. Um controle
 * declarado que não existe é pior que a fuga, porque a decisão seguinte se apoia
 * nele; foi a mesma lição do `EXECUTE` do `is_approved` em SEGURANCA.md.
 *
 * **Seletor `dom` não pode ser o slug do fornecedor** (30/jul/2026). `.vtex` saiu
 * do VTEX e `.nuvemshop`/`.nuvem-shop` saíram do Nuvemshop, aqui e no JSON.
 *
 * O motivo é medido: `octadesk.com` carrega 6 classes exatamente `vtex` e 7
 * exatamente `nuvemshop` — a seção de integrações da Octadesk, que *integra* com
 * as duas e não *roda* nenhuma. O nome da classe é o slug do logotipo. Uma classe
 * chamada como o produto é o que a página de integrações de qualquer concorrente
 * vai usar, então esse seletor detecta o oposto do que promete: quem fala do
 * fornecedor, não quem o usa.
 *
 * O que fica são seletores que a plataforma **emite**: `.mercadopago-button` é
 * classe do SDK, `#jivo_chat_widget` e `#blip-chat` são ids de widget, e id não
 * vira nome de logotipo. Custo em recall: zero observado — nas 68 sondagens de
 * 30/jul, toda detecção legítima veio por `script`, nenhuma por `dom`.
 *
 * Duas diferenças deliberadas em relação à fonte, as duas registradas em
 * docs/ROADMAP.md Fase 4:
 *
 * 1. **PIX saiu do catálogo** (28/jul/2026, decisão do Janilo). O padrão era o
 *    literal `pix`, que casa com `pixel.gif`, `pixi.js`, Facebook Pixel e
 *    Pixabay — falso positivo em quase todo site. Mas o motivo de tirar não foi
 *    o padrão quebrado, que era consertável: é que PIX não discrimina nada.
 *    Praticamente todo e-commerce brasileiro aceita, então "detectei PIX" não
 *    move a priorização de conta nenhuma. E PIX é método de pagamento; as
 *    outras 23 são empresas que a companhia contratou.
 * 2. `cname` está tipado e **não é usado** pelo detector — ver a nota em
 *    `technographics.ts`.
 */

/** As vias de detecção. Mesmos nomes do glossário, verbete `detection`. */
export type DetectionVia = "script" | "header" | "meta" | "cookie" | "dom" | "implied";

export interface Fingerprint {
  name: string;
  description: string;
  website: string;
  category: string;
  /** Regex, casada contra as URLs do documento — nunca contra o HTML inteiro. */
  scripts: string[];
  /** Nome do header → regex do valor. Valor vazio significa "basta existir". */
  headers: Record<string, string>;
  /** Seletor CSS. Só três formas: `#id`, `.classe`, `[atributo]`. */
  dom: string[];
  /** Nome (ou prefixo) de cookie, casado contra `Set-Cookie` de verdade. */
  cookies: string[];
  /** `name`/`property` da meta → regex do `content`. */
  meta: Record<string, string>;
  /** Ferramentas implicadas SE esta for detectada. Direção importa. */
  implies: string[];
  /** Reservado. Detecção por CNAME não roda — ver `technographics.ts`. */
  cname: string[];
}

export const FINGERPRINTS: Fingerprint[] = [
  {
    name: "RD Station CRM",
    description: "CRM brasileiro da RD Station",
    website: "https://www.rdstation.com/crm/",
    category: "CRM",
    scripts: ["rdstation\\.com\\.br", "d335luupugsy2\\.cloudfront\\.net"],
    headers: {},
    dom: ["#rdstation-bricks-embeddable"],
    cookies: ["rdtrk"],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "RD Station Marketing",
    description: "Automação de marketing brasileira da RD Station",
    website: "https://www.rdstation.com/",
    category: "Marketing Automation",
    scripts: ["d335luupugsy2\\.cloudfront\\.net\\/js", "rdstation\\.com\\.br\\/forms"],
    headers: {},
    dom: [],
    cookies: ["rdtrk"],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "Exact Sales / Spotter",
    description: "Plataforma de sales engagement e prospecção B2B",
    website: "https://exactsales.com.br/",
    category: "Sales Engagement",
    scripts: ["exactsal\\.es", "exactsales\\.com\\.br"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "Pagar.me",
    description: "Gateway de pagamento brasileiro (Stone)",
    website: "https://pagar.me/",
    category: "Payment Processor",
    scripts: [
      "pagar\\.me",
      "pagarme\\.com\\.br",
      "assets\\.pagarme\\.com\\.br",
      "pagar\\.me\\/checkout",
    ],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "Stone",
    description: "Adquirente brasileira de pagamentos",
    website: "https://www.stone.com.br/",
    category: "Payment Processor",
    scripts: ["stone\\.com\\.br\\/sdk", "stone\\.co"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: ["Pagar.me"],
    cname: [],
  },
  {
    name: "Mercado Pago",
    description: "Plataforma de pagamentos do Mercado Livre",
    website: "https://www.mercadopago.com.br/",
    category: "Payment Processor",
    scripts: ["mercadopago\\.com", "mercadolibre\\.com\\/org-img", "mercadopago\\/v1\\/ppp"],
    headers: {},
    dom: [".mercadopago-button"],
    cookies: [],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "Cielo",
    description: "Adquirente brasileira de pagamentos",
    website: "https://www.cielo.com.br/",
    category: "Payment Processor",
    scripts: ["cielo\\.com\\.br\\/checkout", "cieloecommerce\\.cielo\\.com\\.br"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "PicPay",
    description: "Carteira digital brasileira",
    website: "https://www.picpay.com/",
    category: "Digital Wallet",
    scripts: ["picpay\\.com", "cdn\\.picpay\\.com"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "Totvs",
    description: "ERP brasileiro, líder de mercado",
    website: "https://www.totvs.com/",
    category: "ERP",
    scripts: ["totvs\\.com\\.br", "totvs\\.io", "protheus", "totvs\\/framework"],
    headers: { "X-TOTVS": "", Server: "Totvs|Protheus" },
    dom: [],
    cookies: ["TOTVSSession", "TOTVSMonitor"],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "Sankhya",
    description: "ERP brasileiro (gestão empresarial)",
    website: "https://www.sankhya.com.br/",
    category: "ERP",
    scripts: ["sankhya\\.com\\.br", "sankhya\\/mge"],
    headers: { "X-Sankhya": "", Server: "Sankhya" },
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: ["sankhya\\.com\\.br"],
  },
  {
    name: "Omie",
    description: "ERP na nuvem para PMEs brasileiras",
    website: "https://www.omie.com.br/",
    category: "ERP",
    scripts: ["omie\\.com\\.br", "app\\.omie\\.com\\.br"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: ["omie\\.com\\.br"],
  },
  {
    name: "Conta Azul",
    description: "Software de gestão financeira para PMEs",
    website: "https://contaazul.com/",
    category: "ERP / Financial",
    scripts: ["contaazul\\.com", "cdn\\.contaazul\\.com"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: ["contaazul\\.com"],
  },
  {
    name: "Nuvemshop",
    description: "Plataforma de e-commerce brasileira (ex-Tienda Nube)",
    website: "https://www.nuvemshop.com.br/",
    category: "E-commerce",
    scripts: ["nuvemshop\\.com\\.br", "nuvemshop\\.com\\/checkout", "nuvem\\.shop"],
    headers: {},
    // Os dois seletores eram o slug puro e saíram em 30/jul/2026 — ver o cabeçalho.
    dom: [],
    cookies: [],
    meta: { generator: "Nuvemshop" },
    implies: [],
    cname: [],
  },
  {
    name: "Loja Integrada",
    description: "Plataforma de e-commerce brasileira",
    website: "https://www.lojaintegrada.com.br/",
    category: "E-commerce",
    scripts: ["lojaintegrada\\.com\\.br", "cdn\\.aws\\.li", "cdn\\.li\\.vtex\\.com\\.br"],
    headers: {},
    dom: [],
    cookies: [],
    meta: { generator: "Loja Integrada" },
    implies: [],
    cname: ["lojaintegrada\\.com\\.br"],
  },
  {
    name: "Tray",
    description: "Plataforma de e-commerce brasileira (Locaweb)",
    website: "https://www.tray.com.br/",
    category: "E-commerce",
    scripts: ["tray\\.com\\.br", "cdn\\.tray\\.com\\.br", "loja\\.tray\\.com\\.br"],
    headers: {},
    dom: [],
    cookies: [],
    meta: { generator: "Tray" },
    implies: [],
    cname: [],
  },
  {
    name: "VTEX",
    description: "Plataforma de e-commerce brasileira (enterprise)",
    website: "https://vtex.com/",
    category: "E-commerce",
    scripts: ["vtex\\.com\\.br", "vtexassets\\.com", "vtex\\.io", "vtexcommerce"],
    headers: { "X-VTEX": "", "X-Powered-By": "VTEX" },
    // `.vtex` saiu em 30/jul/2026 — ver a nota de seletor-slug no cabeçalho.
    dom: [".vtex-store"],
    cookies: ["VtexRCMacId", "vtex_segment"],
    meta: {},
    implies: [],
    cname: ["vtex\\.com\\.br", "vtexcommerce\\.com\\.br"],
  },
  {
    name: "Jivochat",
    description: "Chat online popular no Brasil",
    website: "https://www.jivochat.com.br/",
    category: "Live Chat",
    scripts: ["jivosite\\.com", "jivochat\\.com", "code\\.jivosite\\.com"],
    headers: {},
    dom: ["#jivo_chat_widget", "#jivo-iframe-container"],
    cookies: ["jv_"],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "Take Blip",
    description: "Plataforma de chatbots e mensageria (ex-Take)",
    website: "https://www.take.net/",
    category: "Chat / Messaging",
    scripts: ["blip\\.ai", "take\\.net\\/script", "take\\.blip\\.ai"],
    headers: {},
    dom: ["#blip-chat", ".blip-container"],
    cookies: [],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "Zenvia",
    description: "Plataforma de comunicação via SMS/WhatsApp/chat",
    website: "https://www.zenvia.com/",
    category: "CPaaS / Messaging",
    scripts: ["zenvia\\.com", "totalvoice\\.com\\.br", "sma\\.co"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: [],
  },
  {
    name: "PipeRun",
    description: "CRM brasileiro para vendas B2B",
    website: "https://www.piperun.com/",
    category: "CRM",
    scripts: ["piperun\\.com", "cdn\\.piperun\\.com"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: ["piperun\\.com"],
  },
  {
    name: "Moskit",
    description: "CRM brasileiro focado em vendas",
    website: "https://www.moskit.com.br/",
    category: "CRM",
    scripts: ["moskit\\.com\\.br", "cdn\\.moskit\\.com\\.br"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: ["moskit\\.com\\.br"],
  },
  {
    name: "Ploomes",
    description: "CRM brasileiro focado em vendas complexas",
    website: "https://www.ploomes.com/",
    category: "CRM",
    scripts: ["ploomes\\.com", "cdn\\.ploomes\\.com"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: ["ploomes\\.com"],
  },
  {
    name: "Cortex",
    description: "Plataforma brasileira de inteligência de marketing",
    website: "https://www.cortexintelligence.com/",
    category: "Marketing Intelligence",
    scripts: ["cortexintelligence\\.com", "cortex\\.me"],
    headers: {},
    dom: [],
    cookies: [],
    meta: {},
    implies: [],
    cname: [],
  },
];

/**
 * Tamanho do catálogo. **Use isto em vez de digitar o número.** A copy diz
 * "nenhuma das N ferramentas", e N chumbado em prosa não quebra nada quando o
 * catálogo cresce — só passa a mentir. Mesma armadilha do timeout de 8s.
 */
export const CATALOGO = FINGERPRINTS.length;

/** Índice por nome, para a propagação de `implies`. */
export const POR_NOME: Record<string, Fingerprint> = Object.fromEntries(
  FINGERPRINTS.map((f) => [f.name, f]),
);

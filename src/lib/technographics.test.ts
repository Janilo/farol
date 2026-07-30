import { describe, it, expect } from "vitest";

import { CATALOGO, FINGERPRINTS, POR_NOME } from "./fingerprints";
import {
  countLabel,
  detectTechnologies,
  emptySnapshot,
  extractSnapshot,
  isAllowedTarget,
  normalizeDomain,
  unsupportedSelectors,
  type PageSnapshot,
} from "./technographics";

function snapshot(parcial: Partial<PageSnapshot>): PageSnapshot {
  return { ...emptySnapshot(), ...parcial };
}

describe("catálogo", () => {
  it("tem 23 ferramentas e PIX não está entre elas", () => {
    expect(CATALOGO).toBe(23);
    expect(POR_NOME["PIX"]).toBeUndefined();
  });

  it("todo seletor de dom é de forma suportada", () => {
    // Este é o portão que importa: seletor novo fora de `#id`, `.classe` ou
    // `[attr]` nunca casaria e nunca avisaria. Aqui ele quebra o CI.
    expect(unsupportedSelectors()).toEqual([]);
  });

  it("toda regex do catálogo compila", () => {
    for (const f of FINGERPRINTS) {
      for (const p of f.scripts) expect(() => new RegExp(p, "i")).not.toThrow();
      for (const p of Object.values(f.headers))
        if (p) expect(() => new RegExp(p, "i")).not.toThrow();
      for (const p of Object.values(f.meta)) if (p) expect(() => new RegExp(p, "i")).not.toThrow();
    }
  });

  it("todo `implies` aponta para ferramenta que existe no catálogo", () => {
    // Implicação para nome inexistente é silenciosa: nunca produz detecção.
    for (const f of FINGERPRINTS) {
      for (const nome of f.implies) expect(POR_NOME[nome], `${f.name} → ${nome}`).toBeDefined();
    }
  });

  it("Stone → Pagar.me é a única aresta de implicação", () => {
    const arestas = FINGERPRINTS.flatMap((f) => f.implies.map((i) => `${f.name}→${i}`));
    expect(arestas).toEqual(["Stone→Pagar.me"]);
  });
});

describe("página em branco", () => {
  it("não detecta nada, e não estoura", () => {
    expect(detectTechnologies(emptySnapshot())).toEqual([]);
  });
});

describe("correção 1 · `dom` casa contra atributos, não contra o HTML inteiro", () => {
  it("a palavra da classe em prosa NÃO detecta", () => {
    // O Python procurava "vtex" em qualquer lugar do documento, então um post de
    // blog comparando plataformas detectava VTEX no site de um concorrente.
    const page = snapshot({ classes: ["container", "post-body"], ids: ["artigo-vtex-vs-shopify"] });
    expect(detectTechnologies(page).map((d) => d.tool)).not.toContain("VTEX");
  });

  it("a classe de verdade detecta", () => {
    const page = snapshot({ classes: ["vtex-store"] });
    const d = detectTechnologies(page).find((x) => x.tool === "VTEX");
    expect(d?.via).toBe("dom");
    expect(d?.evidence).toBe(".vtex-store");
  });

  it("token de classe é comparado inteiro, não por substring", () => {
    // `.vtex` não deve casar com `vtex-legacy-theme`: nome de classe é escolha
    // de quem escreveu o HTML, e substring aqui reabre o falso positivo.
    const page = snapshot({ classes: ["vtex-legacy-theme"] });
    expect(detectTechnologies(page).map((d) => d.tool)).not.toContain("VTEX");
  });

  it("id detecta", () => {
    const page = snapshot({ ids: ["jivo_chat_widget"] });
    const d = detectTechnologies(page).find((x) => x.tool === "Jivochat");
    expect(d?.via).toBe("dom");
  });
});

describe("correção 2 · `cookies` casa contra Set-Cookie, não contra o HTML", () => {
  it("cookie real detecta", () => {
    const page = snapshot({ cookieNames: ["TOTVSSession"] });
    const d = detectTechnologies(page).find((x) => x.tool === "Totvs");
    expect(d?.via).toBe("cookie");
    expect(d?.evidence).toBe("TOTVSSession");
  });

  it("prefixo detecta a família — o catálogo tem `jv_`", () => {
    const page = snapshot({ cookieNames: ["jv_visits_count"] });
    expect(detectTechnologies(page).find((x) => x.tool === "Jivochat")?.via).toBe("cookie");
  });

  it("nome de cookie aparecendo como id ou classe NÃO detecta", () => {
    // O Python procurava `rdtrk` no HTML inteiro, então um id, uma classe ou um
    // script inline com esse nome bastava. Aqui cookie é cookie.
    const page = snapshot({ ids: ["rdtrk"], classes: ["rdtrk"] });
    expect(detectTechnologies(page).map((d) => d.tool)).not.toContain("RD Station CRM");
    expect(detectTechnologies(page).map((d) => d.tool)).not.toContain("RD Station Marketing");
  });
});

describe("seletor de atributo · `[attr]`", () => {
  // Depois de PIX sair, nenhum fingerprint real usa a forma `[attr]`. O ramo
  // continua suportado porque a próxima ferramenta pode precisar dele, e sem
  // teste ele apodrece sem ninguém notar. Fingerprint sintético, então.
  const SINTETICO = [
    {
      name: "Ferramenta Fictícia",
      description: "só para cobrir a forma [attr]",
      website: "https://exemplo.invalid",
      category: "Teste",
      scripts: [],
      headers: {},
      dom: ["[data-ficticia]"],
      cookies: [],
      meta: {},
      implies: [],
      cname: [],
    },
  ];

  it("casa contra o nome do atributo data-*", () => {
    const page = snapshot({ dataAttributes: ["data-ficticia"] });
    const d = detectTechnologies(page, SINTETICO).find((x) => x.tool === "Ferramenta Fictícia");
    expect(d?.via).toBe("dom");
    expect(d?.evidence).toBe("[data-ficticia]");
  });

  it("não casa quando o atributo aparece só como texto — o bug do lstrip", () => {
    // O Python fazia `selector.lstrip("#.")`, que deixava `[data-pix]` intacto e
    // procurava a string literal com colchetes no HTML. Nunca casava.
    const page = snapshot({ ids: ["[data-ficticia]"], classes: ["data-ficticia"] });
    expect(detectTechnologies(page, SINTETICO)).toEqual([]);
  });
});

describe("correção 3 e 4 · `implies` na direção certa e até ponto fixo", () => {
  it("Stone detectado IMPLICA Pagar.me", () => {
    const page = snapshot({ urls: ["https://cdn.stone.com.br/sdk/v2.js"] });
    const achados = detectTechnologies(page);
    const stone = achados.find((d) => d.tool === "Stone");
    const pagarme = achados.find((d) => d.tool === "Pagar.me");
    expect(stone?.via).toBe("script");
    expect(pagarme?.via).toBe("implied");
    expect(pagarme?.evidence).toBe("Stone");
  });

  it("Pagar.me NÃO implica Stone — o Python fazia isso e estava errado", () => {
    // Pagar.me é o adquirido; existe sem Stone. Concluir Stone a partir dele
    // inventa uma relação comercial que o dado não sustenta.
    const page = snapshot({ urls: ["https://assets.pagarme.com.br/checkout.js"] });
    const achados = detectTechnologies(page);
    expect(achados.find((d) => d.tool === "Pagar.me")?.via).toBe("script");
    expect(achados.map((d) => d.tool)).not.toContain("Stone");
  });

  it("detecção direta de Pagar.me vence a implicação, não é sobrescrita", () => {
    const page = snapshot({
      urls: ["https://cdn.stone.com.br/sdk/v2.js", "https://assets.pagarme.com.br/checkout.js"],
    });
    const pagarme = detectTechnologies(page).find((d) => d.tool === "Pagar.me");
    expect(pagarme?.via).toBe("script");
  });

  it("a ordem do catálogo não muda o resultado", () => {
    // O Python dependia da ordem de iteração do dicionário.
    const page = snapshot({ urls: ["https://cdn.stone.com.br/sdk/v2.js"] });
    const normal = detectTechnologies(page, FINGERPRINTS).map((d) => `${d.tool}:${d.via}`);
    const invertido = detectTechnologies(page, [...FINGERPRINTS].reverse()).map(
      (d) => `${d.tool}:${d.via}`,
    );
    expect(invertido).toEqual(normal);
  });
});

describe("correção 5 · o catálogo não confunde pixel com PIX", () => {
  it("Facebook Pixel, pixi.js e Pixabay não detectam nada", () => {
    const page = snapshot({
      urls: [
        "https://connect.facebook.net/signals/config/123?pixel_id=456",
        "https://cdn.jsdelivr.net/npm/pixi.js@7/dist/pixi.min.js",
        "https://images.pixabay.com/photo.jpg",
        "/img/pixel.gif",
      ],
    });
    expect(detectTechnologies(page)).toEqual([]);
  });
});

describe("vias · a mais forte ganha o chip", () => {
  it("header proprietário vence script", () => {
    // Só o próprio produto emite X-VTEX; script pode ser CDN compartilhado.
    const page = snapshot({
      headers: { "x-vtex": "io" },
      urls: ["https://cdn.vtexassets.com/app.js"],
    });
    expect(detectTechnologies(page).find((d) => d.tool === "VTEX")?.via).toBe("header");
  });

  it("script vence classe de CSS", () => {
    const page = snapshot({ urls: ["https://io.vtex.com.br/x.js"], classes: ["vtex"] });
    expect(detectTechnologies(page).find((d) => d.tool === "VTEX")?.via).toBe("script");
  });

  it("header com valor confere a regex do valor", () => {
    const casa = snapshot({ headers: { server: "Protheus/12" } });
    const naoCasa = snapshot({ headers: { server: "nginx/1.24" } });
    expect(detectTechnologies(casa).map((d) => d.tool)).toContain("Totvs");
    expect(detectTechnologies(naoCasa).map((d) => d.tool)).not.toContain("Totvs");
  });

  it("meta generator detecta", () => {
    const page = snapshot({ metas: { generator: "Nuvemshop 2.1" } });
    const d = detectTechnologies(page).find((x) => x.tool === "Nuvemshop");
    expect(d?.via).toBe("meta");
    expect(d?.evidence).toBe("generator=Nuvemshop 2.1");
  });
});

describe("saída", () => {
  it("é ordenada por categoria e nome, para cache e tela não divergirem", () => {
    const page = snapshot({
      urls: [
        "https://cdn.vtexassets.com/a.js",
        "https://code.jivosite.com/w.js",
        "https://d335luupugsy2.cloudfront.net/js/x.js",
      ],
    });
    const cats = detectTechnologies(page).map((d) => d.category);
    expect([...cats]).toEqual([...cats].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });

  it("cada ferramenta aparece uma única vez", () => {
    const page = snapshot({
      headers: { "x-vtex": "io" },
      urls: ["https://cdn.vtexassets.com/a.js", "https://io.vtex.com.br/b.js"],
      classes: ["vtex", "vtex-store"],
      cookieNames: ["vtex_segment"],
    });
    const nomes = detectTechnologies(page).map((d) => d.tool);
    expect(nomes.length).toBe(new Set(nomes).size);
  });

  it("não muta o retrato recebido", () => {
    const page = snapshot({ urls: ["https://cdn.stone.com.br/sdk.js"] });
    const copia = JSON.stringify(page);
    detectTechnologies(page);
    expect(JSON.stringify(page)).toBe(copia);
  });
});

describe("countLabel", () => {
  it("singular em 1, plural no resto", () => {
    expect(countLabel(0)).toBe("0 ferramentas");
    expect(countLabel(1)).toBe("1 ferramenta");
    expect(countLabel(5)).toBe("5 ferramentas");
  });
});

describe("normalizeDomain", () => {
  it("aceita com protocolo, sem protocolo, com caminho e com www", () => {
    for (const entrada of [
      "vtex.com",
      "https://vtex.com",
      "http://www.vtex.com/produtos?x=1",
      "  WWW.VTEX.COM  ",
    ]) {
      expect(normalizeDomain(entrada)).toBe("vtex.com");
    }
  });

  it("devolve null para o que não tem host", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
    expect(normalizeDomain("https://")).toBeNull();
  });
});

describe("isAllowedTarget · o portão de SSRF", () => {
  it("aceita domínio de empresa", () => {
    for (const h of ["vtex.com", "loja.exemplo.com.br", "sub.dominio.io"]) {
      expect(isAllowedTarget(h), h).toBe(true);
    }
  });

  it("recusa TODO literal de IP, e é aí que mora o endpoint de metadados", () => {
    // Recusar IP de uma vez mata a classe inteira sem depender de acertar cada
    // faixa reservada — que é onde essas listas falham, por uma faixa esquecida.
    for (const h of [
      "169.254.169.254",
      "127.0.0.1",
      "10.0.0.5",
      "192.168.1.1",
      "172.16.0.1",
      "8.8.8.8",
    ]) {
      expect(isAllowedTarget(h), h).toBe(false);
    }
  });

  it("recusa host sem TLD e sufixo de rede interna", () => {
    for (const h of [
      "localhost",
      "supabase",
      "db.internal",
      "impressora.local",
      "algo.localhost",
    ]) {
      expect(isAllowedTarget(h), h).toBe(false);
    }
  });

  it("recusa IPv6 e vazio", () => {
    expect(isAllowedTarget("[::1]")).toBe(false);
    expect(isAllowedTarget("::1")).toBe(false);
    expect(isAllowedTarget("")).toBe(false);
  });

  it("o caminho completo: o que o visitante digita passa pelos dois", () => {
    const alvo = normalizeDomain("http://169.254.169.254/latest/meta-data/");
    expect(alvo).toBe("169.254.169.254");
    expect(isAllowedTarget(alvo!)).toBe(false);
  });
});

describe("extractSnapshot", () => {
  const HTML = `<!doctype html><html><head>
    <meta name="generator" content="Nuvemshop 2.1">
    <meta property="og:title" content="Loja">
    <script src="https://d335luupugsy2.cloudfront.net/js/loader.js"></script>
    <link href="/css/app.css" rel="stylesheet">
  </head><body class="tema-claro  vtex-store ">
    <div id="jivo_chat_widget" data-loja="42"></div>
    <form action="/checkout"><button>ok</button></form>
    <!-- comentário citando vtex e rdtrk em prosa -->
  </body></html>`;

  const snap = extractSnapshot(HTML, { "X-VTEX": "io" }, [
    "vtex_segment=abc; Path=/",
    "jv_visits=2",
  ]);

  it("colhe URLs de src, href e action", () => {
    expect(snap.urls).toContain("https://d335luupugsy2.cloudfront.net/js/loader.js");
    expect(snap.urls).toContain("/css/app.css");
    expect(snap.urls).toContain("/checkout");
  });

  it("separa tokens de class e apara espaço", () => {
    expect(snap.classes).toEqual(expect.arrayContaining(["tema-claro", "vtex-store"]));
    expect(snap.classes).not.toContain("");
  });

  it("colhe id, data-* e meta por name e por property", () => {
    expect(snap.ids).toContain("jivo_chat_widget");
    expect(snap.dataAttributes).toContain("data-loja");
    expect(snap.metas.generator).toBe("Nuvemshop 2.1");
    expect(snap.metas["og:title"]).toBe("Loja");
  });

  it("normaliza header para minúscula e extrai só o nome do cookie", () => {
    expect(snap.headers["x-vtex"]).toBe("io");
    expect(snap.cookieNames).toEqual(["vtex_segment", "jv_visits"]);
  });

  it("prosa e comentário NÃO entram em lista nenhuma", () => {
    // É a raiz do falso positivo do Python: ele casava contra o HTML inteiro,
    // então "vtex" e "rdtrk" num comentário bastavam.
    expect(snap.classes).not.toContain("vtex");
    expect(snap.ids).not.toContain("rdtrk");
    expect(snap.cookieNames).not.toContain("rdtrk");
  });

  it("o retrato inteiro alimenta a detecção", () => {
    const nomes = detectTechnologies(snap).map((d) => d.tool);
    expect(nomes).toContain("VTEX");
    expect(nomes).toContain("Jivochat");
    expect(nomes).toContain("Nuvemshop");
    expect(nomes).toContain("RD Station Marketing");
  });

  it("HTML vazio dá retrato vazio, não erro", () => {
    expect(detectTechnologies(extractSnapshot(""))).toEqual([]);
  });
});

describe("entidades HTML na URL extraída", () => {
  it("decodifica &amp; para a evidência não sair garbulhada", () => {
    // Visto de verdade ao sondar o rdstation.com: a URL do href vinha com
    // `&amp;`, e ela aparece no tooltip como procedência.
    const snap = extractSnapshot(
      '<a href="https://accounts.rdstation.com.br/?locale=pt-BR&amp;trial_origin=blog">x</a>',
    );
    expect(snap.urls[0]).toBe("https://accounts.rdstation.com.br/?locale=pt-BR&trial_origin=blog");
    const d = detectTechnologies(snap).find((x) => x.tool === "RD Station CRM");
    expect(d?.evidence).not.toContain("&amp;");
  });
});

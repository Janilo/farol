/**
 * Testes de composição do orquestrador (achado A5 da auditoria de arquitetura).
 *
 * Cada peça que `resolverConsulta` chama já era testada isoladamente — cache,
 * quota, tecnografia, CNPJ. **A ordem entre elas não era.** É aqui que mora o
 * risco que nenhum teste de unidade pega: inverter dois `await`, cobrar quota
 * quando não devia, ou servir cópia velha num caso em que ela esconde a verdade.
 *
 * Os adapters de I/O são dublados; o resto roda de verdade.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Enrichment } from "./enrichment";

const fetchCnpj = vi.fn();
const readCachedFicha = vi.fn();
const writeCachedFicha = vi.fn();
const consumirQuota = vi.fn();
const fetchTargetSite = vi.fn();

vi.mock("./enrichment.server", () => ({ fetchCnpj: (...a: unknown[]) => fetchCnpj(...a) }));
vi.mock("./ficha.server", () => ({
  readCachedFicha: (...a: unknown[]) => readCachedFicha(...a),
  writeCachedFicha: (...a: unknown[]) => writeCachedFicha(...a),
}));
vi.mock("./rate-limit.server", () => ({ consumirQuota: (...a: unknown[]) => consumirQuota(...a) }));
vi.mock("./technographics.server", () => ({
  fetchTargetSite: (...a: unknown[]) => fetchTargetSite(...a),
}));

const { resolverConsulta } = await import("./ficha.orchestrator.server");

/** CNPJ da Petrobras — dígitos verificadores válidos de verdade. */
const CNPJ = "33000167000101";
const AGORA = new Date("2026-08-03T12:00:00Z");
const DIAS = (n: number) => new Date(AGORA.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const ENRICHMENT = { razaoSocial: "PETROLEO BRASILEIRO S A" } as unknown as Enrichment;

/**
 * Um `PageSnapshot` de verdade, com todos os campos vazios. Usar `{}` faz
 * `detectTechnologies` estourar em `assetUrls.find` — o dublê tem que ter a
 * forma completa, senão o teste falha por causa do dublê e não do código.
 */
const SNAPSHOT_VAZIO = {
  urls: [],
  assetUrls: [],
  ids: [],
  classes: [],
  dataAttributes: [],
  headers: {},
  metas: {},
  cookieNames: [],
};

function linhaDeCache(over: Partial<Record<string, unknown>> = {}) {
  return {
    cnpj: CNPJ,
    enrichment: ENRICHMENT,
    fetchedAt: DIAS(1), // fresca
    domain: null,
    stack: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  readCachedFicha.mockResolvedValue(null);
  writeCachedFicha.mockResolvedValue(undefined);
  consumirQuota.mockResolvedValue({ action: "allow", restantes: 4 });
  fetchCnpj.mockResolvedValue({ ok: true, raw: {} });
  fetchTargetSite.mockResolvedValue({ ok: false, error: "unreachable" });
});

describe("resolverConsulta — o que a entrada decide", () => {
  it("query vazia é erro de CNPJ, e não toca em nada", async () => {
    expect(await resolverConsulta("   ", null, AGORA)).toEqual({
      status: "error",
      error: "INVALID_CNPJ",
    });
    expect(readCachedFicha).not.toHaveBeenCalled();
    expect(consumirQuota).not.toHaveBeenCalled();
  });

  /**
   * A ordem importa: quem digitou 13 dígitos quer ouvir "faltou um número", não
   * "não existe busca por nome". `looksLikeCnpj` vem antes por isso.
   */
  it("CNPJ incompleto é erro de CNPJ, não de busca por nome", async () => {
    const r = await resolverConsulta("3300016700010", null, AGORA);
    expect(r).toEqual({ status: "error", error: "INVALID_CNPJ" });
  });

  it("texto que não é CNPJ recebe a frase de busca indisponível, sem gastar quota", async () => {
    const r = await resolverConsulta("Petrobras", null, AGORA);
    expect(r).toEqual({ status: "error", error: "NAME_SEARCH_UNAVAILABLE" });
    expect(consumirQuota).not.toHaveBeenCalled();
    expect(fetchCnpj).not.toHaveBeenCalled();
  });

  it("CNPJ inválido não chega à fonte — o dígito verificador é conferido antes", async () => {
    const r = await resolverConsulta("33000167000102", null, AGORA);
    expect(r).toEqual({ status: "error", error: "INVALID_CNPJ" });
    expect(fetchCnpj).not.toHaveBeenCalled();
    expect(consumirQuota).not.toHaveBeenCalled();
  });
});

describe("resolverConsulta — quando a quota é cobrada", () => {
  /**
   * A unidade contada é **consulta que sai para a rede**, não requisição. Cache
   * fresco sem site pedido não custa nada a ninguém, e cobrar puniria justamente
   * o caminho que queremos que a pessoa use.
   */
  it("cache fresco e nenhum site pedido: NÃO consome quota", async () => {
    readCachedFicha.mockResolvedValue(linhaDeCache());
    const r = await resolverConsulta(CNPJ, null, AGORA);
    expect(r.status).toBe("ok");
    expect(consumirQuota).not.toHaveBeenCalled();
    expect(fetchCnpj).not.toHaveBeenCalled();
  });

  it("cache fresco e o MESMO site já lido: NÃO consome quota", async () => {
    readCachedFicha.mockResolvedValue(
      linhaDeCache({ domain: "petrobras.com.br", stack: { status: "ok", detections: [] } }),
    );
    const r = await resolverConsulta(CNPJ, "petrobras.com.br", AGORA);
    expect(r.status).toBe("ok");
    expect(consumirQuota).not.toHaveBeenCalled();
    expect(fetchTargetSite).not.toHaveBeenCalled();
  });

  /**
   * O cadastro está em cache, mas o site pedido é outro — e ler site é saída de
   * rede. Cobra. Este é o caso que separa "contar requisição" de "contar rede".
   */
  it("cache fresco e site DIFERENTE: consome quota e lê o site", async () => {
    readCachedFicha.mockResolvedValue(
      linhaDeCache({ domain: "petrobras.com.br", stack: { status: "ok", detections: [] } }),
    );
    const r = await resolverConsulta(CNPJ, "outro.com.br", AGORA);
    expect(consumirQuota).toHaveBeenCalledTimes(1);
    expect(fetchTargetSite).toHaveBeenCalledWith("outro.com.br");
    expect(r.status).toBe("ok");
  });

  it("sem cache: consome quota antes de bater na fonte", async () => {
    const r = await resolverConsulta(CNPJ, null, AGORA);
    expect(consumirQuota).toHaveBeenCalledTimes(1);
    expect(r.status).toBe("ok");
  });

  /**
   * A quota é cobrada **antes** de qualquer `fetch`. Se ela nega, nada sai para
   * a rede — senão o teto não seria teto.
   */
  it("quota negada impede a saída de rede", async () => {
    consumirQuota.mockResolvedValue({ action: "deny", reason: "visitante" });
    const r = await resolverConsulta(CNPJ, "petrobras.com.br", AGORA);
    expect(r).toEqual({ status: "error", error: "QUOTA_VISITANTE" });
    expect(fetchCnpj).not.toHaveBeenCalled();
    expect(fetchTargetSite).not.toHaveBeenCalled();
  });

  it("cada motivo de recusa vira um código próprio", async () => {
    for (const [reason, error] of [
      ["visitante", "QUOTA_VISITANTE"],
      ["global", "QUOTA_GLOBAL"],
      ["indisponivel", "QUOTA_INDISPONIVEL"],
    ] as const) {
      consumirQuota.mockResolvedValue({ action: "deny", reason });
      expect(await resolverConsulta(CNPJ, null, AGORA)).toEqual({ status: "error", error });
    }
  });
});

describe("resolverConsulta — a fonte cai e existe cópia velha", () => {
  const CACHE_VELHO = () => linhaDeCache({ fetchedAt: DIAS(40) });

  /**
   * O caso que justifica o `stale` existir. Sem ele, quem orquestra jogaria fora
   * a única cópia disponível justamente quando a Brasil API responde 503.
   */
  it("fonte fora do ar com cópia velha: serve a velha, com a data dela", async () => {
    readCachedFicha.mockResolvedValue(CACHE_VELHO());
    fetchCnpj.mockResolvedValue({ ok: false, error: "upstream_down" });

    const r = await resolverConsulta(CNPJ, null, AGORA);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.ficha.fetchedAt).toBe(DIAS(40));
  });

  it("fonte limitando com cópia velha: serve a velha", async () => {
    readCachedFicha.mockResolvedValue(CACHE_VELHO());
    fetchCnpj.mockResolvedValue({ ok: false, error: "rate_limited" });
    expect((await resolverConsulta(CNPJ, null, AGORA)).status).toBe("ok");
  });

  /**
   * **A exceção, e ela é o ponto todo:** se a fonte AFIRMA que o CNPJ não
   * existe, isso é informação nova sobre o mundo e ganha do cache. Servir a
   * cópia velha aqui esconderia uma baixa cadastral — o oposto de um produto
   * que vende procedência.
   */
  it("COMPANY_NOT_FOUND ganha do cache velho: erra em vez de servir o velho", async () => {
    readCachedFicha.mockResolvedValue(CACHE_VELHO());
    fetchCnpj.mockResolvedValue({ ok: false, error: "not_found" });

    expect(await resolverConsulta(CNPJ, null, AGORA)).toEqual({
      status: "error",
      error: "COMPANY_NOT_FOUND",
    });
  });

  it("fonte fora do ar SEM cópia velha: erra", async () => {
    fetchCnpj.mockResolvedValue({ ok: false, error: "upstream_down" });
    expect(await resolverConsulta(CNPJ, null, AGORA)).toEqual({
      status: "error",
      error: "SOURCE_UNAVAILABLE",
    });
  });
});

describe("resolverConsulta — a tecnografia não derruba a ficha", () => {
  /**
   * A stack é a segunda fonte; o cadastro da Receita não depende dela. Site que
   * não responde vira uma frase dentro da ficha, nunca uma ficha quebrada.
   */
  it("site inacessível ainda devolve a ficha, com a stack em estado de erro", async () => {
    fetchTargetSite.mockResolvedValue({ ok: false, error: "unreachable" });
    const r = await resolverConsulta(CNPJ, "petrobras.com.br", AGORA);
    expect(r.status).toBe("ok");
    if (r.status === "ok")
      expect(r.ficha.stack).toEqual({ status: "error", reason: "unreachable" });
  });

  /**
   * `null` significa **nem tentou** — o quarto estado. A tela usa a diferença:
   * `null` não desenha seção de stack; `empty` desenha com uma linha.
   */
  it("sem site informado, a stack é null — nem tentou, e não leu nada", async () => {
    const r = await resolverConsulta(CNPJ, null, AGORA);
    if (r.status === "ok") {
      expect(r.ficha.stack).toBeNull();
      expect(r.ficha.domain).toBeNull();
    }
    expect(fetchTargetSite).not.toHaveBeenCalled();
  });

  it("site com lixo que não vira host não quebra a consulta", async () => {
    const r = await resolverConsulta(CNPJ, "não é um site", AGORA);
    expect(r.status).toBe("ok");
  });
});

describe("resolverConsulta — o que é gravado no cache", () => {
  it("consulta nova grava a ficha", async () => {
    await resolverConsulta(CNPJ, null, AGORA);
    expect(writeCachedFicha).toHaveBeenCalledTimes(1);
  });

  it("cache fresco servido sem leitura nova NÃO regrava", async () => {
    readCachedFicha.mockResolvedValue(linhaDeCache());
    await resolverConsulta(CNPJ, null, AGORA);
    expect(writeCachedFicha).not.toHaveBeenCalled();
  });

  /**
   * Cache fresco do cadastro + site novo lido agora: a ficha volta ao banco para
   * que a leitura do site seja reaproveitada. Sem isto, todo visitante que
   * informasse o mesmo site pagaria a leitura de novo.
   */
  it("cache fresco + site lido agora: regrava para reaproveitar a stack", async () => {
    readCachedFicha.mockResolvedValue(linhaDeCache());
    fetchTargetSite.mockResolvedValue({ ok: true, snapshot: SNAPSHOT_VAZIO });
    await resolverConsulta(CNPJ, "petrobras.com.br", AGORA);
    expect(writeCachedFicha).toHaveBeenCalledTimes(1);
  });

  /**
   * **Este teste documenta uma dependência, não um comportamento desejável.**
   *
   * O comentário no orquestrador diz "gravar é otimização: se falhar, o
   * visitante já tem a resposta na mão". Isso é verdade — mas quem garante não é
   * o orquestrador, e sim `ficha.server.ts`, que envolve o upsert em `try/catch`
   * e nunca lança. O `await writeCachedFicha(ficha)` aqui está **sem rede**: se
   * alguém reescrever o adapter e deixar uma exceção escapar, uma consulta que
   * já deu certo passa a devolver erro para o visitante, e nada avisa.
   *
   * A asserção é `rejects` de propósito: é o estado real. Se um dia o
   * orquestrador passar a se proteger sozinho, este teste falha e deve ser
   * reescrito para `resolves` — que é exatamente o aviso que se quer ter.
   */
  it("escrita que lança DERRUBA a consulta — a proteção é do adapter, não daqui", async () => {
    writeCachedFicha.mockRejectedValue(new Error("banco fora"));
    await expect(resolverConsulta(CNPJ, null, AGORA)).rejects.toThrow("banco fora");
  });
});

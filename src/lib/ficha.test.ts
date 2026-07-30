import { describe, it, expect } from "vitest";

import {
  CACHE_MAX_AGE_DAYS,
  cacheAgeInDays,
  decideFromCache,
  decideStackFromCache,
  fichaFromSource,
  formatFetchedAt,
  isFresh,
  type CachedRow,
} from "./ficha";
import type { StackResult } from "./technographics";
import { extractEnrichment, type BrasilApiCnpj } from "./enrichment";
import petrobras from "./__fixtures__/cnpj-petrobras.json";

const ENRICHMENT = extractEnrichment(petrobras as BrasilApiCnpj);
const AGORA = new Date("2026-07-28T12:00:00.000Z");

/** Linha de cache com a idade que o teste quiser, em dias. */
function linhaCom(idadeEmDias: number): CachedRow {
  const t = AGORA.getTime() - idadeEmDias * 24 * 60 * 60 * 1000;
  return {
    cnpj: "33000167000101",
    enrichment: ENRICHMENT,
    fetchedAt: new Date(t).toISOString(),
    domain: null,
    stack: null,
  };
}

describe("cacheAgeInDays", () => {
  it("mede a idade em dias fracionários", () => {
    expect(cacheAgeInDays(linhaCom(1.5).fetchedAt, AGORA)).toBeCloseTo(1.5, 6);
  });

  it("data ilegível é infinitamente velha, nunca fresca", () => {
    // Cache corrompido tem que forçar releitura, não servir lixo.
    expect(cacheAgeInDays("nem data isso é", AGORA)).toBe(Number.POSITIVE_INFINITY);
    expect(isFresh("nem data isso é", AGORA)).toBe(false);
  });

  it("data no futuro conta como idade zero, não negativa", () => {
    // Relógio torto na escrita não deve invalidar o cache inteiro.
    const futuro = new Date(AGORA.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(cacheAgeInDays(futuro, AGORA)).toBe(0);
    expect(isFresh(futuro, AGORA)).toBe(true);
  });
});

describe("isFresh · a fronteira dos 30 dias", () => {
  it("um minuto antes do corte ainda é fresco", () => {
    const quase = new Date(
      AGORA.getTime() - (CACHE_MAX_AGE_DAYS * 24 * 60 - 1) * 60 * 1000,
    ).toISOString();
    expect(isFresh(quase, AGORA)).toBe(true);
  });

  it("exatamente 30 dias já não é — o corte é exclusivo", () => {
    expect(isFresh(linhaCom(CACHE_MAX_AGE_DAYS).fetchedAt, AGORA)).toBe(false);
  });

  it("respeita janela customizada", () => {
    expect(isFresh(linhaCom(5).fetchedAt, AGORA, 7)).toBe(true);
    expect(isFresh(linhaCom(5).fetchedAt, AGORA, 3)).toBe(false);
  });
});

describe("decideFromCache · as três saídas", () => {
  it("sem linha: busca, e não há carta na manga", () => {
    const d = decideFromCache(null, AGORA);
    expect(d.action).toBe("refetch");
    if (d.action === "refetch") expect(d.stale).toBeNull();
  });

  it("linha fresca: serve, marcada como vinda do cache", () => {
    const d = decideFromCache(linhaCom(2), AGORA);
    expect(d.action).toBe("serve");
    if (d.action === "serve") {
      expect(d.ficha.fromCache).toBe(true);
      expect(d.ficha.cnpj).toBe("33000167000101");
      expect(d.ficha.enrichment.legalName).toBe("PETROLEO BRASILEIRO S A PETROBRAS");
    }
  });

  it("linha velha: busca, MAS carrega a velha junto", () => {
    // É o caso que justifica a função existir: sem `stale`, quem orquestra
    // joga fora a única cópia que tinha quando a fonte responde 503.
    const d = decideFromCache(linhaCom(45), AGORA);
    expect(d.action).toBe("refetch");
    if (d.action === "refetch") {
      expect(d.stale).not.toBeNull();
      expect(d.stale?.fromCache).toBe(true);
      expect(d.stale?.enrichment.legalName).toBe("PETROLEO BRASILEIRO S A PETROBRAS");
    }
  });

  it("preserva a data original ao servir do cache — não carimba a leitura", () => {
    // fetchedAt é quando a FONTE foi lida. Se o cache reescrever a data a cada
    // leitura, o cache nunca envelhece e a procedência mente.
    const linha = linhaCom(10);
    const d = decideFromCache(linha, AGORA);
    if (d.action === "serve") expect(d.ficha.fetchedAt).toBe(linha.fetchedAt);
  });

  it("não muta a linha recebida", () => {
    const linha = linhaCom(2);
    const copia = JSON.stringify(linha);
    decideFromCache(linha, AGORA);
    expect(JSON.stringify(linha)).toBe(copia);
  });
});

describe("formatFetchedAt", () => {
  it("formata no padrão brasileiro", () => {
    expect(formatFetchedAt("2026-07-28T15:00:00.000Z")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("data ilegível devolve null, para a tela omitir em vez de escrever Invalid Date", () => {
    expect(formatFetchedAt("")).toBeNull();
    expect(formatFetchedAt("ontem de tarde")).toBeNull();
  });
});

describe("fichaFromSource", () => {
  it("nasce fora do cache e carimba o agora", () => {
    const f = fichaFromSource("33000167000101", ENRICHMENT, AGORA);
    expect(f.fromCache).toBe(false);
    expect(f.fetchedAt).toBe("2026-07-28T12:00:00.000Z");
  });

  it("o que ela produz é imediatamente fresco para a decisão", () => {
    // Fecha o ciclo: o que sai da fonte, se voltar como linha, é servível.
    const f = fichaFromSource("33000167000101", ENRICHMENT, AGORA);
    const d = decideFromCache(
      { cnpj: f.cnpj, enrichment: f.enrichment, fetchedAt: f.fetchedAt, domain: null, stack: null },
      AGORA,
    );
    expect(d.action).toBe("serve");
  });
});

describe("decideStackFromCache · a stack tem chave diferente do cadastro", () => {
  const STACK_A: StackResult = {
    status: "ok",
    technologies: [{ tool: "VTEX", category: "E-commerce", via: "header", evidence: "x-vtex" }],
  };
  function linhaComStack(domain: string | null, stack: StackResult | null): CachedRow {
    return { ...linhaCom(1), domain, stack };
  }

  it("mesmo domínio e cache servível: reaproveita", () => {
    const d = decideStackFromCache(linhaComStack("vtex.com", STACK_A), "vtex.com", true);
    expect(d.action).toBe("serve");
    if (d.action === "serve") expect(d.stack).toEqual(STACK_A);
  });

  it("DOMÍNIO DIFERENTE: lê o site, nunca serve a stack do outro domínio", () => {
    // É o defeito que a função existe para fechar: servir a stack de a.com
    // rotulada como sendo de b.com é dado errado com cara de procedência.
    const d = decideStackFromCache(linhaComStack("a.com", STACK_A), "b.com", true);
    expect(d.action).toBe("fetch");
    if (d.action === "fetch") expect(d.domain).toBe("b.com");
  });

  it("cache tem o domínio mas não tem stack: lê o site", () => {
    const d = decideStackFromCache(linhaComStack("vtex.com", null), "vtex.com", true);
    expect(d.action).toBe("fetch");
  });

  it("cache velho: lê o site mesmo com o domínio igual", () => {
    const d = decideStackFromCache(linhaComStack("vtex.com", STACK_A), "vtex.com", false);
    expect(d.action).toBe("fetch");
  });

  it("sem linha no cache: lê o site", () => {
    const d = decideStackFromCache(null, "vtex.com", true);
    expect(d.action).toBe("fetch");
  });

  it("SEM DOMÍNIO PEDIDO: não serve o guardado, nem quando existe", () => {
    // Regra invertida em 30/jul/2026, depois de reproduzir o defeito em produção.
    // A regra antiga servia o par guardado a quem não pediu site, apoiada em
    // "stack é atributo da empresa". Mas quem informa o site é um anônimo, e o
    // campo não limpava ao trocar o CNPJ: bastou clicar no exemplo da Ambev e
    // digitar outro CNPJ para o cache gravar um MEI com `domain: ambev.com.br`.
    // A regra antiga espalharia essa associação por 30 dias com cara de apuração.
    //
    // Se este teste voltar a esperar `STACK_A`, o defeito voltou.
    const d = decideStackFromCache(linhaComStack("vtex.com", STACK_A), null, true);
    expect(d.action).toBe("serve");
    if (d.action === "serve") {
      expect(d.stack).toBeNull();
      expect(d.domain).toBeNull();
    }
  });

  it("o par guardado ainda é reaproveitado quando o MESMO site é pedido de novo", () => {
    // A trava é sobre afirmar por conta própria, não sobre cachear. Quem pergunta
    // por `vtex.com` recebe a leitura de `vtex.com` sem nova saída de rede.
    const d = decideStackFromCache(linhaComStack("vtex.com", STACK_A), "vtex.com", true);
    expect(d.action).toBe("serve");
    if (d.action === "serve") expect(d.stack).toEqual(STACK_A);
  });

  it("sem domínio pedido e sem cache: nem tentou, e isso é `null`", () => {
    const d = decideStackFromCache(null, null, true);
    expect(d.action).toBe("serve");
    if (d.action === "serve") {
      expect(d.stack).toBeNull();
      expect(d.domain).toBeNull();
    }
  });

  it("sem domínio pedido e cache velho: nem tentou", () => {
    const d = decideStackFromCache(linhaComStack("vtex.com", STACK_A), null, false);
    expect(d.action).toBe("serve");
    if (d.action === "serve") expect(d.stack).toBeNull();
  });
});

describe("fichaFromSource · nasce sem stack", () => {
  it("stack e domain começam nulos — nem tentou", () => {
    const f = fichaFromSource("33000167000101", ENRICHMENT, AGORA);
    expect(f.stack).toBeNull();
    expect(f.domain).toBeNull();
  });
});

import { describe, it, expect } from "vitest";

import { computePreTier, CORE_SETORES, PISO_RODADA, type TierInput } from "./tier";
import { TRIGGERS, SEM_CLASSIFICACAO, acharTrigger } from "./triggers";

function calc(input: TierInput) {
  return computePreTier(input);
}

/**
 * Espelho das constantes de `Clientes/Leads/fechar_ciclo.py`, copiadas à mão.
 *
 * O teste não lê o Python — ele está fora deste repo. O valor aqui é ser o
 * alarme: mudar a urgência de um gatilho em `triggers.ts` e esquecer o Python
 * (ou o contrário) faz o motor da esteira e o Farol darem tiers diferentes para
 * o mesmo sinal, em silêncio. Se este teste quebrar, a pergunta certa é "qual
 * dos dois lados está certo?", nunca "como faço passar?".
 */
const PY_URGENTES = ["G1", "G4", "G7", "G12", "G13", "G15", "G19"];
const PY_MEDIOS = ["G2", "G3", "G5", "G6", "G11", "G14", "G16", "G17", "G18"];
const PY_QUENTES = ["G12", "G13"];

describe("triggers — paridade com a rubrica do Python", () => {
  it("são 19 gatilhos, sem id repetido", () => {
    expect(TRIGGERS).toHaveLength(19);
    expect(new Set(TRIGGERS.map((t) => t.id)).size).toBe(19);
  });

  it("os urgentes são exatamente os do Python", () => {
    const meus = TRIGGERS.filter((t) => t.urgencia === "urgente").map((t) => t.id);
    expect(meus.sort()).toEqual([...PY_URGENTES].sort());
  });

  it("os médios são exatamente os do Python", () => {
    const meus = TRIGGERS.filter((t) => t.urgencia === "media").map((t) => t.id);
    expect(meus.sort()).toEqual([...PY_MEDIOS].sort());
  });

  it("os quentes são exatamente os do Python", () => {
    const meus = TRIGGERS.filter((t) => t.quente).map((t) => t.id);
    expect(meus.sort()).toEqual([...PY_QUENTES].sort());
  });

  /**
   * G8, G9 e G10 não aparecem em nenhum dos dois conjuntos do Python. Um gatilho
   * que não pontua parece bug, então fica travado: se alguém "consertar" dando
   * urgência a eles, o Farol passa a subir tier que a esteira não sobe.
   */
  it("G8, G9 e G10 não pontuam — e isso é a rubrica, não esquecimento", () => {
    for (const id of SEM_CLASSIFICACAO) {
      expect(acharTrigger(id)?.urgencia).toBe("nenhuma");
    }
    expect(calc({ gatilho: "G8" }).score).toBe(0);
  });

  it("todo gatilho quente também é urgente", () => {
    // O contrário não vale: G1 é urgente e frio. Mas um caminho quente que não
    // fosse urgente seria contradição — são os dois mais fundos do funil.
    for (const t of TRIGGERS.filter((t) => t.quente)) {
      expect(t.urgencia).toBe("urgente");
    }
  });
});

describe("computePreTier — os cortes", () => {
  it("score 4 ou mais é A", () => {
    // Fintech +1, Scale-up +1, G12 urgente +2, caminho quente +1 = 5
    const r = calc({ setor: "Fintech", porte: "Scale-up", gatilho: "G12" });
    expect(r.score).toBe(5);
    expect(r.tier).toBe("A");
    expect(r.partial).toBe(false);
  });

  it("score 2 ou 3 é B", () => {
    // Fintech +1, Scale-up +1 = 2, gatilho sem classificação não soma
    const r = calc({ setor: "Fintech", porte: "Scale-up", gatilho: "G10" });
    expect(r.score).toBe(2);
    expect(r.tier).toBe("B");
  });

  it("score abaixo de 2 é C", () => {
    expect(calc({ setor: "Fintech", porte: "Early" }).score).toBe(1);
    expect(calc({ setor: "Fintech", porte: "Early" }).tier).toBe("C");
  });

  it("o piso do score é −1 e o teto é 5", () => {
    const pior = calc({ porte: "Grande" }); // +1 porte, −1 winnability = 0
    expect(pior.score).toBeGreaterThanOrEqual(-1);
    const melhor = calc({ setor: "Fintech", porte: "Scale-up", gatilho: "G13" });
    expect(melhor.score).toBe(5);
  });
});

describe("computePreTier — eixo 1, setor", () => {
  it("todo setor core pontua", () => {
    for (const setor of CORE_SETORES) {
      expect(calc({ setor }).score).toBe(1);
    }
  });

  it("setor fora do core pontua igual — a distinção é do dossiê", () => {
    expect(calc({ setor: "Logtech" }).score).toBe(1);
    expect(calc({ setor: "Logtech" }).reasons[0]).toContain("oportunístico");
  });

  it('"Outro", vazio e ausente não pontuam', () => {
    expect(calc({ setor: "Outro" }).score).toBe(0);
    expect(calc({ setor: "   " }).score).toBe(0);
    expect(calc({ setor: null }).score).toBe(0);
  });
});

describe("computePreTier — eixo 2, orçamento", () => {
  it("Scale-up e Grande bastam sozinhos", () => {
    expect(calc({ porte: "Scale-up" }).score).toBe(1);
  });

  /**
   * Calibrado pelo caso Medipreço (27/jul/2026): R$ 2,5 mi de rodada, rebaixado
   * à mão para C porque dinheiro novo desse tamanho vira folha de pagamento, não
   * projeto de R$30–160k. O piso é política; o que o teste trava é o mecanismo.
   */
  it("rodada abaixo do piso tira ponto E põe teto C", () => {
    const r = calc({ setor: "Healthtech", gatilho: "G1", rodada: 2_500_000 });
    expect(r.caps).toEqual(["C"]);
    expect(r.tier).toBe("C");
  });

  it("rodada no piso ou acima pontua", () => {
    expect(calc({ rodada: PISO_RODADA }).score).toBe(1);
    expect(calc({ rodada: PISO_RODADA - 1 }).score).toBe(-1);
  });

  /**
   * Porte consolidado é avaliado ANTES da rodada, então uma Scale-up que captou
   * pouco não é penalizada: ela já provou orçamento por outro caminho. Inverter
   * a ordem faria o piso barrar empresa que não precisava dele.
   */
  it("porte viável tem precedência sobre rodada pequena", () => {
    const r = calc({ porte: "Scale-up", rodada: 1_000_000 });
    expect(r.score).toBe(1);
    expect(r.caps).toEqual([]);
  });
});

describe("computePreTier — eixo 4, winnability", () => {
  it("caminho quente soma, e só G12 e G13 são quentes", () => {
    expect(calc({ gatilho: "G12" }).score).toBe(3); // +2 urgente, +1 quente
    expect(calc({ gatilho: "G1" }).score).toBe(2); // urgente e frio
  });

  /**
   * O eixo existe para isto: sem ele, "Grande" somaria +1 no eixo 2 e nada mais,
   * e o porte que torna a conta inalcançável inflaria o tier.
   */
  it("Grande sem caminho quente tira ponto E põe teto C", () => {
    const r = calc({ setor: "Fintech", porte: "Grande", gatilho: "G1" });
    expect(r.score).toBe(3); // +1 +1 +2 −1
    expect(r.caps).toEqual(["C"]);
    expect(r.tier).toBe("C"); // seria B pelo score
  });

  it("Grande COM caminho quente não é penalizada", () => {
    const r = calc({ setor: "Fintech", porte: "Grande", gatilho: "G12" });
    expect(r.score).toBe(5);
    expect(r.caps).toEqual([]);
    expect(r.tier).toBe("A");
  });
});

describe("computePreTier — os tetos", () => {
  it("o teto rebaixa", () => {
    const r = calc({ setor: "Fintech", porte: "Grande", gatilho: "G4" });
    expect(r.score).toBeGreaterThanOrEqual(2); // score diria B
    expect(r.tier).toBe("C");
  });

  /**
   * A regra é "limite, não soma". Um teto C sobre um tier que já é C não faz
   * nada — e, principalmente, nunca puxa para cima. Se algum dia um teto B for
   * introduzido, é esta asserção que impede que ele promova um C.
   */
  it("o teto NUNCA promove", () => {
    const r = calc({ gatilho: "G10", rodada: 1_000 }); // score −1, teto C
    expect(r.tier).toBe("C");
    expect(r.caps).toEqual(["C"]);
  });

  /**
   * Os dois tetos são mutuamente exclusivos por construção: o da rodada só é
   * avaliado quando o porte NÃO é Scale-up/Grande, e o de winnability exige
   * Grande. Documentado como teste porque é fácil um refactor futuro juntar os
   * ramos e criar um caso que a rubrica do Python nunca produz.
   */
  it("nunca aciona os dois tetos ao mesmo tempo", () => {
    for (const porte of ["Early", "Scale-up", "Grande"] as const) {
      for (const gatilho of TRIGGERS.map((t) => t.id)) {
        const r = calc({ setor: "SaaS", porte, gatilho, rodada: 1_000_000 });
        expect(r.caps.length).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("computePreTier — partial", () => {
  /**
   * A tela expõe só gatilho e porte. Sem esta marca, um resultado de dois eixos
   * leria como veredito de quatro — e um C que quer dizer "não sei" viraria
   * "não serve".
   */
  it("falta de qualquer eixo com entrada própria marca partial", () => {
    expect(calc({ porte: "Scale-up", gatilho: "G1" }).partial).toBe(true); // sem setor
    expect(calc({ setor: "SaaS", gatilho: "G1" }).partial).toBe(true); // sem porte
    expect(calc({ setor: "SaaS", porte: "Scale-up" }).partial).toBe(true); // sem gatilho
  });

  it("com os três eixos preenchidos, não é partial", () => {
    expect(calc({ setor: "SaaS", porte: "Scale-up", gatilho: "G1" }).partial).toBe(false);
  });

  it("gatilho desconhecido conta como ausente", () => {
    const r = calc({ setor: "SaaS", porte: "Scale-up", gatilho: "G99" });
    expect(r.partial).toBe(true);
    expect(r.score).toBe(2); // não pontuou nada pelo gatilho
  });
});

describe("computePreTier — as razões", () => {
  it("toda razão citada é legível e nomeia o eixo que a produziu", () => {
    const r = calc({ setor: "Fintech", porte: "Grande", gatilho: "G12" });
    expect(r.reasons).toHaveLength(4); // um por eixo
    expect(r.reasons.join(" ")).toContain("Fintech");
    expect(r.reasons.join(" ")).toContain("G12");
  });

  it("entrada vazia ainda explica o que falta, em vez de calar", () => {
    const r = calc({});
    expect(r.reasons.join(" ")).toContain("Porte desconhecido");
    expect(r.tier).toBe("C");
    expect(r.partial).toBe(true);
  });
});

import { describe, it, expect } from "vitest";

import {
  decideQuota,
  diaBrasil,
  limiteDoPlano,
  QUOTA_ANONIMO,
  QUOTA_APROVADO,
  QUOTA_GLOBAL,
  type Plano,
} from "./rate-limit";

function decidir(nVisitante: number, nGlobal = 1, plano: Plano = "anonimo") {
  return decideQuota({ nVisitante, nGlobal, plano });
}

describe("limiteDoPlano", () => {
  it("anônimo e aprovado têm limites diferentes", () => {
    expect(limiteDoPlano("anonimo")).toBe(QUOTA_ANONIMO);
    expect(limiteDoPlano("aprovado")).toBe(QUOTA_APROVADO);
    expect(QUOTA_APROVADO).toBeGreaterThan(QUOTA_ANONIMO);
  });
});

describe("decideQuota — a fronteira do limite", () => {
  /**
   * O contrato é "reserve, depois confira": `n` é pós-incremento. Com limite 5, a
   * quinta consulta produz `n = 5` e tem que passar. Um `>=` no lugar do `>` daria
   * quatro consultas para quem foi prometido cinco, e o erro seria invisível — a
   * tela diria "você usou as 5" na quinta tentativa.
   */
  it("a última consulta do limite PASSA", () => {
    expect(decidir(QUOTA_ANONIMO)).toEqual({ action: "allow", restantes: 0 });
  });

  it("a primeira acima do limite NEGA", () => {
    expect(decidir(QUOTA_ANONIMO + 1)).toEqual({ action: "deny", reason: "visitante" });
  });

  it("a primeira consulta do dia gasta uma e sobra o resto", () => {
    expect(decidir(1)).toEqual({ action: "allow", restantes: QUOTA_ANONIMO - 1 });
  });

  it("`restantes` nunca é negativo", () => {
    const d = decidir(QUOTA_APROVADO, 1, "aprovado");
    expect(d).toEqual({ action: "allow", restantes: 0 });
  });
});

describe("decideQuota — visitante antes de global", () => {
  /**
   * A ordem é decisão de produto, não de código: se o visitante estourou o próprio
   * limite, essa é a única razão acionável (cadastro aumenta o dele, não o da casa).
   * Inverter a ordem faria quem consultou 6 vezes ler "a demo bateu o teto do dia",
   * que é verdade sobre a casa e mentira sobre por que ELE foi barrado.
   */
  it("os dois estourados: reporta o do visitante", () => {
    expect(decidir(QUOTA_ANONIMO + 1, QUOTA_GLOBAL + 1)).toEqual({
      action: "deny",
      reason: "visitante",
    });
  });

  it("só o global estourado: reporta global, mesmo com o visitante na primeira", () => {
    expect(decidir(1, QUOTA_GLOBAL + 1)).toEqual({ action: "deny", reason: "global" });
  });

  it("global exatamente no teto ainda passa", () => {
    expect(decidir(1, QUOTA_GLOBAL)).toEqual({ action: "allow", restantes: QUOTA_ANONIMO - 1 });
  });
});

describe("decideQuota — o teto global não vale para conta aprovada", () => {
  /**
   * O teto global existe contra consumo sem dono. Conta aprovada tem dono, e o limite
   * dela é o dela. Se este teste inverter, um usuário aprovado passa a ser barrado
   * pelo tráfego anônimo de estranhos.
   */
  it("aprovado passa com o global estourado", () => {
    expect(decidir(1, QUOTA_GLOBAL * 10, "aprovado")).toEqual({
      action: "allow",
      restantes: QUOTA_APROVADO - 1,
    });
  });

  it("aprovado ainda respeita o próprio limite", () => {
    expect(decidir(QUOTA_APROVADO + 1, 1, "aprovado")).toEqual({
      action: "deny",
      reason: "visitante",
    });
  });
});

describe("diaBrasil", () => {
  /**
   * O dia tem que virar à meia-noite de quem está usando, não às 21h. Em UTC, uma
   * consulta às 22h de Brasília cairia no dia seguinte e ganharia quota nova de
   * madrugada — o furo mais óbvio de um limite diário.
   */
  it("22h de Brasília ainda é o mesmo dia", () => {
    // 2026-07-30 22:30 em Brasília = 2026-07-31 01:30 UTC
    expect(diaBrasil(new Date("2026-07-31T01:30:00.000Z"))).toBe("2026-07-30");
  });

  it("00h30 de Brasília já é o dia seguinte", () => {
    // 2026-07-31 00:30 em Brasília = 2026-07-31 03:30 UTC
    expect(diaBrasil(new Date("2026-07-31T03:30:00.000Z"))).toBe("2026-07-31");
  });

  it("a virada é exatamente às 03:00 UTC", () => {
    expect(diaBrasil(new Date("2026-07-31T02:59:59.999Z"))).toBe("2026-07-30");
    expect(diaBrasil(new Date("2026-07-31T03:00:00.000Z"))).toBe("2026-07-31");
  });

  it("atravessa a virada de mês e de ano", () => {
    expect(diaBrasil(new Date("2027-01-01T02:00:00.000Z"))).toBe("2026-12-31");
    expect(diaBrasil(new Date("2026-08-01T02:00:00.000Z"))).toBe("2026-07-31");
  });

  it("devolve sempre YYYY-MM-DD, que é o que o Postgres aceita como date", () => {
    expect(diaBrasil(new Date("2026-07-30T12:00:00.000Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

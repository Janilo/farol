import { describe, it, expect, afterEach, vi } from "vitest";

import { consumirQuota } from "./rate-limit.server";

/**
 * Um teste só, para o ramo mais consequente do adapter: **sem salt, recusa.**
 *
 * Vale ter porque é a única parte do produto que falha fechado, e porque o modo de
 * errar é invisível. Se este ramo passasse a devolver `allow`, nada quebraria: os
 * outros testes continuariam verdes, a tela continuaria idêntica, e a demo ficaria
 * sem limite nenhum em produção — que é exatamente o estado que a Fase 6 fechou.
 *
 * O resto do arquivo (hash, RPC, contagem) não é testado aqui de propósito: depende
 * de requisição e de Postgres, e a decisão que ele delega já está coberta em
 * `rate-limit.test.ts`. A função do banco foi verificada com controle positivo e
 * negativo direto no Postgres — ver SEGURANCA.md.
 */
describe("consumirQuota — sem salt falha fechado", () => {
  const original = process.env.DEMO_HASH_SALT;

  afterEach(() => {
    if (original === undefined) delete process.env.DEMO_HASH_SALT;
    else process.env.DEMO_HASH_SALT = original;
    vi.restoreAllMocks();
  });

  it("recusa com `indisponivel` e não culpa o visitante", async () => {
    delete process.env.DEMO_HASH_SALT;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await consumirQuota("anonimo", new Date("2026-07-30T12:00:00.000Z"));

    // `indisponivel`, não `visitante`: a falha é nossa, e a frase na tela precisa
    // dizer isso em vez de acusá-lo de ter consultado demais.
    expect(r).toEqual({ action: "deny", reason: "indisponivel" });
  });

  it("string vazia conta como ausente", async () => {
    process.env.DEMO_HASH_SALT = "";
    vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await consumirQuota("anonimo", new Date("2026-07-30T12:00:00.000Z"));

    expect(r).toEqual({ action: "deny", reason: "indisponivel" });
  });

  it("registra no log — a recusa não pode ser silenciosa para quem opera", async () => {
    delete process.env.DEMO_HASH_SALT;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await consumirQuota("anonimo", new Date("2026-07-30T12:00:00.000Z"));

    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0]?.[0])).toContain("DEMO_HASH_SALT");
  });
});

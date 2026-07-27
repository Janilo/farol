import { describe, it, expect } from "vitest";

import { cleanCnpj, isValidCnpj, formatCnpj, looksLikeCnpj, formatCnae } from "./cnpj";

describe("cleanCnpj", () => {
  it("mantém só dígitos", () => {
    expect(cleanCnpj("33.000.167/0001-01")).toBe("33000167000101");
    expect(cleanCnpj(" 33000167000101 ")).toBe("33000167000101");
  });

  it("não explode em entrada vazia ou lixo", () => {
    expect(cleanCnpj("")).toBe("");
    expect(cleanCnpj("abc")).toBe("");
  });
});

describe("isValidCnpj", () => {
  it("aceita CNPJ real", () => {
    // Petrobras, Banco do Brasil e Ambev — os três consultados na Brasil API
    expect(isValidCnpj("33000167000101")).toBe(true);
    expect(isValidCnpj("00.000.000/0001-91")).toBe(true);
    expect(isValidCnpj("07526557000100")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCnpj("33000167000102")).toBe(false);
    expect(isValidCnpj("00000000000192")).toBe(false);
  });

  it("rejeita comprimento errado", () => {
    expect(isValidCnpj("3300016700010")).toBe(false);
    expect(isValidCnpj("330001670001011")).toBe(false);
    expect(isValidCnpj("")).toBe(false);
  });

  it("rejeita os 14 dígitos repetidos, que passam no módulo 11 mas não existem", () => {
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("11111111111111")).toBe(false);
    expect(isValidCnpj("99999999999999")).toBe(false);
  });
});

describe("formatCnpj", () => {
  it("aplica a máscara", () => {
    expect(formatCnpj("33000167000101")).toBe("33.000.167/0001-01");
  });

  it("devolve a entrada quando não dá pra mascarar", () => {
    expect(formatCnpj("123")).toBe("123");
  });
});

describe("looksLikeCnpj", () => {
  it("trata CNPJ parcial como tentativa de CNPJ, não como nome", () => {
    expect(looksLikeCnpj("12.345.678/0001-9")).toBe(true);
    expect(looksLikeCnpj("3300016")).toBe(true);
  });

  it("nome de empresa não é CNPJ", () => {
    expect(looksLikeCnpj("Petrobras")).toBe(false);
    expect(looksLikeCnpj("Rede D'Or 2")).toBe(false);
  });
});

describe("formatCnae", () => {
  it("preenche o zero à esquerda que o payload perde ao vir como inteiro", () => {
    // Petrobras: cnae_fiscal = 600001 (int) → CNAE 0600-0/01, não 6000-0/1
    expect(formatCnae(600001)).toBe("0600-0/01");
  });

  it("formata CNAE de 7 dígitos", () => {
    expect(formatCnae(6201501)).toBe("6201-5/01");
    expect(formatCnae("1921700")).toBe("1921-7/00");
  });

  it("devolve null para ausente", () => {
    expect(formatCnae(null)).toBeNull();
    expect(formatCnae(undefined)).toBeNull();
    expect(formatCnae("")).toBeNull();
  });
});

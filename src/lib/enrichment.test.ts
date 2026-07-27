import { describe, it, expect } from "vitest";

import { extractEnrichment, describePartners, formatBRL } from "./enrichment";
import type { BrasilApiCnpj } from "./enrichment";
import petrobras from "./__fixtures__/cnpj-petrobras.json";

describe("extractEnrichment · fixture real da Brasil API (Petrobras)", () => {
  const e = extractEnrichment(petrobras as BrasilApiCnpj);

  it("lê identidade e máscara", () => {
    expect(e.legalName).toBe("PETROLEO BRASILEIRO S A PETROBRAS");
    expect(e.cnpj).toBe("33000167000101");
    expect(e.cnpjFormatted).toBe("33.000.167/0001-01");
  });

  it("preserva o zero à esquerda do CNAE, que o payload perde ao vir como inteiro", () => {
    // cnae_fiscal chega como 600001 (int); o CNAE é 06.00-0/01
    expect(e.cnae?.code).toBe("0600-0/01");
    expect(e.cnae?.description).toBe("Extração de petróleo e gás natural");
  });

  it("classifica porte na faixa real da Receita e avisa o que ela não separa", () => {
    expect(e.porte).toBe("Demais");
    expect(e.porteNote).toBe("nem micro, nem pequeno porte");
  });

  it("lista sócios sem inventar percentual e marca quem administra", () => {
    expect(e.partners.length).toBe(9);
    expect(e.partners.every((p) => !("share" in p) && !("percentual" in p))).toBe(true);
    // qualificações do QSA da fixture: Presidente e Diretor — as duas administram
    expect(e.partners.every((p) => p.isAdmin)).toBe(true);
  });

  it("traz capital, natureza e situação", () => {
    expect(e.shareCapital).toBe(205431960000);
    expect(e.legalNature).toBe("Sociedade de Economia Mista");
    expect(e.registrationStatus).toBe("ATIVA");
    expect(e.location).toBe("RIO DE JANEIRO · RJ");
  });

  it("não é MEI", () => {
    expect(e.isMei).toBe(false);
  });
});

describe("extractEnrichment · casos de borda", () => {
  it("payload vazio não explode", () => {
    const e = extractEnrichment({});
    expect(e.legalName).toBe("");
    expect(e.cnae).toBeNull();
    expect(e.partners).toEqual([]);
    expect(e.porte).toBe("Não informado");
    expect(e.shareCapital).toBeNull();
  });

  it("empresa sem QSA (MEI típico)", () => {
    const e = extractEnrichment({
      cnpj: "12345678000190",
      razao_social: "JOAO DA SILVA 12345678900",
      codigo_porte: 1,
      opcao_pelo_mei: true,
      qsa: [],
    });
    expect(e.porte).toBe("Micro empresa");
    expect(e.porteNote).toBeNull();
    expect(e.isMei).toBe(true);
    expect(e.partners).toEqual([]);
  });

  it("cai no texto quando codigo_porte não vem", () => {
    expect(extractEnrichment({ porte: "EMPRESA DE PEQUENO PORTE" }).porte).toBe(
      "Empresa de pequeno porte",
    );
    expect(extractEnrichment({ porte: "DEMAIS" }).porte).toBe("Demais");
  });

  it("capital como string com vírgula", () => {
    expect(extractEnrichment({ capital_social: "1000,50" }).shareCapital).toBe(1000.5);
  });

  it("descarta sócio sem nome em vez de criar linha vazia", () => {
    const e = extractEnrichment({
      qsa: [{ nome_socio: "  ", qualificacao_socio: "Sócio" }, { nome_socio: "ANA SOUZA" }],
    });
    expect(e.partners.map((p) => p.name)).toEqual(["ANA SOUZA"]);
  });
});

describe("describePartners", () => {
  it("resume com singular e plural corretos", () => {
    expect(describePartners([])).toBe("não informado");
    expect(describePartners([{ name: "A", role: "Sócio", isAdmin: false }])).toBe("1 sócio");
    expect(
      describePartners([
        { name: "A", role: "Sócio-Administrador", isAdmin: true },
        { name: "B", role: "Sócio", isAdmin: false },
      ]),
    ).toBe("2 sócios · 1 administrador");
  });
});

describe("formatBRL", () => {
  it("formata sem centavos", () => {
    expect(formatBRL(4200000)).toContain("4.200.000");
    expect(formatBRL(null)).toBeNull();
  });
});

/**
 * Enrichment — núcleo puro, sem I/O. Transforma o payload da Brasil API no
 * bloco de cadastro que a ficha exibe.
 *
 * Duas decisões registradas no GLOSSARIO que este arquivo implementa:
 *
 * 1. `porte` da Receita NÃO se converte em `rubricPorte`. A RFB tem três
 *    faixas (micro, pequeno, demais) e a rubrica tem outras três (Early,
 *    Scale-up, Grande); DEMAIS cobre tanto Scale-up quanto Grande. Verificado
 *    em 27/jul/2026: Banco do Brasil, Petrobras e Ambev são todas DEMAIS.
 *    Não existe função aqui que derive um do outro, e isso é de propósito.
 *
 * 2. `partners` não tem percentual. O QSA não traz participação; o motor
 *    Python tentava inferir "sócio relevante" lendo número de um campo
 *    textual e quebrava. Aqui a lista sai inteira e a UI destaca quem
 *    administra.
 */
import { cleanCnpj, formatCnae } from "./cnpj";

/** Só os campos que a ficha usa. O payload real tem muito mais. */
export interface BrasilApiCnpj {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string | null;
  cnae_fiscal?: number | string | null;
  cnae_fiscal_descricao?: string | null;
  cnaes_secundarios?: { codigo?: number | string; descricao?: string }[] | null;
  porte?: string | null;
  codigo_porte?: number | string | null;
  capital_social?: number | string | null;
  natureza_juridica?: string | null;
  codigo_natureza_juridica?: number | string | null;
  descricao_situacao_cadastral?: string | null;
  data_inicio_atividade?: string | null;
  uf?: string | null;
  municipio?: string | null;
  opcao_pelo_mei?: boolean | null;
  qsa?: { nome_socio?: string | null; qualificacao_socio?: string | null }[] | null;
}

/** As três faixas reais da Receita, mais o não informado. */
export type RfbPorte = "Micro empresa" | "Empresa de pequeno porte" | "Demais" | "Não informado";

export interface Partner {
  /** Nome do sócio, como consta no QSA. */
  name: string;
  /** Qualificação textual ("Sócio-Administrador", "Presidente"…). Nunca percentual. */
  role: string | null;
  /** Derivado da qualificação — a UI destaca quem administra. */
  isAdmin: boolean;
}

export interface Enrichment {
  cnpj: string;
  cnpjFormatted: string;
  legalName: string;
  tradeName: string | null;
  cnae: { code: string; description: string } | null;
  secondaryCnaes: { code: string; description: string }[];
  /** Faixa da Receita. NÃO é o porte da rubrica. */
  porte: RfbPorte;
  /** Texto que a tela mostra ao lado da faixa, para não sugerir precisão que não existe. */
  porteNote: string | null;
  shareCapital: number | null;
  legalNature: string | null;
  isMei: boolean;
  registrationStatus: string | null;
  foundedAt: string | null;
  location: string | null;
  partners: Partner[];
}

const PORTE_POR_CODIGO: Record<string, RfbPorte> = {
  "0": "Não informado",
  "1": "Micro empresa",
  "3": "Empresa de pequeno porte",
  "5": "Demais",
};

/** Qualificações do QSA que caracterizam administração. */
const ADMIN_HINTS = ["administrador", "presidente", "diretor", "titular", "gerente"];

function toRfbPorte(raw: BrasilApiCnpj): RfbPorte {
  const codigo = raw.codigo_porte;
  if (codigo !== null && codigo !== undefined && codigo !== "") {
    const mapped = PORTE_POR_CODIGO[String(Number(codigo))];
    if (mapped) return mapped;
  }
  // Fallback pelo texto: o payload traz `porte` como "DEMAIS", "MICRO EMPRESA"…
  const texto = (raw.porte ?? "").toUpperCase();
  if (texto.includes("MICRO")) return "Micro empresa";
  if (texto.includes("PEQUENO")) return "Empresa de pequeno porte";
  if (texto.includes("DEMAIS")) return "Demais";
  return "Não informado";
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toPartners(qsa: BrasilApiCnpj["qsa"]): Partner[] {
  if (!Array.isArray(qsa)) return [];
  return qsa
    .map((s) => {
      const name = (s?.nome_socio ?? "").trim();
      if (!name) return null;
      const role = (s?.qualificacao_socio ?? "").trim() || null;
      const lower = (role ?? "").toLowerCase();
      return { name, role, isAdmin: ADMIN_HINTS.some((h) => lower.includes(h)) };
    })
    .filter((p): p is Partner => p !== null);
}

export function extractEnrichment(raw: BrasilApiCnpj): Enrichment {
  const cnpj = cleanCnpj(raw.cnpj ?? "");
  const porte = toRfbPorte(raw);

  const cnaeCode = formatCnae(raw.cnae_fiscal);
  const cnae =
    cnaeCode && raw.cnae_fiscal_descricao
      ? { code: cnaeCode, description: raw.cnae_fiscal_descricao }
      : null;

  const secondaryCnaes = (Array.isArray(raw.cnaes_secundarios) ? raw.cnaes_secundarios : [])
    .map((c) => {
      const code = formatCnae(c?.codigo);
      return code && c?.descricao ? { code, description: c.descricao } : null;
    })
    .filter((c): c is { code: string; description: string } => c !== null);

  const cidade = (raw.municipio ?? "").trim();
  const uf = (raw.uf ?? "").trim();

  return {
    cnpj,
    cnpjFormatted: cnpj
      ? `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
      : "",
    legalName: (raw.razao_social ?? "").trim(),
    tradeName: (raw.nome_fantasia ?? "").trim() || null,
    cnae,
    secondaryCnaes,
    porte,
    // A faixa DEMAIS é o caso em que a Receita não ajuda a dimensionar: ela
    // vale para uma empresa de cinquenta pessoas e para a Ambev. A tela diz.
    porteNote: porte === "Demais" ? "nem micro, nem pequeno porte" : null,
    shareCapital: toNumber(raw.capital_social),
    legalNature: (raw.natureza_juridica ?? "").trim() || null,
    isMei: raw.opcao_pelo_mei === true,
    registrationStatus: (raw.descricao_situacao_cadastral ?? "").trim() || null,
    foundedAt: (raw.data_inicio_atividade ?? "").trim() || null,
    location: cidade && uf ? `${cidade} · ${uf}` : cidade || uf || null,
    partners: toPartners(raw.qsa),
  };
}

/** Resumo do quadro societário para a linha da ficha. */
export function describePartners(partners: Partner[]): string {
  if (partners.length === 0) return "não informado";
  const admins = partners.filter((p) => p.isAdmin).length;
  const socios = `${partners.length} ${partners.length === 1 ? "sócio" : "sócios"}`;
  if (admins === 0) return socios;
  return `${socios} · ${admins} ${admins === 1 ? "administrador" : "administradores"}`;
}

/** R$ com separador brasileiro, sem centavos (capital social é sempre inteiro grande). */
export function formatBRL(value: number | null): string | null {
  if (value === null) return null;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

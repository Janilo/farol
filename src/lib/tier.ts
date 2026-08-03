/**
 * Porta de `compute_pre_tier` (`Clientes/Leads/fechar_ciclo.py`) — pura, sem I/O.
 *
 * O pré-tier **não decide nada**. Ele adianta os 4 eixos que dá para ler de um
 * sinal bruto e deixa os outros dois — encaixe de pilar e ética — para quem lê a
 * dor. Um Tier A daqui é "vale abrir o dossiê", não "vale abordar".
 *
 * A assimetria que dá sentido ao resto: os eixos 1 a 3 medem **fit de problema**
 * (setor, orçamento, timing) e o eixo 4 mede **fit comercial** — existe um centro
 * de compra que um consultor solo alcança? Sem esse eixo, porte grande inflava o
 * tier justamente pelo atributo que torna a conta inalcançável: time interno
 * grande e compra que não passa por um sponsor único.
 *
 * Por isso os **tetos rebaixam e nunca promovem**. É a regra que impede uma conta
 * de somar pontos pelo que a torna impossível de ganhar.
 */

import { acharTrigger } from "./triggers";

export type Porte = "Early" | "Scale-up" | "Grande";
export type Tier = "A" | "B" | "C";

/** Do `CORE_SETORES` do Python. Setor fora daqui ainda pontua como oportunístico. */
export const CORE_SETORES = ["Fintech", "Healthtech", "DTC", "CPG", "SaaS", "Govtech"] as const;

/**
 * Abaixo disto o dinheiro novo não comporta o tíquete de R$30–160k: vira folha de
 * pagamento. **É política, não fato** — calibrado em 27/jul/2026 pelo caso
 * Medipreço (R$ 2,5 mi, rebaixado à mão). Se barrar boa conta, muda-se o número.
 */
export const PISO_RODADA = 5_000_000;

/** A é o mais alto. O índice é o que faz o teto comparar. */
const ORDEM_TIER: readonly Tier[] = ["A", "B", "C"];

export interface TierInput {
  /** Nome do setor. `"Outro"`, vazio ou ausente não pontua. */
  setor?: string | null;
  porte?: Porte | null;
  /** Id do gatilho (`"G1"`…`"G19"`). */
  gatilho?: string | null;
  /** Valor da rodada em reais, quando a fonte citou. Ver `PISO_RODADA`. */
  rodada?: number | null;
}

export interface TierResult {
  /** −1 a 5. */
  score: number;
  tier: Tier;
  /** Uma linha por eixo avaliado, na ordem dos eixos. */
  reasons: string[];
  /** Tetos acionados. Vazio quando nenhum eixo rebaixou. */
  caps: Tier[];
  /**
   * Algum eixo ficou sem entrada — o score é um piso, não o veredito.
   *
   * Existe porque a tela expõe só gatilho e porte, e sem isto um resultado de
   * dois eixos leria como se fosse de quatro. Um `partial` com tier C significa
   * "não sei", e a diferença entre "não sei" e "não serve" é o produto inteiro.
   */
  partial: boolean;
}

function ehCore(setor: string): boolean {
  return (CORE_SETORES as readonly string[]).includes(setor);
}

function formatarReais(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}

export function computePreTier(input: TierInput): TierResult {
  const setor = input.setor?.trim() || "";
  const porte = input.porte ?? null;
  const gatilho = acharTrigger(input.gatilho);
  const rodada = input.rodada ?? null;

  let score = 0;
  const reasons: string[] = [];
  const caps: Tier[] = [];

  // Eixo 1 — Setor no alvo.
  // Core e oportunístico valem o MESMO ponto no Python. Não é engano: o eixo
  // pergunta "é um setor que ele atende?", e a distinção entre core e adjacente
  // é do dossiê, não daqui.
  if (setor && ehCore(setor)) {
    score += 1;
    reasons.push(`Setor core: ${setor}`);
  } else if (setor && setor !== "Outro") {
    score += 1;
    reasons.push(`Setor oportunístico: ${setor}`);
  }

  // Eixo 2 — Orçamento plausível.
  // Porte consolidado basta; sem ele, vale o dinheiro novo que a fonte citou.
  // Ter CNPJ não pontua aqui: existência confirmada não é orçamento.
  if (porte === "Scale-up" || porte === "Grande") {
    score += 1;
    reasons.push(`Porte viável: ${porte}`);
  } else if (rodada !== null && rodada < PISO_RODADA) {
    score -= 1;
    caps.push("C");
    reasons.push(
      `Rodada de ${formatarReais(rodada)} — abaixo do piso de ${formatarReais(PISO_RODADA)}; ` +
        `não comporta o tíquete (teto: C)`,
    );
  } else if (rodada !== null) {
    score += 1;
    reasons.push(`Rodada de ${formatarReais(rodada)} — orçamento plausível`);
  } else if (porte === "Early") {
    reasons.push("Porte Early sem valor de rodada — verificar orçamento");
  } else {
    reasons.push("Porte desconhecido — confirmar antes de subir pro pipeline");
  }

  // Eixo 3 — Gatilho e timing.
  if (gatilho?.urgencia === "urgente") {
    score += 2;
    reasons.push(`Gatilho urgente: ${gatilho.id}`);
  } else if (gatilho?.urgencia === "media") {
    score += 1;
    reasons.push(`Gatilho médio: ${gatilho.id}`);
  } else if (gatilho) {
    reasons.push(`Gatilho: ${gatilho.id} — sem classificação de urgência`);
  }

  // Eixo 4 — Winnability. O único sinal de acesso ao decisor legível de um sinal
  // bruto; o dossiê é quem pontua winnability de verdade.
  if (gatilho?.quente) {
    score += 1;
    reasons.push(`Caminho quente: ${gatilho.id} — acesso ao decisor já existe`);
  } else if (porte === "Grande") {
    score -= 1;
    caps.push("C");
    reasons.push(
      "Porte Grande sem caminho quente — centro de compra fora do alcance de " +
        "consultor solo (teto: C; só sobe com decisor mapeado no dossiê)",
    );
  }

  let tier: Tier = score >= 4 ? "A" : score >= 2 ? "B" : "C";

  // Tetos são limite, não soma: rebaixam, nunca promovem. Vale o mais duro.
  if (caps.length > 0) {
    const limite = caps.reduce((a, b) => (ORDEM_TIER.indexOf(a) > ORDEM_TIER.indexOf(b) ? a : b));
    if (ORDEM_TIER.indexOf(tier) < ORDEM_TIER.indexOf(limite)) tier = limite;
  }

  // Só os eixos com entrada própria contam para `partial`. O eixo 4 não entra:
  // ele deriva de gatilho e porte, então nunca falta sozinho.
  const partial = !setor || !porte || !gatilho;

  return { score, tier, reasons, caps, partial };
}

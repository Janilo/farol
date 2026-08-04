/**
 * Os 19 gatilhos da rubrica, com rótulo em português e urgência.
 *
 * ⚠️ **Esta é uma CÓPIA. A fonte é `Clientes/Leads/gatilhos.md`** — os 19
 * gatilhos e a coluna `Urgência`, consolidados lá em 04/ago/2026.
 *
 * Antes daquela data o catálogo estava partido: G1–G14 no `gatilhos.md`, que se
 * apresentava como *o* catálogo e parava no G14; G15–G19 só no `farol.md`; e a
 * urgência em lugar nenhum além das constantes do `fechar_ciclo.py`, já copiada
 * à mão para o `scoring.md` e para cá. Hoje os três consumidores apontam para o
 * `.md`, e é lá que se muda primeiro.
 *
 * **A sincronia continua manual** — o que existe é alarme, não geração: o
 * `tier.test.ts` espelha `GATILHOS_URGENTES` / `GATILHOS_MEDIOS` /
 * `GATILHOS_QUENTES` do Python e quebra se um lado mudar sozinho. Se este
 * arquivo passar a ser gerado do `.md` algum dia, o espelho sai junto.
 */

/** Peso do gatilho no eixo 3. `nenhuma` soma zero — ver `SEM_CLASSIFICACAO`. */
export type Urgencia = "urgente" | "media" | "nenhuma";

export interface Trigger {
  id: string;
  /** Rótulo curto em PT, para o seletor. */
  label: string;
  urgencia: Urgencia;
  /** Caminho quente: abre o decisor sem passar por credencial de marca grande. */
  quente: boolean;
}

/**
 * G8, G9 e G10 não estão em `GATILHOS_URGENTES` nem em `GATILHOS_MEDIOS` no
 * Python — somam **zero** no eixo 3, e o script registra "sem classificação de
 * urgência". Não é omissão desta porta: é o comportamento da rubrica, e está
 * nomeado aqui porque um gatilho que não pontua parece bug para quem lê rápido.
 */
export const SEM_CLASSIFICACAO = ["G8", "G9", "G10"] as const;

export const TRIGGERS: readonly Trigger[] = [
  { id: "G1", label: "Captou rodada ou aporte recente", urgencia: "urgente", quente: false },
  { id: "G2", label: "M&A ou aquisição", urgencia: "media", quente: false },
  {
    id: "G3",
    label: "Aquisição desacelerando, churn ou MAU em queda",
    urgencia: "media",
    quente: false,
  },
  {
    id: "G4",
    label: "Troca de C-level (novo CEO, CFO ou CMO)",
    urgencia: "urgente",
    quente: false,
  },
  {
    id: "G5",
    label: "Lançamento de produto ou escolha de mercado",
    urgencia: "media",
    quente: false,
  },
  {
    id: "G6",
    label: "Internacionalização ou entrada em mercado novo",
    urgencia: "media",
    quente: false,
  },
  {
    id: "G7",
    label: "Evento de governança (JV, IPO, earn-out, prazo regulatório)",
    urgencia: "urgente",
    quente: false,
  },
  {
    id: "G8",
    label: "Boutique de dados querendo escalar ou padronizar método",
    urgencia: "nenhuma",
    quente: false,
  },
  {
    id: "G9",
    label: "Tema externo (regulatório, eleitoral, macro) virou prioridade",
    urgencia: "nenhuma",
    quente: false,
  },
  { id: "G10", label: "Vaga de Head ou VP aberta há tempo", urgencia: "nenhuma", quente: false },
  {
    id: "G11",
    label: "Contratou recém um líder de growth ou dados",
    urgencia: "media",
    quente: false,
  },
  { id: "G12", label: "Ex-cliente mudou de empresa", urgencia: "urgente", quente: true },
  { id: "G13", label: "Intenção declarada", urgencia: "urgente", quente: true },
  { id: "G14", label: "Travado em piloto de IA sem valor", urgencia: "media", quente: false },
  {
    id: "G15",
    label: "Sinal legal adverso (processo, protesto, multa, RJ)",
    urgencia: "urgente",
    quente: false,
  },
  { id: "G16", label: "Intenção de pesquisa observável", urgencia: "media", quente: false },
  { id: "G17", label: "Sinal de produto e operação", urgencia: "media", quente: false },
  { id: "G18", label: "Sinal de ecossistema e rede", urgencia: "media", quente: false },
  { id: "G19", label: "Receita pública contratada", urgencia: "urgente", quente: false },
];

const PORID = new Map(TRIGGERS.map((t) => [t.id, t]));

export function acharTrigger(id: string | null | undefined): Trigger | undefined {
  return id ? PORID.get(id) : undefined;
}

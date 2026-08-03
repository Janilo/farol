/**
 * Os 19 gatilhos da rubrica, com rótulo em português e urgência.
 *
 * ⚠️ **Este arquivo é a terceira cópia da lista.** O catálogo canônico está
 * partido em dois arquivos da esteira Python, e nenhum dos dois tem os 19:
 *
 * - `Clientes/Leads/gatilhos.md` — G1 a G14, com fonte, exemplo e pilar. Ele se
 *   apresenta como *o* catálogo e para no G14, então quem lê só ele conclui que
 *   são quatorze.
 * - `Clientes/Leads/farol.md` — G15 a G19, definidos como as fontes brasileiras
 *   que os concorrentes globais não cobrem (JusBrasil, ComprasNet, Reclame Aqui,
 *   INPI, Diário Oficial).
 *
 * A classificação de urgência abaixo NÃO vem de nenhum dos dois: vem das
 * constantes `GATILHOS_URGENTES` / `GATILHOS_MEDIOS` / `GATILHOS_QUENTES` de
 * `Clientes/Leads/fechar_ciclo.py`, que é quem realmente pontua. Mudar a
 * urgência de um gatilho exige mudar **os dois lugares**, senão o motor Python e
 * o Farol discordam em silêncio — é exatamente o problema já vivo entre
 * `fingerprints.ts` e `tecnografias_br.json`.
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

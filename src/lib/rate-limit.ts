/**
 * Núcleo puro da quota. Nenhum I/O, nenhum `Date.now()`: recebe os contadores já
 * lidos e o instante, devolve a decisão. Quem fala com o banco é
 * `rate-limit.server.ts`.
 *
 * O que a quota protege não é a Brasil API — é a saída de rede que a Fase 4 criou.
 * A tecnografia faz o servidor buscar um endereço que o VISITANTE escolheu, e os
 * portões de `technographics.ts` limitam para onde, não quantas vezes. Sem teto, a
 * demo é um varredor de terceiros a partir do IP da Cloudflare.
 *
 * Por isso a unidade contada é **consulta que sai para a rede**, não requisição.
 * Consulta servida do cache não consome nada: ela não custa nada a ninguém, e cobrar
 * por ela puniria justamente o caminho que queremos que as pessoas usem.
 */

/** Quem está consultando. `aprovado` é conta com `profiles.is_approved`. */
export type Plano = "anonimo" | "aprovado";

export const QUOTA_ANONIMO = 5;
export const QUOTA_APROVADO = 50;

/**
 * Teto da casa por dia, aplicado **só ao tráfego anônimo**. A razão é atribuição:
 * o teto global existe contra consumo que não tem dono, e conta aprovada tem dono —
 * o limite dela é o dela. Com o produto tendo um usuário aprovado, a diferença é
 * teórica; a regra está escrita para quando não for.
 */
export const QUOTA_GLOBAL = 150;

export function limiteDoPlano(plano: Plano): number {
  return plano === "aprovado" ? QUOTA_APROVADO : QUOTA_ANONIMO;
}

export type QuotaDecision =
  { action: "allow"; restantes: number } | { action: "deny"; reason: "visitante" | "global" };

/**
 * Decide com os contadores **já incrementados**.
 *
 * Isso não é detalhe de implementação vazando: o incremento e a leitura têm que ser
 * a mesma operação, senão duas requisições paralelas leem 4 e ambas passam. Então o
 * contrato é "reserve, depois confira", e `n` aqui é o número que esta consulta
 * produziu. Daí o `>` em vez de `>=`: com limite 5, a quinta consulta produz `n = 5`
 * e é a última permitida.
 *
 * A ordem dos testes importa e é deliberada: **visitante antes de global.** Se o
 * visitante estourou o próprio limite, essa é a afirmação mais verdadeira sobre por
 * que ELE foi barrado, e é a única acionável — cadastro aumenta o limite dele, não o
 * da casa. O teto global só aparece quando é ele que está prendendo.
 */
export function decideQuota(input: {
  nVisitante: number;
  nGlobal: number;
  plano: Plano;
}): QuotaDecision {
  const limite = limiteDoPlano(input.plano);

  if (input.nVisitante > limite) return { action: "deny", reason: "visitante" };
  if (input.plano === "anonimo" && input.nGlobal > QUOTA_GLOBAL) {
    return { action: "deny", reason: "global" };
  }

  return { action: "allow", restantes: Math.max(0, limite - input.nVisitante) };
}

/**
 * A chave do dia, no fuso de Brasília.
 *
 * UTC seria mais simples e estaria errado no lugar que importa: o dia zeraria às 21h
 * de quem está usando, no meio da noite de trabalho. Brasília é UTC−3 fixo desde o
 * fim do horário de verão (Decreto 9.772/2019), então subtrair três horas é exato,
 * não aproximação. Se o horário de verão voltar, esta função passa a errar por uma
 * hora durante a vigência — o efeito é a virada do dia acontecer às 23h em vez de
 * meia-noite, e o conserto é aqui.
 *
 * Não usa `Intl` com `timeZone` de propósito: a saída dependeria da base de fusos do
 * runtime, e `workerd` e Node não precisam ter a mesma.
 */
export function diaBrasil(agora: Date): string {
  const deslocado = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return deslocado.toISOString().slice(0, 10);
}

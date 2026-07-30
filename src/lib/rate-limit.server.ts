/**
 * Adapter da quota. Aqui mora o que o núcleo não pode ter: o IP da requisição, o
 * hash, o salt e a chamada ao Postgres. A decisão continua sendo do `rate-limit.ts`.
 *
 * **Este arquivo falha fechado, e é a única exceção à regra do `ficha.server.ts`.**
 * Lá o cache nunca derruba a consulta, porque cache fora do ar é lentidão. Aqui é o
 * contrário: quota fora do ar é ausência de limite, e o limite é o produto deste
 * arquivo. Falhar aberto seria entregar exatamente o que a Fase 6 existe para
 * impedir — com a agravante de ninguém perceber, porque a tela ficaria idêntica.
 *
 * O IP não é gravado em lugar nenhum. O que entra na tabela é sha256(IP + salt), e o
 * salt existe porque sem ele o hash de um IPv4 é enumerável (2^32 é questão de
 * minutos). Sem salt não há anonimização, então sem salt não há consulta nova.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest } from "@tanstack/react-start/server";

import { decideQuota, diaBrasil, type Plano, type QuotaDecision } from "./rate-limit";

/**
 * Bucket compartilhado para requisição sem IP identificável. Não é um hash — tem 64
 * caracteres porque a função do banco exige esse tamanho, e é constante de propósito:
 * todo mundo sem IP divide um único teto. Cair aqui é sinal de que a requisição não
 * passou pela borda da Cloudflare.
 */
const BUCKET_SEM_IP = "semip".padEnd(64, "0");

export type QuotaOutcome = QuotaDecision | { action: "deny"; reason: "indisponivel" };

/** `CF-Connecting-IP` é posto pela borda da Cloudflare e não é falsificável ali —
 *  ao contrário de `X-Forwarded-For`, que qualquer cliente pode inventar e que por
 *  isso NÃO é consultado aqui. Sem o header, cai no bucket compartilhado. */
function ipDaRequisicao(): string | null {
  const request = getRequest();
  const ip = request?.headers?.get("cf-connecting-ip");
  return ip && ip.trim() ? ip.trim() : null;
}

async function hashVisitante(ip: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${ip}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Reserva uma consulta e devolve se ela pode prosseguir.
 *
 * Chamar isto **consome** — inclusive quando o resultado é `deny`. É o preço de o
 * incremento e a leitura serem a mesma operação, que é o que torna a decisão imune a
 * duas requisições paralelas lendo o mesmo número. Portanto só chame quando a
 * consulta for de fato sair para a rede: cache hit não passa por aqui.
 */
export async function consumirQuota(plano: Plano, agora: Date): Promise<QuotaOutcome> {
  // O nome vem do `.env.example`, que já reservava `DEMO_HASH_SALT` antes de existir
  // código lendo. Inventar um nome novo aqui deixaria o exemplo apontando para uma
  // variável que ninguém lê — e o sintoma seria a quota "não funcionar" em produção
  // com o secret configurado.
  const salt = process.env.DEMO_HASH_SALT;
  if (!salt) {
    console.error(
      "[farol] DEMO_HASH_SALT ausente — consulta nova recusada. Sem salt não há como" +
        " contar visitante sem guardar IP. Defina o secret no Worker (e no .env local).",
    );
    return { action: "deny", reason: "indisponivel" };
  }

  // Tudo daqui para baixo dentro do `try`, inclusive a leitura do header e o hash.
  // Não é zelo: `getRequest()` depende de haver contexto de requisição, e num
  // componente que falha fechado a diferença entre lançar e recusar é a diferença
  // entre um 500 e uma frase. Os dois impedem a consulta; só um deles explica.
  try {
    const ip = ipDaRequisicao();
    const visitor = ip ? await hashVisitante(ip, salt) : BUCKET_SEM_IP;

    const { data, error } = await supabaseAdmin.rpc("bump_demo_quota", {
      p_visitor: visitor,
      p_dia: diaBrasil(agora),
    });

    if (error) {
      console.error("[farol] falha ao contabilizar quota", error.message);
      return { action: "deny", reason: "indisponivel" };
    }

    // A função devolve exatamente uma linha. Zero linhas aqui seria contrato quebrado,
    // e contrato quebrado na quota tem que negar, não passar.
    const linha = Array.isArray(data) ? data[0] : data;
    if (!linha) {
      console.error("[farol] bump_demo_quota devolveu vazio");
      return { action: "deny", reason: "indisponivel" };
    }

    return decideQuota({
      nVisitante: linha.n_visitante,
      nGlobal: linha.n_global,
      plano,
    });
  } catch (e) {
    // Inclui a `ConfigError` de quando o service role não está configurado.
    console.error("[farol] erro inesperado ao contabilizar quota", e);
    return { action: "deny", reason: "indisponivel" };
  }
}

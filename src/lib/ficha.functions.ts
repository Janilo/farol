/**
 * A casca RPC da consulta. Valida a entrada e delega — **nenhuma decisão mora
 * aqui**, e nenhuma pode morar: o que estiver dentro do `createServerFn` não é
 * testável (o runtime do Start guarda o contexto num `AsyncLocalStorage`, e um
 * teste esbarra em "No Start context found"). A composição vive em
 * `ficha.orchestrator.server.ts`, exportada e coberta.
 *
 * **Este é o único módulo desta cadeia que `src/routes/` pode importar.** Ele
 * atravessa a fronteira cliente/servidor de propósito, e é justamente por isso
 * que só pode exportar a casca: o corpo do `createServerFn` é removido do bundle
 * cliente, e com ele morrem os imports que só ele usa. Uma função comum exportada
 * daqui mantém a cadeia inteira viva no grafo do cliente — foi o que quebrou a
 * `/demo` no `vite dev` (issue #2). Os tipos que a tela consome (`FichaError`,
 * `FichaResult`) moram no núcleo puro, em `./ficha`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { FichaResult } from "./ficha";
import { resolverConsulta } from "./ficha.orchestrator.server";

const GetFichaSchema = z.object({
  query: z.string().min(1).max(120),
  /** Site da empresa, opcional. Sem ele não há tecnografia — e isso é `null`,
   *  não erro: "nem tentou" é diferente de "leu e não achou". */
  domain: z.string().max(253).optional(),
});

/**
 * O `agora` nasce aqui, uma vez por requisição, para que a decisão de frescor do
 * cache e o carimbo do que for gravado não discordem por milissegundos.
 */
export const getFichaFn = createServerFn({ method: "POST" })
  .validator((d) => GetFichaSchema.parse(d))
  .handler(async ({ data }): Promise<FichaResult> => {
    return resolverConsulta(data.query, data.domain, new Date());
  });

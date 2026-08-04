/**
 * Config isolado do comparador de paridade da rubrica.
 *
 * Existe porque o `vite.config.ts` do projeto exclui `scripts/**` da suíte — e
 * exclui de propósito: o comparador depende de um JSON gerado à mão e da esteira
 * Python fora deste repo, então no CI ele quebraria por falta do arquivo.
 * Sem este config, o mesmo exclude também impediria rodá-lo à mão.
 *
 * Mesmo padrão do `test:rls` do Lente, que aponta para um config próprio.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts"],
  },
});

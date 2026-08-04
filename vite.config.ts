/// <reference types="vitest/config" />
// A referência acima é o que ensina o `test:` lá embaixo ao tipo `UserConfig` do
// vite — sem ela o tsc reprova com "'test' does not exist in type 'UserConfig'".
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  // Force-enable the Nitro Cloudflare-module deploy build outside the Lovable
  // sandbox (CI). Mirrors the config Lovable applies in-sandbox: outputs the
  // Worker to dist/server + dist/client and emits a wrangler deploy config.
  nitro: {
    preset: "cloudflare-module",
    output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
    cloudflare: { nodeCompat: true, deployConfig: true },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
    // `.claude` guarda os worktrees que as sessões de agente criam DENTRO do
    // repo, e sem excluí-lo o vitest varre uma cópia inteira do projeto: em
    // 03/ago/2026 o placar deu 338 testes onde havia 169, e o pior não é o
    // número — é o trabalho em andamento de outra sessão reprovar a suíte desta.
    test: {
      // `scripts/` fica fora: o comparador de paridade que mora lá depende de um
      // JSON gerado à mão e da esteira Python fora deste repo. Sem esta linha ele
      // entra na suíte e o CI quebra por falta do arquivo — verificado em
      // 04/ago/2026, quando o placar saltou de 190 para 191.
      exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**", "scripts/**"],
    },
  },
});

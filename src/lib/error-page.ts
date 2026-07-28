// Página de erro de último recurso do SSR: servida quando o app nem carregou.
// Hex cru aqui é intencional e é a única exceção da casa — a folha de estilo do
// produto (e portanto os tokens --farol-*) pode ser exatamente o que falhou.
// Os valores espelham docs/DESIGN.md §2; se a paleta mudar, mude aqui.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Esta página não carregou — Farol</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 "Inter Tight", system-ui, -apple-system, sans-serif; background: #14181B; color: #F2F0EA; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      .eyebrow { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; color: #E8B93F; margin: 0 0 1rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; font-weight: 600; }
      p { color: #A9B4BA; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 2px; font: inherit; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #E8B93F; color: #0D1113; }
      .secondary { background: transparent; color: #F2F0EA; border-color: #2E383E; }
    </style>
  </head>
  <body>
    <div class="card">
      <p class="eyebrow">Farol</p>
      <h1>Esta página não carregou</h1>
      <p>Algo falhou do nosso lado. Tente recarregar ou volte para o início.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar de novo</button>
        <a class="secondary" href="/">Ir para o início</a>
      </div>
    </div>
  </body>
</html>`;
}

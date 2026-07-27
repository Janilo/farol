import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppHome,
});

/**
 * Área logada — placeholder da Fase 1.
 *
 * A Fase 2 traz aqui a mesma consulta de dossiê da /demo, com quota maior
 * (usuário aprovado) e histórico das próprias buscas. Existe agora porque um
 * layout pathless sem filhos colapsa para "/" e colide com a index.
 */
function AppHome() {
  return (
    <div className="mx-auto max-w-[var(--farol-content-max)] px-6 py-16">
      <p className="eyebrow">Área logada</p>
      <h1 className="font-display mt-4 text-4xl font-medium italic leading-tight">Em construção</h1>
      <p className="mt-4 max-w-prose text-mist">
        A consulta de dossiê chega aqui na próxima fase, com quota maior e histórico. Por ora, a
        demo pública é o caminho.
      </p>
    </div>
  );
}

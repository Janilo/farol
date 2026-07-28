/**
 * Farol wordmark — "farol" em Fraunces minúscula com o ponto de luz NO "o":
 * a lente substitui o glifo. docs/DESIGN.md §5, decisão travada nº 6.
 *
 * Por que DOM e não SVG, divergindo do CascataWordmark:
 *
 * 1. A luz tem que cair no "o". Em `<svg><text>` não há como posicionar um
 *    elemento em relação a um glifo sem chumbar o avanço horizontal de "far"
 *    na Fraunces — número que muda com peso, opsz e versão da fonte. Aqui a
 *    lente É o "o", num inline-block, e o layout de texto resolve a posição.
 *    O glifo do Cascata fica FORA da palavra, então SVG serve lá.
 * 2. `<text>` dentro de um .svg servido como documento isolado (favicon,
 *    `<img src>`) não vê a `@font-face` da página e cai numa fonte de sistema.
 *    Marca em DOM não tem essa armadilha. Ver o comentário de public/favicon.svg.
 *
 * Proporções em `em`, do projeto "JPS DS — Farol" (28/jul/2026):
 * lente 0,50em · anel 0,10em · disco 0,204em · tracking −0,03em.
 * Em `em` porque a marca escala com a tipografia, não com um viewBox.
 *
 * **O anel é `currentColor`, não âmbar.** Essa é a construção do DS e resolve
 * duas coisas de uma vez. Primeiro, é a leitura fiel da §5: o "o" é uma letra
 * (logo, da cor da palavra) e a luz é o que mora dentro dela — a §5 especifica
 * o disco como `--farol-beam-bright`, e nada sobre o anel. Segundo, mata sem
 * variante o defeito de superfície: um anel âmbar sobre o painel `bg-primary`
 * das telas de auth fica âmbar sobre âmbar e desaparece — a palavra perde uma
 * letra e lê "far l". Com `currentColor`, o anel segue a cor do painel em
 * qualquer fundo, e o componente não precisa saber onde está.
 */
type Props = {
  className?: string;
  /** Altura ótica do lockup em px, como nos irmãos. */
  height?: number;
  /** Só a lente, sem a palavra. É a redução que o favicon usa. */
  glyphOnly?: boolean;
};

/**
 * A lente: o anel na cor da palavra, com a luz âmbar e halo curto no centro.
 * As margens negativa/positiva são acerto ótico — a lente é geometricamente
 * perfeita e o "o" da Fraunces não é, então sem elas o espaçamento denuncia.
 */
function Lens() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-block",
        flex: "none",
        boxSizing: "border-box",
        width: "0.5em",
        height: "0.5em",
        margin: "0 -0.01em 0 0.028em",
        border: "0.1em solid currentColor",
        borderRadius: "999px",
      }}
    >
      <span
        style={{
          position: "absolute",
          /* inset 0,048em no furo de 0,30em → disco de 0,204em, a medida da §5 */
          inset: "0.048em",
          borderRadius: "999px",
          background: "var(--farol-beam-bright)",
          /* Halo curto (§5). rgba cru porque é o beam-bright a 45% e
             color-mix() aqui não vale a pena — se a cor mudar, mude aqui. */
          boxShadow: "0 0 0.1em 0.028em rgba(246,208,115,.45)",
        }}
      />
    </span>
  );
}

export function FarolWordmark({ className, height = 28, glyphOnly = false }: Props) {
  /* Fator ótico: mantém o lockup do mesmo tamanho aparente do SVG anterior nos
     oito pontos de uso (height 22 a 32). Não é medida de marca, é escala. */
  const fontSize = height * 0.62;

  if (glyphOnly) {
    return (
      <span
        role="img"
        aria-label="Farol"
        className={className}
        style={{ fontSize: height, lineHeight: 1, display: "inline-block" }}
      >
        <Lens />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label="Farol"
      className={`font-display text-[color:var(--farol-ink)] ${className ?? ""}`}
      style={{
        fontSize,
        /* Fraunces nunca abaixo de 500 em fundo escuro (§4). */
        fontWeight: 500,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "baseline",
        whiteSpace: "nowrap",
        fontVariationSettings: "'opsz' 72, 'SOFT' 0, 'WONK' 0",
      }}
    >
      <span aria-hidden="true">far</span>
      <Lens />
      <span aria-hidden="true">l</span>
    </span>
  );
}

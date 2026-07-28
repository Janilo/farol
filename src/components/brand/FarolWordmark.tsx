/**
 * Farol wordmark — "farol" em Fraunces minúscula com o ponto de luz NO "o":
 * a lente substitui o glifo (anel âmbar + disco claro no centro).
 * docs/DESIGN.md §5, decisão travada nº 6.
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
 * Proporções em `em`, medidas no projeto do claude.ai/design (28/jul/2026):
 * lente 0,50em · anel 0,10em · disco 0,204em · tracking −0,03em.
 * Em `em` porque a marca escala com a tipografia, não com um viewBox.
 *
 * Duas variantes, e a segunda existe por um defeito real: sobre o painel
 * `bg-primary` das telas de auth, uma lente âmbar fica âmbar sobre âmbar e
 * **desaparece** — a palavra perde uma letra e lê "far l". (O SVG anterior
 * tinha o mesmo defeito no ponto de luz; era só menos visível porque a luz
 * ficava fora da palavra.) Com `onBrand`, o anel vira `currentColor` e o
 * centro fica vazado: o próprio âmbar do painel passa a ser a luz. Assim a
 * variante não precisa conhecer a cor do painel.
 */
type Props = {
  className?: string;
  /** Altura ótica do lockup em px, como nos irmãos. */
  height?: number;
  /** Só a lente, sem a palavra. É a redução que o favicon usa. */
  glyphOnly?: boolean;
  /**
   * A marca está sobre superfície âmbar (`bg-primary`), não sobre a noite.
   * Palavra e anel herdam a cor do painel; a luz é o âmbar vazado no centro.
   */
  onBrand?: boolean;
};

/** A lente: o anel com a luz no centro. Ocupa o lugar do "o". */
function Lens({ onBrand = false }: { onBrand?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "0.5em",
        height: "0.5em",
        border: `0.1em solid ${onBrand ? "currentColor" : "var(--farol-beam)"}`,
        borderRadius: "50%",
        /* O "o" da Fraunces senta na linha de base; a caixa da lente também. */
        verticalAlign: "baseline",
        position: "relative",
      }}
    >
      {!onBrand && (
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "0.204em",
            height: "0.204em",
            marginTop: "-0.102em",
            marginLeft: "-0.102em",
            borderRadius: "50%",
            background: "var(--farol-beam-bright)",
          }}
        />
      )}
    </span>
  );
}

export function FarolWordmark({
  className,
  height = 28,
  glyphOnly = false,
  onBrand = false,
}: Props) {
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
        <Lens onBrand={onBrand} />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label="Farol"
      className={`font-display ${onBrand ? "" : "text-[color:var(--farol-ink)]"} ${className ?? ""}`}
      style={{
        fontSize,
        /* Fraunces nunca abaixo de 500 em fundo escuro (§4). */
        fontWeight: 600,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">far</span>
      <Lens onBrand={onBrand} />
      <span aria-hidden="true">l</span>
    </span>
  );
}

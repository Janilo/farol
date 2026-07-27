/**
 * Farol wordmark — the beam glyph (a light source throwing a widening cone)
 * plus the "farol" lockup. The beam is --farol-beam; the tower is the
 * foreground ink. From the Farol DS spec (Design/farol-ds-spec.md §5).
 *
 * The glyph reads at 16px: a lit point with two rays. Anything more detailed
 * turns to mush at favicon size, which is where this mark lives most.
 */
type Props = {
  className?: string;
  height?: number;
  /** Hide the wordmark text and render the glyph only. */
  glyphOnly?: boolean;
};

export function FarolWordmark({ className, height = 28, glyphOnly = false }: Props) {
  const viewBox = glyphOnly ? "0 0 36 40" : "0 0 160 44";
  return (
    <svg
      viewBox={viewBox}
      height={height}
      role="img"
      aria-label="Farol"
      className={`text-[color:var(--farol-ink)] ${className ?? ""}`}
    >
      {/* tower — a narrow trapezoid, base wider than top */}
      <path d="M13 18 L23 18 L25 38 L11 38 Z" fill="currentColor" />
      {/* lantern — the lit point */}
      <circle cx="18" cy="12" r="4.5" fill="var(--farol-beam)" />
      {/* beam — two rays widening to the right */}
      <path d="M23 9 L35 4 L35 7 L24 11 Z" fill="var(--farol-beam)" opacity="0.85" />
      <path d="M23 15 L35 20 L35 17 L24 13 Z" fill="var(--farol-beam)" opacity="0.55" />
      {!glyphOnly && (
        <text
          x="36"
          y="32"
          fontFamily="Inter Tight, sans-serif"
          fontWeight="700"
          fontSize="25"
          letterSpacing="-0.02em"
          fill="currentColor"
        >
          farol
        </text>
      )}
    </svg>
  );
}

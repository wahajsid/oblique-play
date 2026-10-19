// PLACEHOLDER mark until the real Oblique logo files arrive.
// Replace the SVG below with the brand mark; size and colour props stay the same.
export function ObliqueMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M8 3h13l-5 18H3z" fill="currentColor" />
    </svg>
  );
}

export function ObliqueWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tracking-tight ${className}`}>
      <ObliqueMark size={16} />
      <span>Oblique</span>
    </span>
  );
}

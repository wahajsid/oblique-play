import Link from "next/link";
import { ObliqueWordmark } from "./brand/ObliqueMark";

// The small permanent Oblique mark that sits on every screen.
export function AppHeader({ back, children }: { back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center justify-between gap-2 px-4">
      {back ? (
        <Link
          href={back.href}
          className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted"
        >
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : (
        <Link href="/" className="inline-flex min-h-11 items-center text-ink" aria-label="Oblique Play home">
          <ObliqueWordmark />
        </Link>
      )}
      {children}
      {back && (
        <Link href="/" className="inline-flex min-h-11 items-center text-ink" aria-label="Oblique Play home">
          <ObliqueWordmark className="text-sm" />
        </Link>
      )}
    </header>
  );
}

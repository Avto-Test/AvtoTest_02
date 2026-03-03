import Link from "next/link";
import { ButtonV2 } from "@/components/ui-v2";

export function ZoneActionCenterV2() {
  return (
    <section className="space-y-6 py-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-[var(--v2-text-tertiary)]">Action Center</p>
        <h2 className="text-sm font-medium text-[var(--v2-text-primary)]">Next Recommended Actions</h2>
        <p className="text-sm text-[var(--v2-text-secondary)]">
          Continue with smart adaptive mode, simulate pressure, or review due topics.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonV2 variant="primary" asChild className="flex-1 sm:flex-none">
          <Link href="/tests?mode=adaptive">Start Smart Practice</Link>
        </ButtonV2>

        <ButtonV2 variant="outline" asChild className="flex-1 sm:flex-none">
          <Link href="/tests?mode=adaptive&pressure=true">Pressure Simulation</Link>
        </ButtonV2>
      </div>

      <Link
        href="/review-queue"
        className="mt-3 inline-block text-sm text-[var(--v2-text-tertiary)] transition-colors hover:text-[var(--v2-text-secondary)]"
      >
        Review Due Topics
      </Link>
    </section>
  );
}

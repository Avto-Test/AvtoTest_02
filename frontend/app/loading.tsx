export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-20 animate-pulse rounded-3xl bg-[var(--muted)]" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-40 animate-pulse rounded-3xl bg-[var(--muted)]" />
          <div className="h-40 animate-pulse rounded-3xl bg-[var(--muted)]" />
          <div className="h-40 animate-pulse rounded-3xl bg-[var(--muted)]" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-96 animate-pulse rounded-3xl bg-[var(--muted)]" />
          <div className="h-96 animate-pulse rounded-3xl bg-[var(--muted)]" />
        </div>
      </div>
    </div>
  );
}

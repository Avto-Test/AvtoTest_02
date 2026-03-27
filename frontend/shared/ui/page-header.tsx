export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const actionSlot = actions ?? action;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-caption text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-display text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem]">{title}</h1>
        {description ? (
          <p className="text-body max-w-2xl text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {actionSlot ? <div className="flex shrink-0 items-center gap-2">{actionSlot}</div> : null}
    </div>
  );
}

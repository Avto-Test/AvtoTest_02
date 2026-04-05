import { cn } from "@/lib/utils";

export function Avatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
}) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? fallback}
      className={cn("h-10 w-10 rounded-full object-cover", className)}
    />
  ) : (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]",
        className,
      )}
    >
      {fallback}
    </div>
  );
}

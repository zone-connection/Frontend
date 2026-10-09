import { cn } from "@/lib/utils";

export type DashDonutItem = {
  label: string;
  value: number;
  color: string;
};

export function DashDonut({
  items,
  emptyLabel,
  centerLabel,
  className,
  compact = false,
}: {
  items: DashDonutItem[];
  emptyLabel: string;
  centerLabel: string;
  className?: string;
  compact?: boolean;
}) {
  const visible = items.filter((item) => item.value > 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div
        className={cn(
          "mx-auto flex items-center justify-center rounded-full border-10 border-[#D0BEF5] bg-[#F8F5FF] px-3 text-center text-[11px] leading-snug text-[#6927DA]",
          compact ? "size-24" : "size-36",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }
  const r = 40;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className={cn("relative mx-auto", compact ? "size-24" : "size-36", className)}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#DDD6FE"
          strokeWidth="16"
        />
        {visible.map((item) => {
          const len = (item.value / total) * circ;
          const node = (
            <circle
              key={item.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              strokeWidth="16"
              stroke={item.color}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return node;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-semibold tabular-nums leading-none", compact ? "text-sm" : "text-xl font-bold")}>{total}</span>
        <span className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>{centerLabel}</span>
      </div>
    </div>
  );
}

export function DashDonutLegend({
  items,
  className,
}: {
  items: DashDonutItem[];
  className?: string;
}) {
  return (
    <ul className={cn("mt-3 space-y-1.5", className)}>
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center justify-between gap-3 text-xs"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-muted-foreground">{item.label}</span>
          </span>
          <span className="tabular-nums font-semibold">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

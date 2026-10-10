import { cn } from "@/lib/utils";
import { docStatus1FunilTagClasses } from "@/lib/documentacao-status";

/** Tag de status da documentação no card do lead/cliente. */
export function DocStatus1FunilTag({
  status1,
  className,
  titlePrefix = "Documentação",
}: {
  status1: string | null | undefined;
  className?: string;
  titlePrefix?: string;
}) {
  const label = status1?.trim();
  if (!label) return null;
  const { wrap, dot } = docStatus1FunilTagClasses(label);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
        wrap,
        className,
      )}
      title={`${titlePrefix} · ${label}`}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function DocStatusFunilTags({
  status1,
  status2,
  className,
  layout = "wrap",
}: {
  status1?: string | null;
  status2?: string | null;
  className?: string;
  /** No card do funil, duas colunas iguais evitam quebra irregular. */
  layout?: "wrap" | "split";
}) {
  const first = status1?.trim();
  const second = status2?.trim();
  if (!first && !second) return null;
  const split = layout === "split";
  const chipClass = split ? "min-w-0 w-full justify-center" : undefined;
  return (
    <div
      className={cn(
        split
          ? "grid w-full grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1"
          : "flex max-w-full flex-wrap justify-end gap-1",
        className,
      )}
    >
      <DocStatus1FunilTag
        status1={first}
        titlePrefix="Documentação · Status 1"
        className={chipClass}
      />
      {second && second.toLowerCase() !== first?.toLowerCase() ? (
        <DocStatus1FunilTag
          status1={second}
          titlePrefix="Documentação · Status 2"
          className={chipClass}
        />
      ) : null}
    </div>
  );
}

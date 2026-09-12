import { Repeat, UserRoundCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type LeadOrigemLiberacaoFields = {
  origemAtrasoLiberacao?: "caca_lead" | "retrabalho" | null;
  triagemOrigemHerdada?: "caca_lead" | "retrabalho" | null;
};

export function resolveLeadOrigemLiberacao(
  lead: LeadOrigemLiberacaoFields,
): { label: string; kind: "retrabalho" | "reatribuido" } | null {
  if (lead.origemAtrasoLiberacao === "retrabalho") {
    return { label: "Retrabalho", kind: "retrabalho" };
  }
  if (lead.triagemOrigemHerdada === "retrabalho") {
    return { label: "Retrabalho", kind: "retrabalho" };
  }
  if (lead.triagemOrigemHerdada === "caca_lead") {
    return { label: "Reatribuído", kind: "reatribuido" };
  }
  if (lead.origemAtrasoLiberacao === "caca_lead") {
    return { label: "Reatribuído", kind: "reatribuido" };
  }
  return null;
}

export function LeadOrigemLiberacaoBadge({
  lead,
  className,
  compact = false,
}: {
  lead: LeadOrigemLiberacaoFields;
  className?: string;
  compact?: boolean;
}) {
  const info = resolveLeadOrigemLiberacao(lead);
  if (!info) return null;
  const retrabalho = info.kind === "retrabalho";
  const Icon = retrabalho ? Repeat : UserRoundCog;
  return (
    <Badge
      variant="outline"
      className={cn(
        compact
          ? "h-5 px-1.5 text-[9px] py-0"
          : "h-5 px-1.5 text-[10px] font-semibold",
        retrabalho
          ? "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200"
          : "border-sky-500/50 bg-sky-500/15 text-sky-800 dark:text-sky-200",
        className,
      )}
    >
      <Icon className={cn("mr-0.5", compact ? "h-2.5 w-2.5" : "size-3")} />
      {info.label}
    </Badge>
  );
}

import { Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/crm-types";

export function LeadCadastroOrigemBadge({
  origem,
  compact = false,
}: {
  origem?: Lead["cadastroOrigem"];
  compact?: boolean;
}) {
  const porCorretor = origem === "corretor";
  const Icon = porCorretor ? UserRound : Building2;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full font-medium",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        porCorretor
          ? "bg-violet-100 text-violet-800"
          : "bg-sky-100 text-sky-800",
      )}
    >
      <Icon className={compact ? "size-3 shrink-0" : "size-3.5 shrink-0"} />
      <span className="truncate">
        {porCorretor ? "Criado por corretor" : "Criado pela imobiliária"}
      </span>
    </span>
  );
}

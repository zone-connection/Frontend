import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const FILTRO_CAMPO =
  "!h-9 !w-full !rounded-lg !border-[#E2E8EC] !bg-white !pl-3 !pr-3 !shadow-none focus:!border-[#079ED4] focus:!ring-2 focus:!ring-[#D3EBF5]";

export function FiltrosPainel({
  activeCount,
  onClear,
  children,
  kicker = "Filtros",
  description = "Escolha o recorte da lista.",
  confirmLabel = "Ver resultados",
  onConfirm,
}: {
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
  kicker?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="!h-9 !rounded-lg border border-[#E2E8EC] bg-white px-3 text-[13px] font-medium text-[#16324A] shadow-none hover:bg-[#F3FAFD]"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="mr-1.5 size-4 text-[#079ED4]" />
        Filtros
        {activeCount > 0 ? (
          <span className="ml-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#079ED4] px-1.5 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l border-[#E2E8EC] bg-[#F4F7F8] p-0 shadow-none sm:max-w-[380px] [&>button]:hidden"
        >
          <SheetHeader className="relative border-b border-[#E6EDF2] bg-white px-5 py-4 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0C7C86]">
              {kicker}
            </p>
            <SheetTitle className="text-[18px] font-semibold tracking-tight text-[#0B3148]">
              Filtros
            </SheetTitle>
            <p className="text-[13px] text-[#5C6B76]">{description}</p>
            <SheetClose className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg border border-[#E2E8EC] bg-white text-[#0B3148] hover:bg-[#F4F7F8]">
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4 rounded-xl border border-[#E6EDF2] bg-white p-4 [&_button]:w-full [&_label]:text-xs [&_label]:font-medium [&_label]:text-[#5C6B76]">
              {children}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[#E6EDF2] bg-white px-4 py-3">
            <button
              type="button"
              className="text-sm font-medium text-[#05749E]"
              onClick={onClear}
            >
              Limpar
            </button>
            <Button
              type="button"
              className={cn(
                "!h-9 !rounded-lg border-0 bg-[#079ED4] px-4 text-[13px] font-medium text-white shadow-none before:hidden hover:bg-[#0689b8]",
              )}
              onClick={() => {
                onConfirm?.();
                setOpen(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

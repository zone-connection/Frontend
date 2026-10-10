import { useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { FILTER_NATIVE } from "@/lib/filter-bar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { SOFT_BTN } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";

export const FILTRO_CAMPO =
  "!h-9 !w-full !rounded-lg !border-[#E2E8EC] !bg-white !pl-3 !pr-3 !text-[13px] !text-[#0B3148] !shadow-none placeholder:!text-[#8B98A3] focus:!border-[#079ED4] focus:!ring-2 focus:!ring-[#D3EBF5]";

/** Select nativo no mesmo desenho dos filtros da marca. */
export function FiltroSelectNativo({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative w-fit max-w-full">
      <select className={cn(FILTER_NATIVE, "w-auto", className)} {...props} />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#079ED4]" />
    </div>
  );
}

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
        className={cn(SOFT_BTN, "px-3 text-[13px] font-medium")}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="mr-1.5 size-4" />
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
          <SheetHeader className="relative border-b border-primary/10 bg-gradient-to-r from-primary/10 via-sky-50/50 to-white px-5 py-4 text-left">
            <div className="flex items-start gap-3 pr-10">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-white text-[#079ED4] shadow-sm">
                <SlidersHorizontal className="size-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0C7C86]">
                  {kicker}
                </p>
                <SheetTitle className="text-[18px] font-semibold tracking-tight text-[#0B3148]">
                  Filtros
                </SheetTitle>
                <p className="text-[13px] text-[#5C6B76]">{description}</p>
              </div>
            </div>
            <SheetClose className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg border border-[#E2E8EC] bg-white text-[#0B3148] hover:bg-[#F3FAFD]">
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
              className="text-sm font-medium text-[#05749E] hover:text-[#079ED4]"
              onClick={onClear}
            >
              Limpar
            </button>
            <Button
              type="button"
              className={cn(BRAND_GRADIENT_BTN, "px-4")}
              style={BRAND_GRADIENT_STYLE}
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

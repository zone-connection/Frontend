import { useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
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
  "!h-9 !w-full !rounded-lg !border-[#E2E8EC] !bg-white !pl-3 !pr-3 !text-[13px] !text-[#0B3148] !shadow-none placeholder:!text-[#8B98A3] focus:!border-[#079ED4] focus:!ring-2 focus:!ring-[#D3EBF5] dark:!border-white/15 dark:!bg-[#1c2430] dark:!text-[#f8fafc] dark:placeholder:!text-[#94a3b8] dark:focus:!border-[#079ED4] dark:focus:!ring-[#079ED4]/30";

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
  confirmLabel = "Aplicar filtros",
  onConfirm,
}: {
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
  kicker?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  resultCount?: number;
  chips?: { id: string; label: string }[];
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
          className="flex w-full flex-col gap-0 border-l border-[#E2E8EC] bg-white p-0 shadow-none sm:max-w-xl dark:border-white/10 dark:bg-[#0b0f14] [&>button]:hidden"
        >
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <SheetHeader className="border-b border-[#E6EDF2] px-5 py-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[#079ED4]">
                      <SlidersHorizontal className="size-4" />
                      <SheetTitle className="text-lg font-semibold text-[#0B3148]">
                        Filtros avançados
                      </SheetTitle>
                    </div>
                    <p className="mt-1 text-sm text-[#5C6B76]">
                      {kicker} · {description}
                    </p>
                  </div>
                  <SheetClose className="grid size-8 shrink-0 place-items-center rounded-lg text-[#5C6B76] hover:bg-[#F3FAFD]">
                    <X className="size-4" />
                    <span className="sr-only">Fechar</span>
                  </SheetClose>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="grid gap-4 sm:grid-cols-2 [&_label]:text-xs [&_label]:font-medium [&_label]:text-[#5C6B76]">
                  {children}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E6EDF2] px-5 py-3">
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[#05749E] hover:bg-[#F3FAFD]"
                  onClick={onClear}
                >
                  <RotateCcw className="size-4" />
                  Limpar filtros
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className={SOFT_BTN} onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className={cn(BRAND_GRADIENT_BTN, "px-4")}
                    style={BRAND_GRADIENT_STYLE}
                    onClick={() => {
                      onConfirm?.();
                      setOpen(false);
                    }}
                  >
                    <Search className="mr-1.5 size-4" />
                    {confirmLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

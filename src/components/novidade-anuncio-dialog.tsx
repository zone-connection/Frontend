import { Link } from "@tanstack/react-router";
import { ArrowRight, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { anuncioNovidadeAtual } from "@/lib/novidades";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeAbrirDestino?: boolean;
  /** @deprecated use podeAbrirDestino */
  podeAbrirTarefas?: boolean;
};

function NovidadeIllustration() {
  return (
    <div
      className="relative flex min-h-44 items-center justify-center overflow-hidden bg-[#FFF4EB] px-8 py-10 sm:min-h-full"
      aria-hidden
    >
      <div className="absolute left-1/2 top-1/2 h-56 w-44 -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-[#FFE4CC]" />
      <div className="relative">
        <div className="relative h-36 w-28 rounded-2xl border border-white/80 bg-white shadow-[0_12px_30px_rgba(232,122,46,0.16)]">
          <div className="absolute right-0 top-0 h-8 w-8 rounded-bl-xl bg-[#FFF4EB]" />
          <div className="absolute right-0 top-0 h-8 w-8 origin-top-right rotate-[-8deg] rounded-tr-2xl border-b border-l border-white/80 bg-[#FFE8D4]" />
          <div className="mt-10 space-y-2 px-4">
            <span className="block h-1.5 w-16 rounded-full bg-[#F3D5BB]" />
            <span className="block h-1.5 w-14 rounded-full bg-[#F3D5BB]" />
            <span className="block h-1.5 w-10 rounded-full bg-[#F3D5BB]" />
          </div>
        </div>
        <span className="absolute -right-1 top-3 h-1.5 w-1.5 rounded-full bg-[#F97316]" />
        <span className="absolute -right-0.5 top-6 h-4 w-0.5 rotate-[28deg] rounded-full bg-[#F97316]" />
        <span className="absolute right-3 top-1 h-3 w-0.5 rotate-[8deg] rounded-full bg-[#F97316]" />
        <span className="absolute -bottom-3 -right-3 inline-flex size-12 items-center justify-center rounded-full bg-[#F97316] text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)]">
          <CloudUpload className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function NovidadeAnuncioDialog({
  open,
  onOpenChange,
  podeAbrirDestino,
  podeAbrirTarefas = true,
}: Props) {
  const item = anuncioNovidadeAtual();
  if (!item) return null;
  const canOpenTarget = podeAbrirDestino ?? podeAbrirTarefas;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-[#0B3148]/45 backdrop-blur-[2px]"
        className="max-h-[min(90vh,40rem)] w-[min(100vw-1.5rem,46rem)] gap-0 overflow-hidden rounded-[28px] border-0 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:max-w-[46rem] [&>button]:right-5 [&>button]:top-5 [&>button]:text-[#8A9AA6]"
      >
        <div className="grid min-h-0 sm:grid-cols-[13.5rem_minmax(0,1fr)]">
          <NovidadeIllustration />
          <div className="flex min-h-0 flex-col px-6 py-7 sm:px-8 sm:py-8">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F97316]">
              <span className="inline-block h-3.5 w-0.5 rounded-full bg-[#F97316]" />
              {item.kicker}
            </p>
            <DialogTitle className="mt-3 text-[1.7rem] font-semibold leading-tight tracking-tight text-[#16324A] dark:text-foreground">
              {item.title}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-md text-[15px] leading-relaxed text-[#6B7C89]">
              {item.summary}
            </DialogDescription>

            <div className="mt-6 rounded-2xl border border-dashed border-[#F4C7A5] bg-[#FFF8F3] px-5 py-6 text-center">
              <span className="mx-auto inline-flex size-11 items-center justify-center text-[#F97316]">
                <CloudUpload className="h-8 w-8" strokeWidth={1.6} />
              </span>
              <p className="mt-2 text-[13px] font-semibold text-[#16324A] dark:text-foreground">
                {item.status}
              </p>
              {item.dropHint ? (
                <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-[#8A9AA6]">
                  {item.dropHint}
                </p>
              ) : null}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-[#D7E0E6] bg-white px-5 text-[#16324A] hover:bg-[#F7FAFC]"
                onClick={() => onOpenChange(false)}
              >
                Entendi
              </Button>
              {canOpenTarget ? (
                <Button
                  type="button"
                  asChild
                  className="h-10 rounded-full border-0 bg-[#F97316] px-5 text-white shadow-none hover:bg-[#EA580C]"
                >
                  <Link
                    to={item.href as "/leads"}
                    onClick={() => onOpenChange(false)}
                  >
                    {item.hrefLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  asChild
                  className="h-10 rounded-full border-0 bg-[#F97316] px-5 text-white shadow-none hover:bg-[#EA580C]"
                >
                  <Link to="/novidades" onClick={() => onOpenChange(false)}>
                    Ver novidades
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

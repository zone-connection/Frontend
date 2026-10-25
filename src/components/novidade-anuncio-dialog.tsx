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
      className="relative flex h-36 items-center justify-center overflow-hidden bg-[#F3FAFD] px-6 py-6 dark:bg-[#102838] sm:h-auto sm:min-h-full sm:px-8 sm:py-10"
      aria-hidden
    >
      <div className="absolute left-1/2 top-1/2 h-40 w-36 -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-[#E7F4FA] dark:bg-[#079ED4]/20 sm:h-56 sm:w-44" />
      <div className="relative scale-90 sm:scale-100">
        <div className="relative h-32 w-24 rounded-2xl border border-white bg-white shadow-[0_12px_30px_rgba(7,158,212,0.16)] dark:border-white/10 dark:bg-[#1c2430] sm:h-36 sm:w-28">
          <div className="absolute right-0 top-0 h-8 w-8 rounded-bl-xl bg-[#F3FAFD] dark:bg-[#102838]" />
          <div className="absolute right-0 top-0 h-8 w-8 origin-top-right rotate-[-8deg] rounded-tr-2xl border-b border-l border-white bg-[#D3EBF5] dark:border-white/10 dark:bg-[#079ED4]/30" />
          <div className="mt-9 space-y-2 px-4 sm:mt-10">
            <span className="block h-1.5 w-14 rounded-full bg-[#B7D7E6] dark:bg-white/20" />
            <span className="block h-1.5 w-12 rounded-full bg-[#B7D7E6] dark:bg-white/20" />
            <span className="block h-1.5 w-9 rounded-full bg-[#B7D7E6] dark:bg-white/20" />
          </div>
        </div>
        <span className="absolute -right-1 top-3 h-1.5 w-1.5 rounded-full bg-[#079ED4]" />
        <span className="absolute -right-0.5 top-6 h-4 w-0.5 rotate-[28deg] rounded-full bg-[#079ED4]" />
        <span className="absolute right-3 top-1 h-3 w-0.5 rotate-[8deg] rounded-full bg-[#079ED4]" />
        <span className="absolute -bottom-3 -right-3 inline-flex size-11 items-center justify-center rounded-full bg-[#079ED4] text-white shadow-[0_8px_18px_rgba(7,158,212,0.35)] sm:size-12">
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

  const cta = canOpenTarget ? (
    <Button
      type="button"
      asChild
      className="h-10 w-full rounded-full px-5 sm:w-auto"
    >
      <Link to={item.href as "/leads"} onClick={() => onOpenChange(false)}>
        {item.hrefLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  ) : (
    <Button
      type="button"
      asChild
      className="h-10 w-full rounded-full px-5 sm:w-auto"
    >
      <Link to="/novidades" onClick={() => onOpenChange(false)}>
        Ver novidades
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-[#0B3148]/45 backdrop-blur-[2px]"
        className="max-h-[min(92dvh,40rem)] w-[min(100vw-1rem,46rem)] gap-0 overflow-y-auto overflow-x-hidden rounded-[22px] border border-[#E2E8EC] p-0 shadow-[0_24px_80px_rgba(11,49,72,0.22)] sm:max-w-[46rem] sm:rounded-[28px] dark:border-white/10 [&>button]:right-3 [&>button]:top-3 [&>button]:text-[#5C6B76] sm:[&>button]:right-5 sm:[&>button]:top-5"
      >
        <div className="grid min-h-0 sm:grid-cols-[minmax(11rem,13.5rem)_minmax(0,1fr)]">
          <NovidadeIllustration />
          <div className="flex min-h-0 flex-col px-5 pb-5 pt-5 sm:px-8 sm:py-8">
            <p className="flex items-center gap-2 pr-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#079ED4]">
              <span className="inline-block h-3.5 w-0.5 rounded-full bg-[#079ED4]" />
              {item.kicker}
            </p>
            <DialogTitle className="mt-2 text-xl font-semibold leading-tight tracking-tight text-[#16324A] dark:text-foreground sm:mt-3 sm:text-[1.7rem]">
              {item.title}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-md text-sm leading-relaxed text-[#5C6B76] sm:text-[15px]">
              {item.summary}
            </DialogDescription>

            <div className="mt-5 rounded-2xl border border-dashed border-[#B7D7E6] bg-[#F3FAFD] px-4 py-5 text-center dark:border-[#079ED4]/30 dark:bg-[#079ED4]/10 sm:mt-6 sm:px-5 sm:py-6">
              <span className="mx-auto inline-flex size-11 items-center justify-center text-[#079ED4]">
                <CloudUpload className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.6} />
              </span>
              <p className="mt-2 text-[13px] font-semibold text-[#16324A] dark:text-foreground">
                {item.status}
              </p>
              {item.dropHint ? (
                <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-[#5C6B76]">
                  {item.dropHint}
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:mt-7 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-full px-5 sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Entendi
              </Button>
              {cta}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

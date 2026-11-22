import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, FileText } from "lucide-react";
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
  financeiroLiberado?: boolean;
  podeAbrirDestino?: boolean;
  /** @deprecated use podeAbrirDestino */
  podeAbrirTarefas?: boolean;
};

export function NovidadeAnuncioDialog({
  open,
  onOpenChange,
  financeiroLiberado = false,
  podeAbrirDestino,
  podeAbrirTarefas = true,
}: Props) {
  const item = anuncioNovidadeAtual(financeiroLiberado);
  if (!item) return null;
  const canOpenTarget = podeAbrirDestino ?? podeAbrirTarefas;
  const destaque = item.agora[0];

  const cta = canOpenTarget ? (
    <Button type="button" asChild className="h-10 rounded-full px-5">
      <Link to={item.href as "/leads"} onClick={() => onOpenChange(false)}>
        {item.hrefLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  ) : (
    <Button type="button" asChild className="h-10 rounded-full px-5">
      <Link to="/novidades" onClick={() => onOpenChange(false)}>
        Ver novidades
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50"
        className="gap-0 overflow-hidden rounded-2xl border bg-background p-6 text-foreground shadow-2xl sm:max-w-3xl sm:p-8"
      >
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <FileText className="size-4" />
          </span>
          {item.kicker}
        </p>
        <DialogTitle className="mt-4 pr-8 text-3xl font-semibold tracking-tight text-foreground">
          {item.title}
        </DialogTitle>
        <DialogDescription className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
          {item.summary}
        </DialogDescription>

        <div className="px-2 py-8 text-center">
          <CalendarClock
            className="mx-auto size-9 text-primary"
            strokeWidth={1.6}
          />
          {destaque ? (
            <p className="mt-4 text-lg font-semibold text-foreground">{destaque}</p>
          ) : null}
          {item.dropHint ? (
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {item.dropHint}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{item.status}</p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-5"
              onClick={() => onOpenChange(false)}
            >
              Entendi
            </Button>
            {cta}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

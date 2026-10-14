import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { anuncioNovidadeAtual } from "@/lib/novidades";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeAbrirTarefas?: boolean;
};

export function NovidadeAnuncioDialog({
  open,
  onOpenChange,
  podeAbrirTarefas = true,
}: Props) {
  const item = anuncioNovidadeAtual();
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {item.kicker}
          </p>
          <DialogTitle className="pt-1">{item.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {item.summary}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-xl border border-[#B7D7E6] bg-[#F3FAFD] px-3 py-2 text-sm leading-relaxed text-[#0B3148]">
          {item.status}
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
          {podeAbrirTarefas ? (
            <Button type="button" asChild>
              <Link to={item.href as "/leads"} onClick={() => onOpenChange(false)}>
                {item.hrefLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button type="button" asChild>
              <Link to="/novidades" onClick={() => onOpenChange(false)}>
                Ver novidades
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

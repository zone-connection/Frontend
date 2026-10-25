import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AtividadesProximasLista } from "@/components/atividades-proximas-lista";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AtividadeProxima } from "@/lib/atividades-proximas";
import {
  LEMBRETE_RECORRENCIA_LABEL,
  type LembretePessoal,
} from "@/lib/lembretes-api";

type Props = {
  open: boolean;
  items: LembretePessoal[];
  atividades: AtividadeProxima[];
  acknowledging: boolean;
  onEntendi: () => void;
};

export function LoginLembretesDialog({
  open,
  items,
  atividades,
  acknowledging,
  onEntendi,
}: Props) {
  if (items.length === 0 && atividades.length === 0) return null;

  const soAtividades = items.length === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onEntendi(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Bell className="h-3.5 w-3.5" />
            {soAtividades ? "Agenda" : "Lembrete"}
          </p>
          <DialogTitle className="pt-1">
            {soAtividades
              ? "Atividades próximas"
              : items.length === 1
                ? items[0]!.titulo
                : `${items.length} lembretes`}
          </DialogTitle>
          <DialogDescription>
            {soAtividades
              ? "Compromissos e tarefas dos próximos dias."
              : items.length === 1
                ? "Você pediu para ver isto ao entrar no sistema."
                : "Avisos que você cadastrou para esta entrada."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[#B7D7E6] bg-[#F3FAFD] px-3 py-3"
            >
              {items.length > 1 ? (
                <h3 className="text-sm font-semibold text-[#0B3148]">{item.titulo}</h3>
              ) : null}
              {item.descricao.trim() ? (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#0B3148]">
                  {item.descricao}
                </p>
              ) : items.length === 1 ? (
                <p className="text-sm text-muted-foreground">Sem descrição.</p>
              ) : null}
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {LEMBRETE_RECORRENCIA_LABEL[item.recorrencia]}
              </p>
            </article>
          ))}
          {atividades.length > 0 ? (
            <section>
              {!soAtividades ? (
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Atividades próximas
                </h3>
              ) : null}
              <AtividadesProximasLista items={atividades} />
            </section>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/lembretes">Gerenciar</Link>
          </Button>
          <Button type="button" onClick={onEntendi} disabled={acknowledging}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

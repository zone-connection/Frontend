import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import type { Lead } from "@/lib/crm-types";
import { mapApiLead, tornarLeadClienteApi } from "@/lib/leads-api";

export function TornarClienteDialog({
  lead,
  onClose,
  onConverted,
}: {
  lead: Pick<Lead, "id" | "nome"> | null;
  onClose: () => void;
  onConverted?: (lead: Lead) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    if (!lead) return;
    setSaving(true);
    try {
      const api = await tornarLeadClienteApi(lead.id);
      const next = mapApiLead(api);
      onConverted?.(next);
      toast.success(`${lead.nome} agora é cliente.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível transformar o lead em cliente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={lead != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tornar {lead?.nome} cliente</DialogTitle>
          <DialogDescription>
            O contato sai da tabela e do funil de leads e passa para a seção
            de clientes e o funil de clientes. A triagem e o histórico
            registram quem fez a transformação.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={() => void confirmar()}>
            {saving ? "Transformando..." : "Transformar em cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TornarClienteButton({
  leadId,
  leadNome,
  onConverted,
  compact = false,
}: {
  leadId: string;
  leadNome: string;
  onConverted?: (lead: Lead) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    setSaving(true);
    try {
      const api = await tornarLeadClienteApi(leadId);
      const lead = mapApiLead(api);
      onConverted?.(lead);
      toast.success(`${leadNome} agora é cliente.`);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível transformar o lead em cliente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-border/70 bg-muted/30 px-1.5 text-[11px] font-medium text-foreground hover:border-primary/30 hover:bg-muted/60"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          <UserRoundPlus className="h-3 w-3 text-primary" />
          Cliente
        </button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Tornar {leadNome} cliente</DialogTitle>
            <DialogDescription>
              O contato sai da tabela e do funil de leads e passa para a seção
              de clientes e o funil de clientes. A triagem e o histórico
              registram quem fez a transformação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void confirmar()}>
              {saving ? "Transformando..." : "Transformar em cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

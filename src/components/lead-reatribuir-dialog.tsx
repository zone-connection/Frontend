import { useEffect, useMemo, useState } from "react";
import { Loader2, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { Lead } from "@/lib/crm-types";
import { useLeads } from "@/lib/leads-store";
import { isCorretorLike } from "@/lib/permissions";

export function LeadReatribuirDialog({
  lead,
  open,
  onOpenChange,
  onReassigned,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassigned?: (lead: Lead) => void;
}) {
  const user = getSession();
  const { assignees, updateLead } = useLeads();
  const [corretorId, setCorretorId] = useState("");
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    const list = assignees.filter(
      (assignee) =>
        assignee.id !== lead?.corretorId &&
        (!assignee.role ||
          isCorretorLike(assignee.role) ||
          assignee.id === user?.id),
    );
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [assignees, lead?.corretorId, user?.id]);

  useEffect(() => {
    if (!open) return;
    setCorretorId("");
    setSaving(false);
  }, [open, lead?.id]);

  async function handleConfirm() {
    if (!lead || !corretorId || saving) return;
    setSaving(true);
    try {
      const updated = await updateLead(lead.id, { corretorId });
      const name =
        options.find((item) => item.id === corretorId)?.name ??
        "o novo corretor";
      toast.success(`${lead.nome} reatribuído para ${name}.`);
      onReassigned?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível reatribuir o lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  const atual = lead?.corretor && lead.corretor !== "—" ? lead.corretor : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRoundCog className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <DialogTitle>Reatribuir lead</DialogTitle>
              <DialogDescription>
                {lead
                  ? atual
                    ? `${lead.nome} está com ${atual}. Escolha o novo corretor.`
                    : `${lead.nome} está sem corretor. Escolha quem vai assumir.`
                  : "Escolha o novo corretor."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Novo corretor</Label>
          <Select
            value={corretorId || undefined}
            onValueChange={setCorretorId}
            disabled={saving || options.length === 0}
          >
            <SelectTrigger className="h-10 bg-background">
              <SelectValue
                placeholder={
                  options.length === 0
                    ? "Nenhum corretor disponível"
                    : "Selecione o corretor"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {options.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !corretorId}
            onClick={() => void handleConfirm()}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Reatribuindo…
              </>
            ) : (
              "Reatribuir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

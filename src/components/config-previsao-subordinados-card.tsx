import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { getSession, patchSessionTenant } from "@/lib/auth";
import { updateTenantCompany } from "@/lib/tenant-company-api";

export function ConfigPrevisaoSubordinadosCard() {
  const session = getSession();
  const podeEditar =
    session?.role === "admin" || session?.role === "super_admin";
  const [ativo, setAtivo] = useState(
    session?.tenant?.exibirPrevisaoSubordinados !== false,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sync = () => {
      const atual = getSession();
      setAtivo(atual?.tenant?.exibirPrevisaoSubordinados !== false);
    };
    window.addEventListener("crm-session-updated", sync);
    return () => window.removeEventListener("crm-session-updated", sync);
  }, []);

  async function alternar(next: boolean) {
    if (!podeEditar || saving) return;
    setAtivo(next);
    patchSessionTenant({ exibirPrevisaoSubordinados: next });
    setSaving(true);
    try {
      await updateTenantCompany({ exibirPrevisaoSubordinados: next });
      toast.success(
        next
          ? "Datas de previsão visíveis para a equipe."
          : "Datas de previsão ocultas para quem não é administrador.",
      );
    } catch (err) {
      const rollback = !next;
      setAtivo(rollback);
      patchSessionTenant({ exibirPrevisaoSubordinados: rollback });
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a configuração.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Datas de previsão da equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">
              Exibir datas de previsão dos subordinados
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Quando desligado, corretor, gerente e demais usuários abaixo do
              administrador deixam de ver previsões de recebimento, entrega e
              devolução. Administradores continuam vendo.
            </span>
          </span>
          <Switch
            checked={ativo}
            disabled={!podeEditar || saving}
            onCheckedChange={(checked) => void alternar(checked)}
            aria-label="Exibir datas de previsão dos subordinados"
          />
        </label>
      </CardContent>
    </Card>
  );
}

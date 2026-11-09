import { useState } from "react";
import { UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { fetchMe, getSession, patchSessionTenantModules } from "@/lib/auth";
import { updateTenantOperationModules } from "@/lib/tenant-company-api";

export function ConfigHideClientesMenuCard() {
  const isAdmin = getSession()?.role === "admin";
  const [hideClientes, setHideClientes] = useState(
    () => getSession()?.tenant?.modules?.hideClientesNav === true,
  );
  const [saving, setSaving] = useState(false);

  async function toggleHideClientes(checked: boolean) {
    if (!isAdmin || saving) return;
    setHideClientes(checked);
    setSaving(true);
    try {
      const data = await updateTenantOperationModules({
        hideClientesNav: checked,
      });
      setHideClientes(data.hideClientesNav === true);
      patchSessionTenantModules(data.modules);
      await fetchMe();
      toast.success(
        checked
          ? "Clientes ficou oculto para os usuários. O administrador continua vendo."
          : "Clientes voltou para todos os usuários.",
      );
    } catch (err) {
      setHideClientes(!checked);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar o módulo de Clientes.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <div className="rounded-lg border bg-muted/40 p-2">
          <UserCircle2 className="h-5 w-5 text-brand-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">
            Clientes e Funil de Clientes
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Desliga o módulo para os usuários da imobiliária. O administrador
            continua com Clientes e o Funil de Clientes.
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Desativar para os usuários</p>
          <p className="text-xs text-muted-foreground">
            Some do menu e bloqueia o acesso. O admin não perde o módulo.
          </p>
        </div>
        <Switch
          checked={hideClientes}
          disabled={saving}
          onCheckedChange={(checked) => void toggleHideClientes(checked)}
          aria-label="Desativar Clientes para os usuários"
        />
      </CardContent>
    </Card>
  );
}

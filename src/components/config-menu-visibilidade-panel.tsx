import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  MENU_OCULTAVEIS,
  getHiddenMenuPaths,
  setMenuPathVisible,
} from "@/lib/menu-visibility";

export function ConfigMenuVisibilidadePanel() {
  const [hidden, setHidden] = useState(() => getHiddenMenuPaths());

  function toggle(path: string, label: string, visible: boolean) {
    setMenuPathVisible(path, visible);
    setHidden(getHiddenMenuPaths());
    toast.success(
      visible ? `${label} voltou ao menu.` : `${label} oculto do menu.`,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Menu lateral</CardTitle>
        <p className="text-sm text-muted-foreground">
          Preferência só sua. Desligar um item tira ele da barra lateral. A
          tela continua acessível pelo endereço, e os outros usuários não são
          afetados. Configurações permanece sempre visível.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MENU_OCULTAVEIS.map((grupo) => (
          <div key={grupo.grupo} className="rounded-xl border bg-muted/20 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {grupo.grupo}
            </p>
            <div className="space-y-2">
              {grupo.items.map((item) => {
                const visible = !hidden.has(item.to);
                const switchId = `menu-visivel-${item.to}`;
                return (
                  <label
                    key={item.to}
                    htmlFor={switchId}
                    className="flex cursor-pointer items-center justify-between gap-3"
                  >
                    <span className="text-sm">{item.label}</span>
                    <Switch
                      id={switchId}
                      checked={visible}
                      onCheckedChange={(checked) =>
                        toggle(item.to, item.label, checked)
                      }
                      aria-label={`Exibir ${item.label} no menu`}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

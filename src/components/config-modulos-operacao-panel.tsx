import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Building2, Eye, Home, KeyRound, Landmark, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { fetchMe, getSession, patchSessionTenantModules } from "@/lib/auth";
import { useLeads } from "@/lib/leads-store";
import {
  fetchTenantOperationModules,
  updateTenantOperationModules,
  type TenantOperationModules,
} from "@/lib/tenant-company-api";
import { ConfigHideClientesMenuCard } from "@/components/config-hide-clientes-menu-card";
import { toast } from "sonner";

const CARDS: Array<{
  key: keyof TenantOperationModules;
  title: string;
  description: string;
  icon: typeof Home;
  locked?: boolean;
}> = [
  {
    key: "comercial",
    title: "Comercial",
    description:
      "CRM de lançamentos: leads, funil de vendas e operação atual da imobiliária.",
    icon: Building2,
    locked: true,
  },
  {
    key: "captacao",
    title: "Captação de Imóveis",
    description: "Gerencie proprietários, imóveis e processos de captação.",
    icon: Home,
  },
  {
    key: "imoveisUsados",
    title: "Venda de Imóveis Usados",
    description:
      "Gerencie a venda de imóveis usados, interessados, visitas e propostas.",
    icon: Landmark,
  },
  {
    key: "locacao",
    title: "Locação",
    description: "Gerencie locatários, contratos e operações de locação.",
    icon: KeyRound,
  },
];

export function ConfigModulosOperacaoPanel() {
  const router = useRouter();
  const { refresh: refreshLeads } = useLeads();
  const [ops, setOps] = useState<TenantOperationModules | null>(null);
  const [adminVerClientes, setAdminVerClientes] = useState(false);
  const [gerenteVerLeadsGerais, setGerenteVerLeadsGerais] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const session = getSession();
  const isAdmin = session?.role === "admin";
  const isSolo = session?.tenant?.plano === "solo";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTenantOperationModules();
      setOps(data.operations);
      setAdminVerClientes(data.adminVerClientesCorretor === true);
      setGerenteVerLeadsGerais(data.gerenteVerLeadsGerais === true);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as operações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: "captacao" | "imoveisUsados" | "locacao") {
    if (!ops || !isAdmin) return;
    const next = !ops[key];
    setSavingKey(key);
    try {
      const data = await updateTenantOperationModules({ [key]: next });
      setOps(data.operations);
      patchSessionTenantModules(data.modules);
      await fetchMe();
      await router.invalidate();
      toast.success(
        next
          ? "Operação ativada. Os funis já cadastrados continuam disponíveis."
          : "Operação desativada. Nada foi apagado — o funil permanece no cadastro.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a operação.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleGerenteVerLeadsGerais(checked: boolean) {
    if (!isAdmin) return;
    setGerenteVerLeadsGerais(checked);
    setSavingKey("gerenteVerLeadsGerais");
    try {
      const data = await updateTenantOperationModules({
        gerenteVerLeadsGerais: checked,
      });
      setOps(data.operations);
      setGerenteVerLeadsGerais(data.gerenteVerLeadsGerais === true);
      patchSessionTenantModules(data.modules);
      await fetchMe();
      await refreshLeads({ silent: true });
      await router.invalidate();
      toast.success(
        checked
          ? "Gerentes passam a ver os leads das outras equipes e os leads gerais."
          : "Gerentes voltam a ver só a própria equipe, sem o pool geral.",
      );
    } catch (err) {
      setGerenteVerLeadsGerais(!checked);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a visibilidade dos gerentes.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleAdminVerClientes(checked: boolean) {
    if (!isAdmin) return;
    setAdminVerClientes(checked);
    setSavingKey("adminVerClientesCorretor");
    try {
      const data = await updateTenantOperationModules({
        adminVerClientesCorretor: checked,
      });
      setOps(data.operations);
      setAdminVerClientes(data.adminVerClientesCorretor === true);
      patchSessionTenantModules(data.modules);
      await fetchMe();
      await refreshLeads({ silent: true });
      await router.invalidate();
      toast.success(
        checked
          ? "Você passa a ver os clientes dos corretores na lista, no Funil geral e no Funil de Clientes."
          : "A lista e os funis voltam a mostrar só a sua carteira de clientes.",
      );
    } catch (err) {
      setAdminVerClientes(!checked);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a visibilidade dos clientes.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Escolha quais operações esta imobiliária utiliza. Desativar esconde o
        menu e o acesso; funis e dados permanecem salvos.
      </p>
      {loading && (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const on = ops ? ops[card.key] : card.key === "comercial";
          return (
            <Card key={card.key}>
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <div className="rounded-lg border bg-muted/40 p-2">
                  <Icon className="h-5 w-5 text-brand-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Badge variant={on ? "default" : "secondary"}>
                  {on ? "Ativado" : "Desativado"}
                </Badge>
                {card.locked ? (
                  <span className="text-xs text-muted-foreground">
                    Sempre ativo no CRM
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={on}
                      disabled={!ops || !isAdmin || savingKey === card.key}
                      onCheckedChange={() =>
                        void toggle(
                          card.key as "captacao" | "imoveisUsados" | "locacao",
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={on ? "outline" : "default"}
                      disabled={!ops || !isAdmin || savingKey === card.key}
                      onClick={() =>
                        void toggle(
                          card.key as "captacao" | "imoveisUsados" | "locacao",
                        )
                      }
                    >
                      {on ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!isSolo ? <ConfigHideClientesMenuCard /> : null}
        {isAdmin && !isSolo ? (
          <Card>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <div className="rounded-lg border bg-muted/40 p-2">
                <Eye className="h-5 w-5 text-brand-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">
                  Ver clientes dos corretores
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quando ativo, o administrador vê a própria carteira e a dos
                  corretores em Clientes, no Funil de Clientes e também no Funil
                  geral. Os cards de cliente ficam identificados.
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Mostrar carteiras</p>
                <p className="text-xs text-muted-foreground">
                  Só o admin do tenant. Corretores continuam vendo só os
                  próprios clientes, e o Funil geral dos demais usuários não
                  mistura carteira de cliente.
                </p>
              </div>
              <Switch
                checked={adminVerClientes}
                disabled={savingKey === "adminVerClientesCorretor"}
                onCheckedChange={(checked) =>
                  void toggleAdminVerClientes(checked)
                }
                aria-label="Ver clientes dos corretores"
              />
            </CardContent>
          </Card>
        ) : null}
        {isAdmin && !isSolo ? (
          <Card>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <div className="rounded-lg border bg-muted/40 p-2">
                <Users className="h-5 w-5 text-brand-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">
                  Gerentes veem leads gerais e de outras equipes
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quando ativo, cada gerente vê os leads das outras equipes e o
                  pool geral. Desligado, o gerente fica só na própria equipe —
                  sem leads gerais e sem as carteiras dos outros gerentes.
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Compartilhar entre gerentes</p>
                <p className="text-xs text-muted-foreground">
                  Só o admin controla. Corretores continuam vendo apenas a
                  própria carteira.
                </p>
              </div>
              <Switch
                checked={gerenteVerLeadsGerais}
                disabled={savingKey === "gerenteVerLeadsGerais"}
                onCheckedChange={(checked) =>
                  void toggleGerenteVerLeadsGerais(checked)
                }
                aria-label="Gerentes veem leads gerais e de outras equipes"
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

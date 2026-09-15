import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  disconnectGoogleCalendar,
  fetchGoogleCalendarStatus,
  googleCalendarConnectHref,
  type GoogleCalendarStatus,
} from "@/lib/google-calendar-api";
import {
  completeMetaOAuth,
  disconnectMetaOAuth,
  fetchMetaOAuthAssets,
  fetchMetaOAuthStatus,
  metaOAuthConnectHref,
  type MetaOAuthAssets,
  type MetaOAuthStatus,
} from "@/lib/meta-oauth-api";
import { CalendarDays, Loader2, MessageCircle, Plus, RefreshCw, Share2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/auth";
import { PLATFORM_TENANT_ID } from "@/lib/platform-tenant";
import {
  createOzapConnection,
  deleteOzapConnection,
  fetchOzapConnections,
  updateOzapConnection,
  type TenantOzapConnection,
} from "@/lib/tenants-api";
import {
  completeOruloOAuth,
  connectOrulo,
  disconnectOrulo,
  fetchOruloOAuthUrl,
  fetchOruloStatus,
  syncOrulo,
  type OruloStatus,
} from "@/lib/orulo-api";

type Props = {
  selectingMeta?: boolean;
  oruloCallbackCode?: string;
};

export function ConfigConexoesPanel({
  selectingMeta = false,
  oruloCallbackCode,
}: Props) {
  return (
    <div className="space-y-4">
      <MetaConexoesCard selectingMeta={selectingMeta} />
      <IaConexoesCard />
      <GoogleConexoesCard />
      <OruloConexoesCard callbackCode={oruloCallbackCode} />
    </div>
  );
}

function MetaConexoesCard({ selectingMeta }: { selectingMeta: boolean }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<MetaOAuthStatus | null>(null);
  const [assets, setAssets] = useState<MetaOAuthAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageId, setPageId] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchMetaOAuthStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectingMeta) return;
    let cancelled = false;
    setBusy(true);
    void fetchMetaOAuthAssets()
      .then((next) => {
        if (cancelled) return;
        setAssets(next);
        setPageId(next.pages[0]?.id ?? "");
        setAdAccountId(next.adAccounts[0]?.id ?? "");
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível listar as Páginas do Facebook.",
        );
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectingMeta]);

  const clearMetaQuery = useCallback(() => {
    void navigate({
      to: "/configuracoes",
      search: { secao: "conta", item: "conexoes" },
      replace: true,
    });
  }, [navigate]);

  async function handleComplete() {
    if (!pageId) {
      toast.error("Selecione uma Página do Facebook.");
      return;
    }
    setBusy(true);
    try {
      const next = await completeMetaOAuth({
        pageId,
        ...(adAccountId ? { adAccountId } : {}),
      });
      setStatus(next);
      setAssets(null);
      toast.success("Facebook conectado. Os leads das campanhas entram no CRM.");
      clearMetaQuery();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível concluir a conexão.",
      );
    } finally {
      setBusy(false);
    }
  }

  const handleDisconnect = useCallback(
    async (thenConnect = false) => {
      setBusy(true);
      try {
        await disconnectMetaOAuth();
        setStatus({
          configured: true,
          connected: false,
          pageName: null,
          pageId: null,
          adAccountName: null,
        });
        setManageOpen(false);
        if (thenConnect) {
          window.location.assign(metaOAuthConnectHref());
          return;
        }
        toast.success("Facebook desconectado.");
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível desconectar o Facebook.",
        );
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Facebook e Instagram</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Receba automaticamente os leads do Meta Ads no CRM. Você só autoriza a
          conta — não precisa configurar webhook, token ou ID de Página.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando conexão…
          </div>
        ) : selectingMeta ? (
          <div className="space-y-4">
            <p className="text-sm">
              Escolha a Página e a conta de anúncios que vão enviar leads.
            </p>
            {assets && assets.pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma Página foi autorizada. Conecte de novo e marque as
                Páginas no Facebook.
              </p>
            ) : null}
            {assets && assets.pages.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="meta-page">Página</Label>
                  <select
                    id="meta-page"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                  >
                    {assets.pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meta-ad">Conta de anúncios</Label>
                  <select
                    id="meta-ad"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={adAccountId}
                    onChange={(e) => setAdAccountId(e.target.value)}
                  >
                    <option value="">Nenhuma</option>
                    {assets.adAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || !pageId}
                onClick={() => void handleComplete()}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Concluir conexão
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={clearMetaQuery}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : status.connected ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Conectado
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {status.pageName ?? "Página do Facebook"}
                  {status.adAccountName ? ` · ${status.adAccountName}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setManageOpen((open) => !open)}
              >
                Gerenciar conexão
              </Button>
            </div>
            {manageOpen ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleDisconnect(true)}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Reconectar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => void handleDisconnect(false)}
                >
                  <Unplug className="mr-1.5 h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta para importar automaticamente os leads das suas
              campanhas.
            </p>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                window.location.assign(metaOAuthConnectHref());
              }}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Conectar Facebook
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IaConexoesCard() {
  const user = getSession();
  const canManage = user?.role === "super_admin";
  const [connections, setConnections] = useState<TenantOzapConnection[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [busy, setBusy] = useState(false);
  const [instanceId, setInstanceId] = useState("");

  const load = useCallback(async () => {
    if (!canManage) return;
    const rows = await fetchOzapConnections(PLATFORM_TENANT_ID);
    setConnections(rows);
  }, [canManage]);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void load()
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar a conexão da IA.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, load]);

  if (!canManage) return null;

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const id = Number(instanceId.trim());
    if (!Number.isInteger(id) || id < 1) {
      toast.error("Informe o Instance ID numérico do OZap.");
      return;
    }
    setBusy(true);
    try {
      await createOzapConnection(PLATFORM_TENANT_ID, { instanceId: id });
      setInstanceId("");
      await load();
      toast.success("IA conectada. Os leads do WhatsApp entram no CRM da plataforma.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível conectar a IA.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggle(connection: TenantOzapConnection) {
    setBusy(true);
    try {
      await updateOzapConnection(PLATFORM_TENANT_ID, connection.id, {
        ativo: !connection.ativo,
      });
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a instância.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(connection: TenantOzapConnection) {
    setBusy(true);
    try {
      await deleteOzapConnection(PLATFORM_TENANT_ID, connection.id);
      await load();
      toast.success("Instância da IA desconectada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível desconectar a IA.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">IA / WhatsApp (OZap)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Vincule a instância do bot de IA da plataforma. Os leads do WhatsApp
          entram no CRM do super admin, como nas imobiliárias.
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando conexão…
          </div>
        ) : (
          <>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto]"
              onSubmit={(e) => void handleAdd(e)}
            >
              <div className="space-y-1.5">
                <Label htmlFor="platform-ozap-instance">Instance ID</Label>
                <Input
                  id="platform-ozap-instance"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  placeholder="1143"
                  inputMode="numeric"
                  disabled={busy}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={busy}>
                  <Plus className="h-4 w-4" />
                  Conectar
                </Button>
              </div>
            </form>
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma instância OZap vinculada à plataforma.
              </p>
            ) : (
              <ul className="space-y-2">
                {connections.map((connection) => (
                  <li
                    key={connection.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium">
                        Instância {connection.instanceId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {connection.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void toggle(connection)}
                      >
                        {connection.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={busy}
                        onClick={() => void remove(connection)}
                      >
                        <Unplug className="mr-1.5 h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GoogleConexoesCard() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchGoogleCalendarStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDisconnect = useCallback(async (thenConnect = false) => {
    setBusy(true);
    try {
      await disconnectGoogleCalendar();
      setStatus({
        configured: true,
        connected: false,
        googleEmail: null,
      });
      if (thenConnect) {
        window.location.assign(googleCalendarConnectHref());
        return;
      }
      toast.success(
        "Google Agenda desconectada. Os eventos já criados no Google permanecem lá.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível desconectar o Google.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0">
        <CardTitle className="text-base">Google Agenda</CardTitle>
        <Badge variant="secondary" className="text-[10px]">
          Em desenvolvimento
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Compromissos criados ou alterados no CRM são enviados para o seu
          Google Agenda. O Google não altera a agenda do CRM.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando conexão…
          </div>
        ) : !status?.configured ? (
          <p className="text-sm text-muted-foreground">
            A integração Google Agenda não está disponível neste ambiente.
          </p>
        ) : status.connected ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Conectado</p>
              <p className="truncate text-sm text-muted-foreground">
                {status.googleEmail ?? "Google Agenda"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void handleDisconnect(true)}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Trocar conta
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => void handleDisconnect(false)}
              >
                <Unplug className="mr-1.5 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              window.location.assign(googleCalendarConnectHref());
            }}
          >
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Conectar Google Agenda
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function OruloConexoesCard({ callbackCode }: { callbackCode?: string }) {
  const user = getSession();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [status, setStatus] = useState<OruloStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchOruloStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!callbackCode) return;
    let cancelled = false;
    setBusy(true);
    void completeOruloOAuth(callbackCode)
      .then(() => {
        if (!cancelled) toast.success("Órulo autorizada para dados comerciais.");
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível concluir a autorização Órulo.",
        );
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [callbackCode]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Informe Client ID e Secret da Órulo.");
      return;
    }
    setBusy(true);
    try {
      await connectOrulo({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });
      const next = await fetchOruloStatus();
      setStatus(next);
      setClientSecret("");
      toast.success("Órulo conectada. A sincronização do catálogo começou.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível conectar a Órulo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0">
        <CardTitle className="text-base">Órulo — catálogo de imóveis</CardTitle>
        <Badge variant="secondary" className="text-[10px]">
          Em desenvolvimento
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importa empreendimentos do catálogo da Órulo, atualiza via webhook e
          envia os links de publicação. Dados comerciais do corretor exigem
          autorização extra (oruloEndUserAuth).
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando conexão…
          </div>
        ) : status?.connected ? (
          <div className="space-y-3">
            <p className="text-sm">
              Conectada · Client ID {status.connection?.clientId}
              {status.connection?.syncing ? " · sincronizando…" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {(status.buildingCount ?? 0) === 0
                ? "Nenhum empreendimento importado ainda. Depois da sync, eles aparecem em Catálogo → Imóveis."
                : `${status.buildingCount} empreendimento(s) da Órulo no catálogo.`}
              {status.connection?.lastFullSyncAt
                ? ` Última sync: ${new Date(status.connection.lastFullSyncAt).toLocaleString("pt-BR")}.`
                : ""}
            </p>
            {status.connection?.lastError ? (
              <p className="text-sm text-destructive">
                {status.connection.lastError}
              </p>
            ) : null}
            {status.webhookUrl ? (
              <p className="text-xs text-muted-foreground">
                URL de webhook para o time da Órulo:{" "}
                <code className="rounded bg-muted px-1">{status.webhookUrl}</code>
              </p>
            ) : null}
            {status.oauthRedirectUri ? (
              <p className="text-xs text-muted-foreground">
                Redirect URI do corretor:{" "}
                <code className="rounded bg-muted px-1">
                  {status.oauthRedirectUri}
                </code>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void syncOrulo()
                    .then(async () => {
                      toast.success("Sincronização iniciada. Aguarde alguns segundos.");
                      for (let i = 0; i < 20; i += 1) {
                        await new Promise((r) => setTimeout(r, 2000));
                        const next = await fetchOruloStatus();
                        setStatus(next);
                        if (!next.connection?.syncing) {
                          if (next.connection?.lastError) {
                            toast.error(next.connection.lastError);
                          } else if ((next.buildingCount ?? 0) > 0) {
                            toast.success(
                              `${next.buildingCount} empreendimento(s) importados. Abra Catálogo → Imóveis.`,
                            );
                          } else {
                            toast.message(
                              "Sync terminou sem empreendimentos. Esse Client ID pode não ter distribuição na Órulo.",
                            );
                          }
                          break;
                        }
                      }
                    })
                    .catch((err) =>
                      toast.error(
                        err instanceof ApiError
                          ? err.message
                          : "Falha ao sincronizar.",
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Sincronizar agora
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  void fetchOruloOAuthUrl()
                    .then((res) => window.location.assign(res.url))
                    .catch((err) =>
                      toast.error(
                        err instanceof ApiError
                          ? err.message
                          : "Falha ao abrir autorização.",
                      ),
                    );
                }}
              >
                Autorizar corretor
              </Button>
              {isAdmin ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void disconnectOrulo()
                      .then(() => {
                        setStatus({
                          connected: false,
                          connection: null,
                          webhookUrl: status.webhookUrl,
                          oauthRedirectUri: status.oauthRedirectUri,
                        });
                        toast.success("Órulo desconectada.");
                      })
                      .catch((err) =>
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível desconectar.",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  <Unplug className="mr-1.5 h-4 w-4" />
                  Desconectar
                </Button>
              ) : null}
            </div>
          </div>
        ) : isAdmin ? (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void handleConnect(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="orulo-client">Client ID</Label>
              <Input
                id="orulo-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orulo-secret">Client Secret</Label>
              <Input
                id="orulo-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Conectar Órulo
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Peça ao administrador para cadastrar as credenciais da Órulo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

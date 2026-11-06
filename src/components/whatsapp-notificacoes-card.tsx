import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiFetch } from "@/lib/api";

type WhatsappStatus = "disconnected" | "connecting" | "connected" | "error";

type WhatsappConnection = {
  status: WhatsappStatus;
  phoneNumber: string | null;
  notificationsEnabled: boolean;
  connectedAt: string | null;
  lastConnectionCheck: string | null;
  qrCode: string | null;
};

const EMPTY: WhatsappConnection = {
  status: "disconnected",
  phoneNumber: null,
  notificationsEnabled: true,
  connectedAt: null,
  lastConnectionCheck: null,
  qrCode: null,
};

function formatWhen(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR");
}

export function WhatsappNotificacoesCard() {
  const [connection, setConnection] = useState<WhatsappConnection>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [senderQr, setSenderQr] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<WhatsappConnection>("/me/whatsapp");
    setConnection(data);
  }

  useEffect(() => {
    let active = true;
    void load()
      .catch(() => {
        if (active) setConnection(EMPTY);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (connection.status !== "connecting") return;
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [connection.status]);

  async function connect() {
    setBusy(true);
    try {
      setConnection(await apiFetch<WhatsappConnection>("/me/whatsapp/conectar", { method: "POST" }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível conectar o WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      setConnection(await apiFetch<WhatsappConnection>("/me/whatsapp", { method: "DELETE" }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível desconectar.");
    } finally {
      setBusy(false);
    }
  }

  async function connectSender() {
    setBusy(true);
    try {
      const data = await apiFetch<WhatsappConnection>("/me/whatsapp/remetente", { method: "POST" });
      setSenderQr(data.qrCode);
      if (!data.qrCode) toast.error("A Evolution não devolveu o QR Code do número de avisos.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível preparar o número de avisos.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(enabled: boolean) {
    setConnection((current) => ({ ...current, notificationsEnabled: enabled }));
    try {
      setConnection(
        await apiFetch<WhatsappConnection>("/me/whatsapp/avisos", {
          method: "PATCH",
          body: { enabled },
        }),
      );
    } catch (error) {
      setConnection((current) => ({ ...current, notificationsEnabled: !enabled }));
      toast.error(error instanceof ApiError ? error.message : "Não foi possível salvar a preferência.");
    }
  }

  const connectedAt = formatWhen(connection.connectedAt);
  const qr = connection.qrCode;

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-base">Notificações pelo WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando conexão...</p>
        ) : connection.status === "connected" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              WhatsApp conectado
            </div>
            {connection.phoneNumber ? (
              <p className="text-sm text-muted-foreground">Número: {connection.phoneNumber}</p>
            ) : null}
            {connectedAt ? (
              <p className="text-sm text-muted-foreground">Última conexão: {connectedAt}</p>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <div>
                <div className="text-sm font-medium">Avisos de novos leads</div>
                <div className="text-xs text-muted-foreground">
                  Mensagem no seu WhatsApp quando um lead novo for atribuído a você.
                </div>
              </div>
              <Switch checked={connection.notificationsEnabled} onCheckedChange={(value) => void toggle(value)} />
            </div>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void disconnect()}>
              Desconectar WhatsApp
            </Button>
            <p className="text-xs text-muted-foreground">
              O aviso precisa chegar de outro número. O WhatsApp não notifica mensagem que você envia para si mesmo.
            </p>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void connectSender()}>
              Conectar número de avisos
            </Button>
            {senderQr ? (
              <img src={senderQr.startsWith("data:") ? senderQr : `data:image/png;base64,${senderQr}`} alt="QR Code do número de avisos" className="h-56 w-56 rounded-md border bg-white p-2" />
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm">
                  {connection.status === "error" || connection.status === "connecting"
                    ? "A conexão com o WhatsApp foi interrompida ou ainda está pendente."
                    : "Conecte seu WhatsApp para receber um aviso quando um lead novo chegar para você."}
                </p>
                <p className="text-xs text-muted-foreground">
                  O QR Code é lido uma vez no aplicativo WhatsApp. A sessão permanece enquanto o aparelho mantiver a conexão.
                </p>
              </div>
            </div>
            {qr ? (
              <div className="space-y-2">
                <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR Code do WhatsApp" className="h-56 w-56 rounded-md border bg-white p-2" />
                <p className="text-xs text-muted-foreground">
                  Abra o WhatsApp, toque em Aparelhos conectados e escaneie o código. Ele expira; peça outro se precisar.
                </p>
              </div>
            ) : null}
            <Button type="button" disabled={busy} onClick={() => void connect()}>
              {connection.status === "disconnected" ? "Conectar meu WhatsApp" : "Gerar outro QR Code"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

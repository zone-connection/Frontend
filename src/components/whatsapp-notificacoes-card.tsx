import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api";

type WhatsappStatus = "disconnected" | "connecting" | "connected" | "error";

type SenderState = {
  status: WhatsappStatus;
  qrCode: string | null;
};

export function WhatsappNotificacoesCard() {
  const [status, setStatus] = useState<WhatsappStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await apiFetch<SenderState>("/me/whatsapp/remetente");
    setStatus(data.status);
    if (data.status === "connected") setQrCode(null);
  }

  useEffect(() => {
    let active = true;
    void load()
      .catch(() => {
        if (active) setStatus("disconnected");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!qrCode || status === "connected") return;
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [qrCode, status]);

  async function connect() {
    setBusy(true);
    try {
      const data = await apiFetch<SenderState>("/me/whatsapp/remetente", { method: "POST" });
      setQrCode(data.qrCode);
      setStatus(data.status);
      if (!data.qrCode) toast.error("A Evolution não devolveu o QR Code.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível preparar o número de avisos.");
    } finally {
      setBusy(false);
    }
  }

  const qr = qrCode;

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-base">Notificações pelo WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm">
                  {status === "connected"
                    ? "O número de avisos está conectado. O corretor recebe a mensagem no WhatsApp que já está no cadastro dele."
                    : "Conecte um único número da imobiliária. Ele avisa o corretor no WhatsApp cadastrado, quando um lead for atribuído."}
                </p>
                <p className="text-xs text-muted-foreground">
                  O corretor não conecta o próprio WhatsApp. O celular dele só precisa estar no cadastro do usuário.
                  Escaneie em Aparelhos conectados, em menos de um minuto. Se o WhatsApp recusar, gere outro código.
                </p>
              </div>
            </div>
            {status === "connected" ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Número de avisos conectado
              </div>
            ) : null}
            {qr ? (
              <img
                src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
                alt="QR Code do número de avisos"
                className="h-56 w-56 rounded-md border bg-white p-2"
              />
            ) : null}
            <Button type="button" disabled={busy} onClick={() => void connect()}>
              {status === "connected" ? "Gerar outro QR Code" : "Conectar número de avisos"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

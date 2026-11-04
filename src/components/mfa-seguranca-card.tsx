import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";

type MfaStatus = {
  policy: "obrigatoria" | "escolha" | "voluntaria";
  enabled: boolean;
  enabledAt: string | null;
  canDisable: boolean;
  authenticator: string;
  recoveryCodesLeft: number;
};

export function MfaSegurancaCard() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<MfaStatus>("/auth/mfa/status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function ativar() {
    setLoading(true);
    try {
      const data = await apiFetch<{ qrDataUrl: string }>("/auth/mfa/enable", { method: "POST" });
      setQr(data.qrDataUrl);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível iniciar a configuração.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmar() {
    setLoading(true);
    try {
      const data = await apiFetch<{ recoveryCodes: string[] }>("/auth/mfa/enable/confirm", {
        method: "POST",
        body: { code },
      });
      setRecovery(data.recoveryCodes);
      setQr(null);
      setStatus((current) => current && { ...current, enabled: true, enabledAt: new Date().toISOString() });
      toast.success("Autenticação em duas etapas ativada.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  async function desativar() {
    setLoading(true);
    try {
      await apiFetch("/auth/mfa/disable", { method: "POST", body: { password, code } });
      toast.success("Autenticação em duas etapas desativada. Entre novamente.");
      window.location.assign("/login");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível desativar.");
      setLoading(false);
    }
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-base">Segurança</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          Autenticação em duas etapas:{" "}
          <strong>{status?.enabled ? "ativa" : "desativada"}</strong>
        </p>
        {status?.enabledAt ? (
          <p className="text-muted-foreground">
            Ativada em {new Date(status.enabledAt).toLocaleString("pt-BR")}. {status.authenticator}.
            Códigos de recuperação restantes: {status.recoveryCodesLeft}.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Use Google Authenticator, Microsoft Authenticator ou outro aplicativo compatível.
            {status?.policy === "obrigatoria" ? " Para o super admin, a proteção é obrigatória." : " A ativação é voluntária para o seu perfil."}
          </p>
        )}
        {recovery ? (
          <ul className="grid grid-cols-2 gap-2 font-mono">
            {recovery.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
        {qr ? (
          <div className="space-y-2">
            <img src={qr} alt="QR Code do autenticador" className="h-40 w-40" />
            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código de 6 dígitos" />
            <Button type="button" disabled={loading} onClick={() => void confirmar()}>Confirmar código</Button>
          </div>
        ) : status?.enabled && status.canDisable ? (
          <div className="grid gap-2 md:grid-cols-2">
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha atual" />
            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código atual" />
            <Button type="button" variant="outline" disabled={loading} onClick={() => void desativar()}>Desativar</Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => void ativar()}>Reconfigurar autenticador</Button>
          </div>
        ) : !status?.enabled ? (
          <Button type="button" disabled={loading} onClick={() => void ativar()}>Ativar</Button>
        ) : (
          <p className="text-muted-foreground">A proteção do super admin não pode ser desativada.</p>
        )}
      </CardContent>
    </Card>
  );
}

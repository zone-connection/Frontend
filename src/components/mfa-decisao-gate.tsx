import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";
import { clearMfaDecisionPending } from "@/lib/auth";

export function MfaDecisaoGate({
  onDone,
  startWithQr = false,
}: {
  onDone: () => void;
  startWithQr?: boolean;
}) {
  const [openRisk, setOpenRisk] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!startWithQr) return;
    apiFetch<{ qrDataUrl: string }>("/auth/mfa/enable", { method: "POST" })
      .then((data) => setQr(data.qrDataUrl))
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Não foi possível gerar o QR Code.");
      });
  }, [startWithQr]);
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function escolher(choice: "manter" | "recusar", senha: string) {
    setLoading(true);
    try {
      const result = await apiFetch<{ setup: boolean }>("/auth/mfa/decisao", {
        method: "POST",
        body: { choice, password: senha },
      });
      if (choice === "recusar") {
        clearMfaDecisionPending();
        onDone();
        toast.success("Proteção desativada. Você pode reativar no perfil.");
        return;
      }
      if (result.setup) {
        const data = await apiFetch<{ qrDataUrl: string }>("/auth/mfa/enable", { method: "POST" });
        setQr(data.qrDataUrl);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar a escolha.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmarCodigo() {
    setLoading(true);
    try {
      const data = await apiFetch<{ recoveryCodes: string[] }>("/auth/mfa/enable/confirm", {
        method: "POST",
        body: { code },
      });
      setRecovery(data.recoveryCodes);
      setQr(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/95 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-lg">
        {recovery ? (
          <>
            <h2 className="text-lg font-semibold">Guarde os códigos de recuperação</h2>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recovery.map((item) => (
                <li key={item} className="rounded-md bg-muted px-2 py-1">{item}</li>
              ))}
            </ul>
            <Button type="button" className="w-full" onClick={() => { clearMfaDecisionPending(); onDone(); }}>
              Continuar
            </Button>
          </>
        ) : qr ? (
          <>
            <h2 className="text-lg font-semibold">Configure o autenticador</h2>
            <img src={qr} alt="QR Code da autenticação em duas etapas" className="mx-auto h-48 w-48" />
            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código de 6 dígitos" />
            <Button type="button" className="w-full" disabled={loading} onClick={() => void confirmarCodigo()}>
              Confirmar código
            </Button>
          </>
        ) : (
          <>
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Proteja o acesso da imobiliária</h2>
            <p className="text-sm text-muted-foreground">
              A autenticação em duas etapas pede um código do celular além da senha. Essa escolha aparece uma vez.
            </p>
            <Button type="button" className="w-full" disabled={loading} onClick={() => void escolher("manter", "")}>
              Manter proteção
            </Button>
            {!openRisk ? (
              <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => setOpenRisk(true)}>
                Desativar proteção
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <ul className="list-disc space-y-1 pl-4">
                  <li>Maior vulnerabilidade se a senha vazar.</li>
                  <li>Possibilidade de acesso indevido à conta.</li>
                  <li>Menos proteção para os dados da imobiliária.</li>
                  <li>Mais risco para clientes e negociações.</li>
                </ul>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha atual" />
                <Button type="button" variant="outline" disabled={loading || password.length < 8} onClick={() => void escolher("recusar", password)}>
                  Confirmar desativação
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

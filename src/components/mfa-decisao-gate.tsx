import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";
import { clearMfaDecisionPending } from "@/lib/auth";

export function MfaDecisaoGate({ onDone }: { onDone: () => void }) {
  const [openRisk, setOpenRisk] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function manter() {
    setLoading(true);
    try {
      await apiFetch("/auth/mfa/decisao", {
        method: "POST",
        body: { choice: "manter" },
      });
      clearMfaDecisionPending();
      onDone();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível manter a proteção.");
    } finally {
      setLoading(false);
    }
  }

  async function desativar() {
    setLoading(true);
    try {
      await apiFetch("/auth/mfa/decisao", {
        method: "POST",
        body: { choice: "recusar", password, code },
      });
      clearMfaDecisionPending();
      onDone();
      toast.success("Autenticação em duas etapas desativada. Você pode reativar no perfil.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível desativar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/95 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-lg">
        <ShieldAlert className="h-8 w-8 text-amber-600" />
        <h2 className="text-lg font-semibold">A autenticação em duas etapas está ativa</h2>
        <p className="text-sm text-muted-foreground">
          O aplicativo autenticador já foi cadastrado. Você pode manter a proteção ou desativar agora. Essa escolha aparece uma vez.
        </p>
        <Button type="button" className="w-full" disabled={loading} onClick={() => void manter()}>
          Manter proteção
        </Button>
        {!openRisk ? (
          <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => setOpenRisk(true)}>
            Desativar autenticação
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-medium">Desativar aumenta estes riscos:</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Maior vulnerabilidade se a senha vazar.</li>
              <li>Possibilidade de acesso indevido à conta.</li>
              <li>Menos proteção para os dados da imobiliária.</li>
              <li>Mais risco para clientes e negociações.</li>
            </ul>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha atual" />
            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código do autenticador" inputMode="numeric" />
            <Button type="button" variant="outline" disabled={loading || password.length < 8 || code.trim().length < 6} onClick={() => void desativar()}>
              Confirmar desativação
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import { fetchMe, getSession } from "@/lib/auth";

export const Route = createFileRoute("/_app/seguranca/2fa")({
  head: () => ({ meta: [{ title: "Autenticação 2FA — Zone Connection" }] }),
  component: Decisao2faPage,
});

type Estado = {
  twoFactorStatus: "pendente" | "ativo" | "desativado" | "nao_aplica";
};

export function Decisao2faPage() {
  const pendente = getSession()?.twoFactorStatus === "pendente";
  const [modo, setModo] = useState<"escolha" | "ativar" | "risco">("escolha");
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [code, setCode] = useState("");
  const [aceito, setAceito] = useState(false);
  const [termos, setTermos] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    void apiFetch<Estado>("/seguranca/2fa/eu")
      .then(setEstado)
      .catch(() => undefined);
    void apiFetch<{ text: string }>("/seguranca/2fa/termos")
      .then((row) => setTermos(row.text))
      .catch(() => undefined);
  }, []);

  async function preparar() {
    setBusy(true);
    try {
      const data = await apiFetch<{ secret: string; otpauthUrl: string }>(
        "/seguranca/2fa/preparar",
        { method: "POST" },
      );
      setSecret(data.secret);
      setOtpauth(data.otpauthUrl);
      setModo("ativar");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível gerar o autenticador.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmar() {
    setBusy(true);
    try {
      const data = await apiFetch<{ recoveryCodes: string[] }>(
        "/seguranca/2fa/confirmar",
        { method: "POST", body: { code } },
      );
      setRecovery(data.recoveryCodes);
      await fetchMe();
      toast.success("Autenticação de dois fatores confirmada.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Código inválido.");
    } finally {
      setBusy(false);
    }
  }

  async function desativar() {
    setBusy(true);
    try {
      await apiFetch("/seguranca/2fa/aceitar-risco", {
        method: "POST",
        body: { aceito: true },
      });
      await fetchMe();
      setEstado({ twoFactorStatus: "desativado" });
      setModo("escolha");
      toast.success("Decisão registrada. O 2FA ficou desativado.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar a decisão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader
        eyebrow="Segurança"
        title="Autenticação de dois fatores"
        description={
          pendente
            ? "Antes de entrar no CRM, escolha manter a proteção ou aceitar o risco de desativá-la."
            : "Você pode ativar ou desativar a proteção. Cada mudança fica no histórico."
        }
      />

      {recovery ? (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Guarde os códigos de recuperação</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Eles aparecem só agora. Use um código se perder o autenticador. Cada código funciona uma vez.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {recovery.map((item) => (
              <li key={item} className="rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                {item}
              </li>
            ))}
          </ul>
          <Button className="mt-5" onClick={() => (window.location.href = "/")}>
            Continuar para o CRM
          </Button>
        </section>
      ) : null}

      {!recovery && modo === "escolha" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void preparar()}
            disabled={busy}
            className="rounded-2xl border bg-card p-5 text-left hover:border-primary"
          >
            <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
            <div className="font-semibold">Manter 2FA</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Configura e confirma o segundo fator. Estado: ativo.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setModo("risco")}
            className="rounded-2xl border bg-card p-5 text-left hover:border-primary"
          >
            <ShieldOff className="mb-3 h-5 w-5" />
            <div className="font-semibold">Aceitar o risco</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Lê os termos e confirma a desativação. Estado: desativado.
            </p>
          </button>
          {estado?.twoFactorStatus === "ativo" ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              A proteção está ativa. Para desligar, aceite o risco. Para trocar o autenticador, escolha manter 2FA de novo.
            </p>
          ) : null}
          {estado?.twoFactorStatus === "desativado" ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              O 2FA está desativado. Você pode ativá-lo quando quiser.
            </p>
          ) : null}
        </div>
      ) : null}

      {!recovery && modo === "ativar" ? (
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            No aplicativo autenticador, use a chave abaixo ou cole o endereço otpauth.
          </p>
          <p className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm">{secret}</p>
          <p className="break-all text-xs text-muted-foreground">{otpauth}</p>
          <label className="block text-sm font-medium">
            Código de confirmação
            <input
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void confirmar()} disabled={busy || code.trim().length < 6}>
              Confirmar
            </Button>
            <Button variant="outline" onClick={() => setModo("escolha")}>
              Voltar
            </Button>
          </div>
        </section>
      ) : null}

      {!recovery && modo === "risco" ? (
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <p className="text-sm leading-relaxed">{termos}</p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(event) => setAceito(event.target.checked)}
            />
            Li os termos e quero desativar a autenticação de dois fatores.
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void desativar()} disabled={!aceito || busy}>
              Confirmar desativação
            </Button>
            <Button variant="outline" onClick={() => setModo("escolha")}>
              Voltar
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

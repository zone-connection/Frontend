import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

export const Route = createFileRoute("/_app/seguranca/2fa")({
  head: () => ({ meta: [{ title: "Autenticação 2FA — Zone Connection" }] }),
  component: Decisao2faPage,
});

type Estado = {
  twoFactorStatus: "pendente" | "ativo" | "desativado" | "nao_aplica";
  codigoConfirmado?: boolean;
};

export function Decisao2faPage() {
  const [modo, setModo] = useState<"codigo" | "escolha" | "risco">("codigo");
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [code, setCode] = useState("");
  const [aceito, setAceito] = useState(false);
  const [termos, setTermos] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    if (!otpauth) {
      setQrCodeUrl("");
      return;
    }
    let cancelled = false;
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(otpauth, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "M",
        }),
      )
      .then((url) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrCodeUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [otpauth]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const atual = await apiFetch<Estado>("/seguranca/2fa/eu");
        if (cancelled) return;
        setEstado(atual);
        if (atual.twoFactorStatus === "pendente" && atual.codigoConfirmado) {
          setModo("escolha");
          return;
        }
        if (
          atual.twoFactorStatus === "pendente" ||
          atual.twoFactorStatus === "desativado"
        ) {
          const data = await apiFetch<{ secret: string; otpauthUrl: string }>(
            "/seguranca/2fa/preparar",
            { method: "POST" },
          );
          if (cancelled) return;
          setSecret(data.secret);
          setOtpauth(data.otpauthUrl);
          setModo("codigo");
          return;
        }
        setModo("escolha");
      } catch (error) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar a autenticação de dois fatores.",
        );
      }
      try {
        const row = await apiFetch<{ text: string }>("/seguranca/2fa/termos");
        if (!cancelled) setTermos(row.text);
      } catch {
        // termos só são necessários na desativação
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmar() {
    setBusy(true);
    try {
      const data = await apiFetch<{
        recoveryCodes: string[];
        codigoConfirmado?: boolean;
      }>("/seguranca/2fa/confirmar", { method: "POST", body: { code } });
      setRecovery(data.recoveryCodes);
      setEstado((atual) =>
        atual
          ? { ...atual, codigoConfirmado: true }
          : { twoFactorStatus: "pendente", codigoConfirmado: true },
      );
      setModo("escolha");
      toast.success("Código confirmado. Agora escolha manter ou desativar.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Código inválido.");
    } finally {
      setBusy(false);
    }
  }

  async function manter() {
    setBusy(true);
    try {
      await apiFetch("/seguranca/2fa/manter", { method: "POST" });
      await fetchMe();
      window.location.href = "/";
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível manter o 2FA.");
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
      window.location.href = "/";
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
        description="Confirme o código do autenticador. Só depois disso você escolhe manter a proteção ou desativá-la."
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
          <Button className="mt-5" onClick={() => setRecovery(null)} disabled={modo !== "escolha"}>
            Escolher manter ou desativar
          </Button>
        </section>
      ) : null}

      {!recovery && modo === "codigo" ? (
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Abra o Google Authenticator, escaneie o QR code e informe o código de 6 dígitos.
          </p>
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QR code para o Google Authenticator"
              className="mx-auto h-56 w-56 rounded-xl border bg-white p-2"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Gerando QR code…</p>
          )}
          <p className="text-xs text-muted-foreground">
            Se a câmera não ler, cadastre esta chave manualmente:
          </p>
          <p className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm">
            {secret || "Gerando chave…"}
          </p>
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
          <Button onClick={() => void confirmar()} disabled={busy || !secret || code.trim().length < 6}>
            Confirmar código
          </Button>
        </section>
      ) : null}

      {!recovery && modo === "escolha" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void manter()}
            disabled={busy}
            className="rounded-2xl border bg-card p-5 text-left hover:border-primary"
          >
            <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
            <div className="font-semibold">Manter 2FA</div>
            <p className="mt-1 text-sm text-muted-foreground">
              O código já foi confirmado. O segundo fator permanece ativo.
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
              A proteção está ativa. Para desligar, aceite o risco.
            </p>
          ) : null}
        </div>
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

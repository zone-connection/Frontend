import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  confirmMfaSetup,
  decideMfa,
  recoverMfa,
  startMfaSetup,
  verifyMfa,
  type AuthUser,
  type LoginResult,
} from "@/lib/auth";

export function MfaLoginPanel({
  step,
  password,
  onStep,
  onAuthenticated,
}: {
  step: Exclude<LoginResult, { kind: "session" }>;
  password: string;
  onStep: (step: Exclude<LoginResult, { kind: "session" }>) => void;
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [readyUser, setReadyUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (step.kind !== "setup") return;
    let active = true;
    startMfaSetup(step.setupToken)
      .then((data) => {
        if (active) setQr(data.qrDataUrl);
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Não foi possível gerar o QR Code.");
      });
    return () => {
      active = false;
    };
  }, [step]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (step.kind === "mfa") {
        const user = recovery
          ? await recoverMfa(step.mfaToken, code)
          : await verifyMfa(step.mfaToken, code);
        onAuthenticated(user);
        return;
      }
      if (step.kind === "setup") {
        const result = await confirmMfaSetup(step.setupToken, code);
        setReadyUser(result.user);
        setCodes(result.recoveryCodes);
        return;
      }
      const next = await decideMfa(step.decisionToken, "manter", password);
      if (next.kind === "session") onAuthenticated(next.user);
      else onStep(next);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível validar.");
    } finally {
      setLoading(false);
    }
  }

  if (codes) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-brand-dark">Guarde os códigos de recuperação</h2>
        <p className="text-sm text-[#5C6B76]">
          Cada código funciona uma vez se você perder o aplicativo autenticador. Eles não serão mostrados de novo.
        </p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
          {codes.map((item) => (
            <li key={item} className="rounded-md bg-slate-100 px-2 py-1">{item}</li>
          ))}
        </ul>
        <button
          type="button"
          className="w-full rounded-full bg-brand-cta px-4 py-3 text-sm font-semibold text-white"
          onClick={() => readyUser && onAuthenticated(readyUser)}
        >
          Continuar
        </button>
      </div>
    );
  }

  if (step.kind === "decision") {
    return (
      <div className="space-y-4">
        <ShieldCheck className="h-8 w-8 text-brand-accent" />
        <h2 className="text-lg font-semibold text-brand-dark">Proteja o acesso da imobiliária</h2>
        <p className="text-sm text-[#5C6B76]">
          A autenticação em duas etapas pede um código do celular além da senha. Essa escolha aparece uma vez.
        </p>
        <button
          type="button"
          disabled={loading}
          className="w-full rounded-full bg-brand-cta px-4 py-3 text-sm font-semibold text-white"
          onClick={(event) => void submit(event)}
        >
          Manter proteção
        </button>
        <DesativarAviso
          password={password}
          loading={loading}
          onConfirm={async (senha) => {
            setLoading(true);
            try {
              const next = await decideMfa(step.decisionToken, "recusar", senha);
              if (next.kind === "session") onAuthenticated(next.user);
            } catch (error) {
              toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar a decisão.");
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      {step.kind === "setup" ? (
        <>
          <h2 className="text-lg font-semibold text-brand-dark">Configure o autenticador</h2>
          <p className="text-sm text-[#5C6B76]">
            Escaneie o QR Code no Google Authenticator, Microsoft Authenticator ou outro aplicativo compatível.
          </p>
          {qr ? <img src={qr} alt="QR Code da autenticação em duas etapas" className="mx-auto h-48 w-48" /> : <p className="text-sm">Gerando QR Code...</p>}
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-brand-dark">Código de verificação</h2>
          <p className="text-sm text-[#5C6B76]">
            {recovery ? "Informe um código de recuperação." : "Informe o código de seis dígitos do aplicativo autenticador."}
          </p>
        </>
      )}
      <input
        inputMode={recovery ? "text" : "numeric"}
        autoComplete="one-time-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="w-full rounded-xl border px-3 py-3 text-center tracking-[0.3em]"
        placeholder={recovery ? "XXXX-XXXX" : "000000"}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-brand-cta px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Validando..." : "Confirmar"}
      </button>
      {step.kind === "mfa" ? (
        <button type="button" className="w-full text-sm text-[#5C6B76]" onClick={() => setRecovery((value) => !value)}>
          {recovery ? "Usar código do aplicativo" : "Usar código de recuperação"}
        </button>
      ) : null}
    </form>
  );
}

function DesativarAviso({
  password,
  loading,
  onConfirm,
}: {
  password: string;
  loading: boolean;
  onConfirm: (senha: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState(password);
  if (!open) {
    return (
      <button type="button" className="w-full text-sm text-[#5C6B76]" onClick={() => setOpen(true)}>
        Desativar proteção
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-medium">Sem a segunda etapa, a conta fica mais exposta:</p>
      <ul className="list-disc space-y-1 pl-4">
        <li>Maior vulnerabilidade se a senha vazar.</li>
        <li>Possibilidade de acesso indevido à conta.</li>
        <li>Menos proteção para os dados da imobiliária.</li>
        <li>Mais risco para clientes e negociações.</li>
      </ul>
      <input
        type="password"
        value={senha}
        onChange={(event) => setSenha(event.target.value)}
        className="w-full rounded-lg border px-3 py-2"
        placeholder="Senha atual"
      />
      <button
        type="button"
        disabled={loading || senha.length < 8}
        className="w-full rounded-full bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
        onClick={() => onConfirm(senha)}
      >
        Confirmar desativação
      </button>
    </div>
  );
}

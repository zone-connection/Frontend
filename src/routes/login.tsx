import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Building2,
  BarChart3,
  Users,
  Mail,
  Lock,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiError } from "@/lib/api";
import { signIn } from "@/lib/auth";
import { signInPortal } from "@/lib/portal-auth";
import { signInParceiro } from "@/lib/parceiros-auth";
import { getWhatsAppUrl } from "@/lib/env";
import { defaultRouteForRole } from "@/lib/permissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  ssr: false,
  // SSR ativo: evita mismatch Suspense (servidor) vs página (cliente) no React 19.
  head: () => ({
    meta: [
      { title: "Entrar — Zone Connection" },
      {
        name: "description",
        content:
          "Acesse a Zone Connection para gerenciar leads, funil, imóveis e corretores.",
      },
      { property: "og:title", content: "Entrar — Zone Connection" },
      {
        property: "og:description",
        content: "Tudo em uma só conexão para a gestão da sua imobiliária.",
      },
    ],
  }),
  component: LoginPage,
});

const FEATURE_PILLS = [
  { label: "CRM integrado", icon: Users },
  { label: "Funil comercial", icon: BarChart3 },
  { label: "Gestão de imóveis", icon: Building2 },
] as const;

function ConcentricRings({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-[70%] top-[40%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 sm:h-52 sm:w-52",
        className,
      )}
    >
      <div className="absolute inset-0 rounded-full border border-brand-accent/15" />
      <div className="absolute inset-7 rounded-full border border-brand-accent/30 sm:inset-8 animate-[login-ring-pulse_3.5s_ease-in-out_infinite]" />
    </div>
  );
}

/** Atmosfera visual só no mobile — degradê + motion mínimo. */
function MobileLoginAtmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden"
      style={{
        background:
          "radial-gradient(circle at 18% 12%, #0b7088 0%, #053647 42%, #021923 100%)",
      }}
    >
      <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-brand-accent/20 blur-3xl animate-[login-orb-drift_12s_ease-in-out_infinite]" />
      <div className="absolute -right-10 bottom-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl animate-[login-orb-drift_16s_ease-in-out_infinite_reverse]" />
      <ConcentricRings className="left-[78%] top-[18%] opacity-80" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[#021923]/80 to-transparent" />
    </div>
  );
}

function LoginBrandLogo({
  size = "md",
  tone = "default",
}: {
  size?: "md" | "lg";
  tone?: "default" | "light";
}) {
  const isLarge = size === "lg";
  return (
    <div
      className="inline-flex items-center gap-4"
      aria-label="Zone Connection"
    >
      <img
        src="/LozoZone.png"
        alt=""
        className={cn(
          "shrink-0 object-contain",
          isLarge ? "h-14 w-14" : "h-10 w-10",
        )}
        aria-hidden
      />
      <div className="flex flex-col">
        <span
          className={cn(
            "font-semibold leading-none",
            tone === "light" ? "text-white" : "text-brand-dark",
            isLarge ? "text-3xl" : "text-xl",
          )}
        >
          Zone
        </span>
        <span
          className={cn(
            "font-semibold text-brand-accent leading-none",
            isLarge ? "text-2xl -mt-1.5" : "text-lg -mt-1",
          )}
        >
          Connection
        </span>
      </div>
    </div>
  );
}

function LoginAuthField({
  id,
  label,
  labelExtra,
  type = "text",
  value,
  onChange,
  icon: Icon,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  labelExtra?: ReactNode;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  icon: typeof Mail;
  placeholder?: string;
  required?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-brand-dark">
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <input
          id={id}
          type={isPassword && showPassword ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={isPassword ? "current-password" : "email"}
          className={cn(
            "h-11 w-full rounded-xl border border-border bg-white pl-10 text-sm text-brand-dark outline-none transition-colors",
            isPassword ? "pr-10" : "pr-3",
            "placeholder:text-text-muted/70 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20",
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-text-muted transition-colors hover:text-brand-dark"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signIn(email, password);
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
      navigate({ to: defaultRouteForRole(user.role, user) });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        try {
          const me = await signInPortal(email, password);
          toast.success(`Olá, ${me.nome.split(" ")[0]}`);
          navigate({ to: "/portal" });
          return;
        } catch (portalError) {
          try {
            const me = await signInParceiro(email, password);
            toast.success(`Olá, ${me.nome.split(" ")[0]}`);
            navigate({ to: "/parceiros" });
            return;
          } catch {
            if (
              portalError instanceof ApiError &&
              (portalError.status === 400 || portalError.status === 403)
            ) {
              toast.message("Esta conta é do portal do proprietário.");
              navigate({
                to: "/portal/login",
                search: { email: email.trim() },
              });
              return;
            }
          }
        }
      }
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível entrar",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-surface-muted">
      <aside
        className="relative hidden overflow-hidden px-6 py-8 text-white sm:px-10 lg:flex lg:w-[45%] lg:flex-col lg:px-12 lg:py-10 xl:w-[42%] animate-[login-slide-in_0.6s_ease-out]"
        style={{
          background:
            "radial-gradient(circle at 28% 38%, #0b7088 0%, #053647 48%, #021923 100%)",
        }}
      >
        <ConcentricRings />

        <div className="relative z-10 mx-auto flex min-h-full w-full flex-col">
          <div className="animate-[login-fade_0.5s_ease-out]">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir para o site
            </Link>
          </div>

          <div className="mt-8 animate-[login-fade_0.5s_ease-out_0.08s_both] lg:mt-10">
            <LoginBrandLogo size="lg" tone="light" />
          </div>

          <div className="mt-10 flex flex-1 flex-col justify-center gap-8 lg:mt-12">
            <div className="flex max-w-lg flex-col gap-5 animate-[login-fade_0.5s_ease-out_0.15s_both]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-brand-accent"
                  aria-hidden
                />
                Zone Connection · Imobiliárias
              </div>

              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
                Toda a gestão da sua imobiliária em{" "}
                <span className="text-brand-accent">um único lugar.</span>
              </h1>

              <p className="max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
                CRM, financeiro, imóveis, atendimento e funil comercial
                conectados — sem retrabalho, sem informação perdida.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 animate-[login-fade_0.5s_ease-out_0.28s_both]">
              {FEATURE_PILLS.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-brand-accent" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <footer className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between lg:mt-12 animate-[login-fade_0.5s_ease-out_0.4s_both]">
            <span>© 2026 Zone Connection</span>
            <span className="inline-flex items-center gap-2 text-white/70">
              <span
                className="h-1.5 w-1.5 rounded-full bg-brand-accent"
                aria-hidden
              />
              Tudo em uma só conexão
            </span>
          </footer>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-5 py-8 sm:px-10 lg:min-h-0 lg:overflow-visible lg:bg-surface-muted lg:py-16">
        <MobileLoginAtmosphere />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 lg:gap-0 animate-[login-fade_0.55s_ease-out_0.15s_both]">
          <div className="flex w-full flex-col items-start gap-3 lg:hidden">
            <Link
              to="/"
              aria-label="Zone Connection"
              className="animate-[login-fade_0.5s_ease-out_0.08s_both]"
            >
              <LoginBrandLogo size="md" tone="light" />
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white animate-[login-fade_0.5s_ease-out_0.12s_both]"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir para o site
            </Link>
          </div>

          <div className="w-full rounded-3xl border border-white/15 bg-white/95 p-6 shadow-[0_20px_50px_-24px_rgba(2,25,35,0.55)] backdrop-blur-sm sm:p-8 lg:border-border lg:bg-white lg:shadow-sm lg:backdrop-blur-none">
            <div className="mb-6 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
                Acesso
              </span>
              <h2 className="text-2xl font-semibold text-brand-dark sm:text-3xl">
                Entrar na plataforma
              </h2>
              <p className="text-sm leading-relaxed text-text-muted sm:text-base">
                Use suas credenciais para continuar na Zone Connection.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <LoginAuthField
                id="email"
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                icon={Mail}
                placeholder="seu@email.com"
                required
              />

              <LoginAuthField
                id="password"
                label="Senha"
                type="password"
                value={password}
                onChange={setPassword}
                icon={Lock}
                placeholder="••••••••"
                required
                labelExtra={
                  <button
                    type="button"
                    className="text-xs font-medium text-brand-accent transition-colors hover:text-brand-dark"
                  >
                    Esqueci minha senha
                  </button>
                }
              />

              <div className="flex items-center gap-2">
                <Checkbox id="remember" defaultChecked />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal cursor-pointer text-text-muted"
                >
                  Lembrar acesso neste dispositivo
                </Label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full cursor-pointer rounded-full bg-brand-cta px-4 py-3 text-sm font-semibold text-white transition-all",
                  "hover:brightness-110 hover:-translate-y-0.5 hover:shadow-md",
                  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none",
                )}
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-muted">
              Proprietário de imóvel?{" "}
              <Link
                to="/portal/login"
                search={email.trim() ? { email: email.trim() } : undefined}
                className="font-medium text-brand-accent transition-colors hover:text-brand-dark"
              >
                Acessar o portal
              </Link>
            </p>
            <p className="mt-2 text-center text-sm text-text-muted">
              Corretor parceiro?{" "}
              <Link
                to="/parceiros/login"
                search={email.trim() ? { email: email.trim() } : undefined}
                className="font-medium text-brand-accent transition-colors hover:text-brand-dark"
              >
                Acessar o portal
              </Link>
            </p>
            <p className="mt-2 text-center text-sm text-text-muted">
              Ainda não tem conta?{" "}
              <a
                href={getWhatsAppUrl(
                  "Olá! Vim pela tela de login da Zone Connection e gostaria de saber mais.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-accent transition-colors hover:text-brand-dark"
              >
                Fale conosco
              </a>
            </p>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes login-fade {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-slide-in {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes login-ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(2); opacity: 0.65; }
        }
        @keyframes login-orb-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, -22px, 0) scale(1.08); }
        }
      `}</style>
    </div>
  );
}

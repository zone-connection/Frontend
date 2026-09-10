import { ArrowRight, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PRODUCT_ROUTES } from "./routes";
import { ScrollReveal } from "./ScrollReveal";

function Benefit({
  children,
  tone = "light",
}: {
  children: string;
  tone?: "light" | "dark";
}) {
  return (
    <p
      className={
        tone === "dark"
          ? "mt-5 flex items-start gap-2.5 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm leading-relaxed text-white"
          : "mt-5 flex items-start gap-2.5 rounded-2xl border border-brand-accent/20 bg-brand-accent/8 px-4 py-3 text-sm leading-relaxed text-brand-dark"
      }
    >
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-accent text-white">
        <Check size={12} strokeWidth={3} />
      </span>
      {children}
    </p>
  );
}

function Cta({
  to,
  label,
  tone = "light",
}: {
  to: typeof PRODUCT_ROUTES.crm;
  label: string;
  tone?: "light" | "dark";
}) {
  return (
    <Link
      to={to}
      className={
        tone === "dark"
          ? "mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-dark shadow-md transition-all hover:-translate-y-px hover:bg-white/90"
          : "mt-6 inline-flex items-center gap-2 rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:bg-brand-dark/90"
      }
    >
      {label}
      <ArrowRight size={16} strokeWidth={2} />
    </Link>
  );
}

const FUNNEL_BARS = [
  { label: "Novo lead", count: 18, width: "100%" },
  { label: "Qualificação", count: 11, width: "78%" },
  { label: "Visita", count: 7, width: "58%" },
  { label: "Proposta", count: 4, width: "38%" },
  { label: "Fechamento", count: 2, width: "22%" },
] as const;

function FunnelVisual() {
  return (
    <div className="relative">
      <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-[0_20px_50px_-28px_rgba(5,54,71,0.38)] sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-dark">Funil comercial</p>
          <span className="text-xs font-medium text-brand-accent">+ etapa</span>
        </div>
        <ul className="space-y-2.5">
          {FUNNEL_BARS.map((bar) => (
            <li key={bar.label} className="flex items-center gap-3">
              <div className="relative h-9 flex-1">
                <div
                  className="flex h-9 items-center rounded-full bg-brand-accent/85 pl-4 text-xs font-semibold text-white"
                  style={{ width: bar.width }}
                >
                  <span className="truncate">{bar.label}</span>
                </div>
              </div>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-dark text-xs font-bold text-white">
                {bar.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <span className="podio-float absolute -right-2 top-16 hidden rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs shadow-lg will-change-transform sm:block">
        <span className="font-semibold text-brand-dark">Nova etapa</span>
        <span className="mt-0.5 block text-text-muted">Proposta</span>
      </span>
      <span className="podio-float podio-float-delay-3 absolute -bottom-3 left-8 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs shadow-lg will-change-transform">
        <span className="font-semibold text-brand-dark">15 leads</span>
        <span className="mt-0.5 block text-text-muted">entraram hoje</span>
      </span>
    </div>
  );
}

function FinanceVisual() {
  return (
    <div className="relative">
      <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-[0_20px_50px_-28px_rgba(5,54,71,0.38)] sm:p-6">
        <div className="mb-4 flex gap-1 rounded-full bg-surface-muted p-1 text-[11px] font-semibold">
          <span className="rounded-full bg-brand-accent px-3 py-1.5 text-white">
            Visão geral
          </span>
          <span className="px-3 py-1.5 text-text-muted">Contas</span>
          <span className="px-3 py-1.5 text-text-muted">Relatórios</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border bg-surface-muted/60 p-3">
            <p className="text-[10px] font-medium text-text-muted">Saldo</p>
            <p className="mt-1 text-lg font-semibold text-brand-accent">
              R$ 86 mil
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted/60 p-3">
            <p className="text-[10px] font-medium text-text-muted">A pagar</p>
            <p className="mt-1 text-lg font-semibold text-brand-dark">
              R$ 12 mil
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-brand-dark">
          Últimas movimentações
        </p>
        <ul className="mt-2 space-y-2">
          {[
            ["Comissão venda", "+ R$ 4.200", true],
            ["Repasse corretor", "− R$ 1.150", false],
            ["Taxa de documentação", "+ R$ 890", true],
          ].map(([label, value, positive]) => (
            <li
              key={label}
              className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
            >
              <span className="text-xs text-brand-dark">{label}</span>
              <span
                className={
                  positive
                    ? "text-xs font-semibold text-brand-accent"
                    : "text-xs font-semibold text-brand-dark"
                }
              >
                {value}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <span className="absolute -top-3 right-6 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-brand-dark shadow-md">
        Saldo atualizado
      </span>
    </div>
  );
}

function FinanceDecor() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="finance-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="rgba(7,158,212,0.12)"
              strokeWidth="0.7"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#finance-grid)" />
      </svg>

      <svg
        viewBox="0 0 420 280"
        className="absolute -top-8 -right-6 h-72 w-88 opacity-70 sm:h-88 sm:w-104"
        fill="none"
      >
        <circle cx="320" cy="50" r="90" stroke="#079ed4" strokeWidth="1" opacity="0.25" />
        <circle cx="320" cy="50" r="140" stroke="#94a3b8" strokeWidth="1" opacity="0.18" />
        <circle cx="320" cy="50" r="190" stroke="#079ed4" strokeWidth="0.8" opacity="0.14" />
        <path
          d="M180 90 H250 V150 H310"
          stroke="#079ed4"
          strokeWidth="1.2"
          opacity="0.45"
        />
        <circle cx="180" cy="90" r="3.5" stroke="#079ed4" fill="#034055" />
        <circle cx="310" cy="150" r="3.5" stroke="#079ed4" fill="#034055" />
        <rect
          x="240"
          y="40"
          width="70"
          height="48"
          rx="8"
          stroke="#7aa8bc"
          opacity="0.35"
        />
      </svg>

      <svg
        viewBox="0 0 360 200"
        className="absolute -bottom-4 left-0 h-44 w-80 opacity-80 sm:h-52 sm:w-96"
        fill="none"
      >
        <path
          d="M20 150 L70 120 L120 130 L170 80 L220 95 L270 50 L320 70"
          stroke="#079ed4"
          strokeWidth="1.6"
          opacity="0.45"
        />
        <path
          d="M20 150 L70 120 L120 130 L170 80 L220 95 L270 50 L320 70 V170 H20 Z"
          fill="rgba(7,158,212,0.08)"
        />
        {[70, 120, 170, 220, 270].map((x, i) => (
          <rect
            key={x}
            x={x - 8}
            y={140 - i * 14}
            width="16"
            height={30 + i * 14}
            rx="3"
            fill="#079ed4"
            opacity={0.18 + i * 0.05}
          />
        ))}
        <circle cx="170" cy="80" r="4" fill="#079ed4" />
        <circle cx="270" cy="50" r="4" fill="white" stroke="#079ed4" />
      </svg>
    </div>
  );
}

export function FeatureHighlights() {
  return (
    <>
      <section
        className="bg-[#eef6fb] px-6 py-16 lg:px-12 lg:py-24"
        aria-labelledby="feature-funnel-title"
      >
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <FunnelVisual />
              <div>
                <h2
                  id="feature-funnel-title"
                  className="text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl"
                >
                  Organize as negociações do início ao fim
                </h2>
                <p className="mt-3 text-base leading-relaxed text-text-muted">
                  Cada lead percorre o funil com histórico, prazo e responsável.
                  A equipe vê o que está parado e o que está perto de fechar.
                </p>
                <Benefit>
                  Menos lead esquecido: a etapa, o prazo e o último contato
                  ficam visíveis no card.
                </Benefit>
                <Cta to={PRODUCT_ROUTES.crm} label="Conhecer o CRM" />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section
        className="relative overflow-hidden bg-[#034055] px-6 py-16 lg:px-12 lg:py-24"
        aria-labelledby="feature-finance-title"
      >
        <FinanceDecor />
        <div className="relative z-10 mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="lg:order-2">
                <FinanceVisual />
              </div>
              <div className="lg:order-1">
                <h2
                  id="feature-finance-title"
                  className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
                >
                  Todo financeiro da imobiliária no mesmo sistema
                </h2>
                <p className="mt-3 text-base leading-relaxed text-white/70">
                  Comissões, contas e fluxo de caixa deixam de viver em planilha.
                  O comercial e o financeiro enxergam os mesmos números.
                </p>
                <Benefit tone="dark">
                  Previsibilidade: receita, pendências e repasses em um painel
                  só.
                </Benefit>
                <Cta
                  to={PRODUCT_ROUTES.crm}
                  label="Conhecer o CRM"
                  tone="dark"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

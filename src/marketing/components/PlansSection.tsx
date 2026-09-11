import { useState } from "react";
import { HiCheck, HiStar, HiUsers } from "react-icons/hi2";
import { getWhatsAppUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

interface PlanTheme {
  header: string;
  medal: string;
  accent: string;
  priceCard: string;
}

interface PlanOption {
  title: string;
  items: string[];
}

interface Plan {
  id: string;
  medal: string;
  name: string;
  audience: string;
  users: string;
  setupFee: string;
  monthlyFee: string;
  setupFeeOld?: string;
  monthlyFeeOld?: string;
  theme: PlanTheme;
  featured?: boolean;
  highlights?: boolean;
  features: string[];
  /** Opções exclusivas (ex.: Prata Adm / Financeiro). */
  options?: PlanOption[];
}

const PLANS: Plan[] = [
  {
    id: "solo",
    medal: "👤",
    name: "Solo",
    audience: "Ideal para corretores autônomos",
    users: "1 usuário + 1 extra",
    setupFee: "R$ 149,99",
    monthlyFee: "R$ 99,99/mês",
    theme: {
      header: "from-sky-50 via-cyan-50/80 to-white",
      medal: "bg-sky-100 ring-sky-200/80",
      accent: "text-sky-700",
      priceCard: "border-sky-100 bg-sky-50/60",
    },
    features: [
      "CRM do corretor (leads, agenda, clientes e imóveis)",
      "Propostas, documentação e contratos",
      "Metas pessoais",
      "Comissão, contas a receber/pagar e fluxo de caixa",
      "Usuário adicional: R$ 10,00 por usuário/mês",
    ],
  },
  {
    id: "bronze",
    medal: "🥉",
    name: "Bronze",
    audience: "Ideal para pequenas imobiliárias",
    users: "Até 5 usuários",
    setupFee: "R$ 259,99",
    monthlyFee: "R$ 279,99/mês",
    setupFeeOld: "R$ 790,00",
    monthlyFeeOld: "R$ 497,00",
    theme: {
      header: "from-amber-50 via-orange-50/80 to-white",
      medal: "bg-amber-100 ring-amber-200/80",
      accent: "text-amber-700",
      priceCard: "border-amber-100 bg-amber-50/60",
    },
    features: [
      "CRM básico",
      "Cadastro de imóveis",
      "Agenda personalizada",
      "Usuário adicional: R$ 10,00 por usuário/mês",
    ],
  },
  {
    id: "prata",
    medal: "🥈",
    name: "Prata",
    audience: "Financeiro ou Administrativo",
    users: "Até 15 usuários",
    setupFee: "R$ 459,99",
    monthlyFee: "R$ 489,99/mês",
    setupFeeOld: "R$ 1.490,00",
    monthlyFeeOld: "R$ 997,00",
    theme: {
      header: "from-slate-100 via-zinc-50/90 to-white",
      medal: "bg-slate-200 ring-slate-300/70",
      accent: "text-slate-600",
      priceCard: "border-slate-200 bg-slate-50/80",
    },
    features: [
      "Tudo do plano Bronze",
      "Usuário adicional: R$ 10,00 por usuário/mês",
      "Escolha uma das opções abaixo",
    ],
    options: [
      {
        title: "Opção Adm",
        items: [
          "Gerenciamento de equipes",
          "Ranking de corretores",
          "Métricas de desempenho",
          "Análise de documentações",
          "Gestão de metas",
        ],
      },
      {
        title: "Opção Financeira",
        items: [
          "Contas a pagar",
          "Contas a receber",
          "Fluxo de caixa",
          "Comissões",
          "Relatório financeiro",
        ],
      },
    ],
  },
  {
    id: "ouro",
    medal: "🥇",
    name: "Ouro",
    audience: "Financeiro e Administrativo juntos",
    users: "Até 35 usuários",
    setupFee: "R$ 569,99",
    monthlyFee: "R$ 699,99/mês",
    setupFeeOld: "R$ 1.490,00",
    monthlyFeeOld: "R$ 1.649,00",
    theme: {
      header: "from-brand-accent/15 via-cyan-50/80 to-white",
      medal: "bg-brand-accent/15 ring-brand-accent/30",
      accent: "text-brand-accent",
      priceCard: "border-brand-accent/20 bg-brand-accent/5",
    },
    featured: true,
    highlights: true,
    features: [
      "Tudo do plano Bronze",
      "Sistema Financeiro e Administrativo juntos",
      "Gerenciamento e alertas de documentações",
      "Relatórios avançados",
      "Usuário adicional: R$ 10,00 por usuário/mês",
    ],
  },
];

function PlanPriceValue({ value }: { value: string }) {
  const suffix = "/mês";
  const index = value.indexOf(suffix);
  const amount = index === -1 ? value : value.slice(0, index);

  return (
    <span className="inline-flex max-w-full items-baseline gap-0.5 whitespace-nowrap text-sm font-bold leading-tight text-brand-dark sm:text-lg">
      {amount}
      {index !== -1 ? (
        <span className="text-[10px] font-medium tracking-wide text-text-muted sm:text-[11px]">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

function PlanPriceCard({
  label,
  value,
  oldValue,
  className,
}: {
  label: string;
  value: string;
  oldValue?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-19 flex-col justify-center gap-1 overflow-visible rounded-xl border px-3 py-3",
        className,
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {oldValue ? (
        <span className="text-[11px] font-medium leading-none text-text-muted/80 line-through">
          {oldValue}
        </span>
      ) : null}
      <PlanPriceValue value={value} />
    </div>
  );
}

function PlanOptionsToggle({
  options,
  theme,
}: {
  options: PlanOption[];
  theme: PlanTheme;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = options[activeIndex];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        {options.map((option, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={option.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-pressed={isActive}
              className={cn(
                "cursor-pointer rounded-xl border px-3 py-2.5 text-center text-xs font-bold tracking-wide uppercase transition-all",
                isActive
                  ? cn(
                      "border-brand-dark bg-brand-dark text-white shadow-sm",
                      "ring-1 ring-brand-dark/20",
                    )
                  : "border-border bg-surface-muted/60 text-brand-dark/70 hover:border-brand-dark/30 hover:text-brand-dark",
              )}
            >
              {option.title}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/60 p-3.5">
        <p className="mb-2.5 text-xs font-bold tracking-wide text-brand-dark uppercase">
          {active.title}
        </p>
        <ul className="flex flex-col gap-1.5">
          {active.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-xs leading-snug text-text-muted"
            >
              <HiCheck
                className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", theme.accent)}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        plan.featured
          ? "border-brand-accent/40 shadow-md ring-1 ring-brand-accent/20"
          : "border-border hover:border-brand-accent/25",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-t-3xl border-b border-border/60 bg-linear-to-br px-5 pb-5 pt-6 sm:px-6",
          plan.theme.header,
        )}
      >
        {plan.featured && (
          <span className="absolute right-4 top-4 rounded-full bg-brand-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            Mais popular
          </span>
        )}

        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ring-1",
              plan.theme.medal,
            )}
            aria-hidden
          >
            {plan.medal}
          </span>
          <div className="min-w-0 flex-1 pr-16">
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                plan.theme.accent,
              )}
            >
              Plano {plan.name}
            </p>
            <h3 className="mt-1 text-xl font-bold leading-tight text-brand-dark sm:text-2xl">
              {plan.name}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-muted sm:text-sm">
              {plan.audience}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1.5">
          <HiUsers
            className={cn("h-4 w-4 shrink-0", plan.theme.accent)}
            aria-hidden
          />
          <span className="text-sm font-semibold text-brand-dark">
            {plan.users}
          </span>
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-2.5 min-[400px]:grid-cols-2">
          <PlanPriceCard
            label="Implantação"
            value={plan.setupFee}
            oldValue={plan.setupFeeOld}
            className={plan.theme.priceCard}
          />
          <PlanPriceCard
            label="Mensalidade"
            value={plan.monthlyFee}
            oldValue={plan.monthlyFeeOld}
            className={plan.theme.priceCard}
          />
        </div>

        {plan.options && plan.options.length > 0 && (
          <PlanOptionsToggle options={plan.options} theme={plan.theme} />
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <p className="text-sm font-bold text-brand-dark">Recursos inclusos</p>
          <ul className="flex flex-1 flex-col gap-2.5">
            {plan.features.map((feature, index) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-sm leading-snug text-text-muted"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    plan.featured ? "bg-brand-accent/15" : "bg-surface-muted",
                  )}
                >
                  {plan.highlights && index > 0 ? (
                    <HiStar className={cn("h-3 w-3", plan.theme.accent)} />
                  ) : (
                    <HiCheck className={cn("h-3 w-3", plan.theme.accent)} />
                  )}
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-auto rounded-b-3xl border-t border-border/70 bg-surface-muted/40 p-5 sm:p-6">
        <a
          href={getWhatsAppUrl(
            `Olá! Tenho interesse no plano ${plan.name} da Zone Connection.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "block w-full rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-all duration-200",
            plan.featured
              ? "bg-brand-cta text-white shadow-md hover:shadow-lg hover:brightness-105"
              : "border-2 border-brand-dark bg-white text-brand-dark hover:bg-brand-dark hover:text-white",
          )}
        >
          Fale conosco
        </a>
      </div>
    </article>
  );
}

export function PlansSection() {
  return (
    <section id="planos" className="bg-white px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Planos
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            O plano certo para cada fase: corretor solo ou imobiliária.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Do primeiro passo longe das planilhas até a operação inteligente que
            gera mais vendas.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

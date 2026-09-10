import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Users,
  Kanban,
  Target,
  Wallet,
  ArrowLeft,
  Bell,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Home,
  Phone,
} from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import { Logo } from "@/marketing/components/Logo";
import { cn } from "@/lib/utils";

const DEMO_WHATSAPP_MSG =
  "Olá! Vi a demonstração do CRM e quero solicitar um orçamento.";

type DemoView = "dashboard" | "funil" | "leads" | "agenda";

const NAV = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "leads" as const, label: "Leads", icon: Users },
  { id: "funil" as const, label: "Funil", icon: Kanban },
  { id: "agenda" as const, label: "Agenda", icon: Calendar },
] as const;

const SIDEBAR_EXTRA = [
  { label: "Imóveis", icon: Building2 },
  { label: "Triagem", icon: ClipboardList },
  { label: "Metas", icon: Target },
  { label: "Financeiro", icon: Wallet },
] as const;

const KPIS = [
  { label: "Leads no mês", value: "128", delta: "+18%" },
  { label: "Em negociação", value: "34", delta: "+6%" },
  { label: "Visitas agendadas", value: "22", delta: "+3" },
  { label: "Taxa de conversão", value: "12,4%", delta: "+1,2%" },
] as const;

const FUNNEL = [
  {
    title: "Novos",
    color: "bg-brand-accent/15 text-brand-dark",
    cards: [
      { name: "Ana Souza", detail: "Apt. 3 dorms · Boa Viagem" },
      { name: "Carlos Lima", detail: "Casa · R$ 890 mil" },
    ],
  },
  {
    title: "Qualificados",
    color: "bg-emerald-500/10 text-emerald-800",
    cards: [
      { name: "Marina Costa", detail: "Cobertura · Encontro" },
      { name: "Pedro Alves", detail: "Sala comercial" },
    ],
  },
  {
    title: "Proposta",
    color: "bg-amber-500/10 text-amber-800",
    cards: [{ name: "Fernanda Dias", detail: "Apt. 2 dorms · Pina" }],
  },
  {
    title: "Fechamento",
    color: "bg-brand-dark/10 text-brand-dark",
    cards: [{ name: "Ricardo Nunes", detail: "Contrato em revisão" }],
  },
] as const;

const LEADS = [
  {
    nome: "Ana Souza",
    origem: "Instagram",
    status: "Novo",
    corretor: "Juliana",
    telefone: "(81) 98800-1122",
  },
  {
    nome: "Carlos Lima",
    origem: "Site",
    status: "Em contato",
    corretor: "Marcos",
    telefone: "(81) 99711-3344",
  },
  {
    nome: "Marina Costa",
    origem: "WhatsApp IA",
    status: "Qualificado",
    corretor: "Juliana",
    telefone: "(81) 98622-5566",
  },
  {
    nome: "Pedro Alves",
    origem: "Indicação",
    status: "Visita",
    corretor: "Marcos",
    telefone: "(81) 99133-7788",
  },
  {
    nome: "Fernanda Dias",
    origem: "Portal",
    status: "Proposta",
    corretor: "Ana Paula",
    telefone: "(81) 98444-9900",
  },
] as const;

const AGENDA = [
  {
    hora: "09:00",
    titulo: "Visita — Apt. Boa Viagem",
    pessoa: "Ana Souza",
  },
  {
    hora: "11:30",
    titulo: "Follow-up WhatsApp",
    pessoa: "Carlos Lima",
  },
  {
    hora: "14:00",
    titulo: "Apresentação de proposta",
    pessoa: "Fernanda Dias",
  },
  {
    hora: "16:30",
    titulo: "Reunião de equipe",
    pessoa: "Time Comercial",
  },
] as const;

function DemoMobileNav({
  active,
  onChange,
}: {
  active: DemoView;
  onChange: (view: DemoView) => void;
}) {
  return (
    <nav
      className="border-b border-border bg-surface-muted/80 lg:hidden"
      aria-label="Módulos da demonstração"
    >
      <div className="flex gap-1 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border border-brand-accent bg-white text-brand-dark shadow-sm"
                  : "border border-transparent text-brand-dark/70 hover:bg-white/70 hover:text-brand-dark",
              )}
            >
              <Icon
                size={18}
                strokeWidth={1.75}
                className={
                  isActive ? "text-brand-accent" : "text-brand-dark/55"
                }
              />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function DemoSidebar({
  active,
  onChange,
}: {
  active: DemoView;
  onChange: (view: DemoView) => void;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-brand-dark text-white lg:flex">
      <div className="border-b border-white/10 px-5 py-4">
        <Logo size="sm" tone="light" />
        <p className="mt-2 text-[11px] font-medium tracking-wide text-brand-accent uppercase">
          Demonstração
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
          Operação
        </p>
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}

        <p className="mt-5 px-2 pb-2 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
          Mais módulos
        </p>
        {SIDEBAR_EXTRA.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/45"
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-accent/30 text-sm font-semibold">
            ZC
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Imobiliária Demo</p>
            <p className="truncate text-xs text-white/50">Gerente</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardView() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <article
            key={kpi.label}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium text-text-muted">{kpi.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-2xl font-bold text-brand-dark">{kpi.value}</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp size={12} />
                {kpi.delta}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-dark">
            Performance da semana
          </h3>
          <div className="mt-6 flex h-40 items-end gap-2">
            {[42, 58, 35, 70, 55, 82, 64].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-brand-accent/80"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[10px] text-text-muted">
                  {"DSTQQSS"[i]}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-dark">
            Atividade recente
          </h3>
          <ul className="mt-4 space-y-3">
            {[
              { icon: UserPlus, text: "Novo lead via WhatsApp IA" },
              { icon: Home, text: "Visita confirmada em Boa Viagem" },
              { icon: Phone, text: "Follow-up concluído com Carlos" },
              { icon: Target, text: "Meta da equipe em 78%" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.text}
                  className="flex items-center gap-3 text-sm text-text-muted"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-muted text-brand-dark">
                    <Icon size={15} />
                  </span>
                  {item.text}
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </div>
  );
}

function FunnelView() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {FUNNEL.map((col) => (
        <div
          key={col.title}
          className="min-w-55 flex-1 rounded-2xl border border-border bg-surface-muted/70 p-3"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                col.color,
              )}
            >
              {col.title}
            </span>
            <span className="text-xs text-text-muted">{col.cards.length}</span>
          </div>
          <div className="space-y-2">
            {col.cards.map((card) => (
              <article
                key={card.name}
                className="rounded-xl border border-border bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-semibold text-brand-dark">
                  {card.name}
                </p>
                <p className="mt-1 text-xs text-text-muted">{card.detail}</p>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadsView() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto overflow-y-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted/80 text-xs tracking-wide text-text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Lead</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Corretor</th>
              <th className="px-4 py-3 font-semibold">Telefone</th>
            </tr>
          </thead>
          <tbody>
            {LEADS.map((lead) => (
              <tr
                key={lead.nome}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-brand-dark">
                  {lead.nome}
                </td>
                <td className="px-4 py-3 text-text-muted">{lead.origem}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-accent/10 px-2.5 py-1 text-xs font-medium text-brand-dark">
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{lead.corretor}</td>
                <td className="px-4 py-3 text-text-muted">{lead.telefone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgendaView() {
  return (
    <div className="space-y-3">
      {AGENDA.map((item) => (
        <article
          key={item.hora + item.titulo}
          className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-dark text-sm font-semibold text-white">
            {item.hora}
          </div>
          <div>
            <p className="font-semibold text-brand-dark">{item.titulo}</p>
            <p className="mt-0.5 text-sm text-text-muted">{item.pessoa}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

const VIEW_META: Record<DemoView, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Visão geral da operação comercial",
  },
  funil: {
    title: "Funil comercial",
    subtitle: "Acompanhe cada etapa da negociação",
  },
  leads: {
    title: "Leads",
    subtitle: "Captação e distribuição centralizadas",
  },
  agenda: {
    title: "Agenda",
    subtitle: "Visitas e follow-ups da equipe",
  },
};

export default function DemoPage() {
  const [view, setView] = useState<DemoView>("dashboard");
  const meta = VIEW_META[view];

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <header className="sticky top-0 z-[60] border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-350 items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/produtos/crm-imobiliario"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-dark/80 transition-colors hover:text-brand-dark"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="truncate rounded-full bg-brand-accent/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brand-dark uppercase">
              Demo interativa
            </span>
          </div>

          <a
            href={getWhatsAppUrl(DEMO_WHATSAPP_MSG)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-brand-dark px-3 py-2 text-xs font-medium whitespace-nowrap text-white transition-colors hover:bg-brand-dark/90 sm:px-4 sm:text-sm"
          >
            Solicitar Orçamento
          </a>
        </div>
      </header>

      <section
        className="border-b border-border bg-white px-6 py-10 sm:py-12 lg:px-12 lg:py-14"
        aria-labelledby="demo-intro-title"
      >
        <div className="mx-auto max-w-350">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-brand-accent uppercase sm:text-sm">
            <Sparkles size={16} strokeWidth={2} aria-hidden />
            Demonstração interativa
          </p>
          <h1
            id="demo-intro-title"
            className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
          >
            Explore a plataforma antes de falar com o time.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
            Um passeio guiado pelos módulos da Zone Connection. Clique nos itens
            do menu para ver como cada área da sua imobiliária fica organizada.
          </p>
        </div>
      </section>

      <div className="flex flex-1 flex-col px-4 pb-6 pt-2 sm:px-6 lg:mx-auto lg:w-full lg:max-w-350 lg:px-0 lg:py-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm lg:flex-row">
          <DemoSidebar active={view} onChange={setView} />

          <div className="flex min-w-0 flex-1 flex-col">
            <DemoMobileNav active={view} onChange={setView} />

            <main className="min-w-0 flex-1 bg-surface-muted/40 px-4 py-5 lg:px-8 lg:py-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">
                    {meta.title}
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {meta.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-muted sm:flex">
                    <Search size={15} />
                    Buscar...
                  </div>
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-white text-brand-dark"
                    aria-label="Notificações"
                  >
                    <Bell size={16} />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                >
                  {view === "dashboard" && <DashboardView />}
                  {view === "funil" && <FunnelView />}
                  {view === "leads" && <LeadsView />}
                  {view === "agenda" && <AgendaView />}
                </motion.div>
              </AnimatePresence>

              <p className="mt-8 text-center text-xs text-text-muted">
                Ambiente ilustrativo — dados fictícios para demonstrar a
                experiência do CRM Zone Connection.
              </p>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

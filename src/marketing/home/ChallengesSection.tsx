import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AppWindow,
  ArrowRight,
  Clock3,
  EyeOff,
  FolderKanban,
  LayoutTemplate,
  MessageSquareText,
  Network,
  UserRoundX,
} from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import { PRODUCT_ROUTES } from "./routes";
import { ScrollReveal } from "./ScrollReveal";

const CHALLENGES = [
  {
    icon: FolderKanban,
    title: "Desorganização crônica",
    text: "Leads, visitas e documentos espalhados em WhatsApp, planilhas e cadernos.",
    tone: "bg-teal-600",
  },
  {
    icon: UserRoundX,
    title: "Cliente perdido",
    text: "O lead esfria sem follow-up. A concorrência chega primeiro e fecha.",
    tone: "bg-blue-600",
  },
  {
    icon: Clock3,
    title: "Atrasos e retrabalho",
    text: "Contrato refeito, proposta atrasada. O dia vira correção.",
    tone: "bg-violet-600",
  },
  {
    icon: EyeOff,
    title: "Cegueira financeira",
    text: "Sem visão de comissões, repasses e caixa. O problema aparece tarde.",
    tone: "bg-cyan-600",
  },
  {
    icon: AppWindow,
    title: "Vários sistemas",
    text: "CRM, planilha, WhatsApp e agenda em ferramentas que não conversam.",
    tone: "bg-[var(--kpi-seq-2,#079ED4)]",
  },
] as const;

const LEFT_CHALLENGES = CHALLENGES.slice(0, 3);
const RIGHT_CHALLENGES = CHALLENGES.slice(3);

function ChallengeCard({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: (typeof CHALLENGES)[number]["icon"];
  title: string;
  text: string;
  tone: string;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
      <div className={cn("h-1.5 w-full", tone)} aria-hidden />
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white shadow-sm sm:h-11 sm:w-11",
            tone,
          )}
        >
          <Icon size={18} strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-brand-dark sm:text-[0.95rem]">
            {title}
          </h3>
          <p className="mt-0.5 text-sm leading-relaxed text-text-muted">
            {text}
          </p>
        </div>
      </div>
    </article>
  );
}

const PRODUCTS = [
  {
    title: "CRM Imobiliário",
    text: "Uma plataforma completa para gestão de imobiliárias.",
    href: PRODUCT_ROUTES.crm,
    icon: Network,
    image: "/marketing/product-crm.svg",
    imageAlt: "Painel e funil do CRM imobiliário",
  },
  {
    title: "IA para WhatsApp",
    text: "Uma Inteligência Artificial integrada ao WhatsApp que conversa com clientes e se conecta ao CRM para automatizar atendimentos.",
    href: PRODUCT_ROUTES.whatsappAi,
    icon: MessageSquareText,
    image: "/marketing/product-whatsapp.svg",
    imageAlt: "Assistente de IA conversando no WhatsApp",
  },
  {
    title: "Sites e Landing Pages",
    text: "Desenvolvimento de sites para imobiliárias e landing pages profissionais para corretores captarem mais clientes.",
    href: PRODUCT_ROUTES.sites,
    icon: LayoutTemplate,
    image: "/marketing/product-sites.svg",
    imageAlt: "Montagem de site e landing page para imobiliária",
  },
] as const;

const linkClass =
  "mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent transition-all hover:gap-2.5 hover:text-brand-dark";

function ProductLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  if (href === PRODUCT_ROUTES.crm) {
    return (
      <Link to="/produtos/crm-imobiliario" className={linkClass}>
        {children}
      </Link>
    );
  }
  if (href === PRODUCT_ROUTES.whatsappAi) {
    return (
      <Link to="/produtos/ia-whatsapp" className={linkClass}>
        {children}
      </Link>
    );
  }
  if (href === PRODUCT_ROUTES.sites) {
    return (
      <Link to="/produtos/sites-institucionais" className={linkClass}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={linkClass}>
      {children}
    </a>
  );
}

export function ChallengesSection() {
  return (
    <section
      id="desafios"
      className="bg-white px-6 py-16 lg:px-12 lg:py-24"
      aria-labelledby="challenges-title"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)_minmax(0,1fr)] lg:gap-8 xl:gap-10">
          <div className="order-2 flex flex-col gap-3 lg:order-1">
            {LEFT_CHALLENGES.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 0.04}>
                <ChallengeCard {...item} />
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal className="order-1 lg:order-2">
            <div className="mx-auto max-w-md text-center lg:max-w-none">
              <h2
                id="challenges-title"
                className="text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl lg:text-[1.85rem] lg:leading-tight"
              >
                O que trava a operação?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-muted sm:text-[0.95rem]">
                Se algum desses desafios é o seu dia a dia, a rotina está
                espalhada demais.
              </p>
              <div className="relative mt-6">
                <div
                  className="pointer-events-none absolute top-1/2 left-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-accent/15 blur-3xl sm:h-64 sm:w-64"
                  aria-hidden
                />
                <img
                  src="/marketing/overwhelmed-cuate.svg"
                  alt="Pessoa sobrecarregada com papéis, telas e tarefas da operação"
                  className="relative z-10 mx-auto w-full"
                  width={500}
                  height={500}
                />
              </div>
            </div>
          </ScrollReveal>

          <div className="order-3 flex flex-col gap-3 lg:justify-center">
            {RIGHT_CHALLENGES.map((item, index) => (
              <ScrollReveal key={item.title} delay={0.08 + index * 0.04}>
                <ChallengeCard {...item} />
              </ScrollReveal>
            ))}
          </div>
        </div>

        <ScrollReveal delay={0.12}>
          <div
            className="relative mt-2 w-full overflow-hidden rounded-3xl px-6 py-10 text-center shadow-[0_20px_50px_-20px_rgba(5,54,71,0.45)] sm:px-10 sm:py-12 lg:px-16"
            style={{
              background:
                "linear-gradient(145deg, #034055 0%, #053647 55%, #01232e 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute top-[-60%] left-1/2 h-[130%] w-3/5 -translate-x-1/2 rounded-full"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(7,158,212,0.28) 0%, transparent 68%)",
              }}
            />
            <p className="relative text-lg font-semibold leading-relaxed text-white sm:text-xl lg:text-[1.35rem]">
              Tudo isso deixa sua imobiliária lenta, burocrática e atolada de
              tarefas manuais que poderiam ser automatizadas.
            </p>
            <p className="relative mt-3 text-base font-medium text-brand-accent sm:text-lg">
              Por isso desenvolvemos essas soluções:
            </p>
          </div>
        </ScrollReveal>

        <div
          id="ecossistema"
          className="mt-12 grid gap-5 md:mt-14 md:grid-cols-3"
        >
          {PRODUCTS.map((product, index) => {
            const Icon = product.icon;
            return (
              <ScrollReveal key={product.title} delay={0.08 + index * 0.08}>
                <article className="flex h-full flex-col rounded-3xl border border-black/5 bg-white p-7 shadow-[0_16px_40px_-24px_rgba(5,54,71,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_22px_50px_-22px_rgba(5,54,71,0.4)]">
                  <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <h3 className="mb-3 text-lg font-semibold text-brand-dark">
                    {product.title}
                  </h3>
                  <p className="text-[0.975rem] leading-relaxed text-text-muted">
                    {product.text}
                  </p>
                  <div className="mt-5 flex flex-1 items-end justify-center">
                    <img
                      src={product.image}
                      alt={product.imageAlt}
                      className="h-36 w-full max-w-56 object-contain sm:h-40"
                      width={280}
                      height={160}
                    />
                  </div>
                  <ProductLink href={product.href}>
                    Saiba mais
                    <ArrowRight size={16} strokeWidth={1.75} />
                  </ProductLink>
                </article>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={0.25}>
          <div className="mt-12 flex justify-center lg:mt-14">
            <a
              href={getWhatsAppUrl(
                "Olá! Quero falar com o time de vendas da Zone Connection.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-brand-accent px-7 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-brand-accent/90 sm:px-8 sm:text-base"
            >
              Fale com nosso time de vendas
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

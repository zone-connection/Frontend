import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import { HeroDecor } from "./HeroDecor";
import { HOME_ANCHORS } from "./routes";
import { HeroShowcase } from "./HeroShowcase";

const HIGHLIGHTS = [
  "Funil, leads e agenda no mesmo fluxo",
  "Financeiro e comissões sem planilha",
  "IA no WhatsApp ligada ao CRM",
  "Site e landing page no ecossistema",
] as const;

export function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-white px-1 pt-3 pb-5 sm:px-2"
      aria-labelledby="home-hero-title"
    >
      <div className="relative mx-auto max-w-368 overflow-hidden rounded-4xl bg-[#d6eef6] px-6 py-10 sm:px-10 lg:px-16 lg:py-16">
        <HeroDecor />
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <motion.div
            className="order-2 lg:order-1"
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <HeroShowcase />
          </motion.div>

          <motion.div
            className="order-1 flex max-w-xl flex-col lg:order-2"
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-brand-dark uppercase">
              Zone Connection
            </p>
            <h1
              id="home-hero-title"
              className="text-3xl font-semibold leading-tight tracking-tight text-brand-dark sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]"
            >
              Sua imobiliária mais organizada, automatizada e conectada em um só
              lugar.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-brand-dark/70 sm:text-lg">
              Centralize CRM, WhatsApp, equipe, vendas e financeiro em uma única
              plataforma e deixe sua operação mais inteligente.
            </p>

            <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-snug text-brand-dark"
                >
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-accent/20 text-brand-accent"
                    aria-hidden
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={HOME_ANCHORS.ecosystem}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-accent px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:bg-brand-accent/90 sm:text-base"
              >
                Conheça as soluções
                <ArrowRight size={16} strokeWidth={2} />
              </a>
              <a
                href={getWhatsAppUrl(
                  "Olá! Quero agendar uma demonstração da Zone Connection.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-white/80 px-8 py-3 text-sm font-semibold text-brand-dark shadow-sm ring-1 ring-brand-dark/8 transition-all hover:-translate-y-px hover:bg-white sm:text-base"
              >
                Agendar demonstração
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import { HOME_ANCHORS } from "./routes";

const HERO_IMAGE =
  "https://res.cloudinary.com/dkgjwrjpv/image/upload/f_auto,q_auto/v1792406229/heroImagem_lrepmb.png";

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
      className="bg-white pb-5"
      aria-labelledby="home-hero-title"
    >
      <div className="relative flex w-full flex-col overflow-hidden bg-[#d6eef6] px-6 py-10 sm:px-10 xl:min-h-136 xl:justify-center xl:px-16 xl:py-16">
        <motion.div
          className="relative z-10 flex max-w-xl flex-col"
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
            {HIGHLIGHTS.map((item, index) => (
              <motion.li
                key={item}
                className="flex items-start gap-2 text-sm leading-snug text-brand-dark"
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
              >
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-accent/20 text-brand-accent"
                  aria-hidden
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                {item}
              </motion.li>
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

        {/*
          Imagem do hero:
          - até xl: aparece abaixo do texto, recortada para mostrar os dispositivos;
          - a partir de xl: vira fundo do card, com os dispositivos à direita.
        */}
        <img
          src={HERO_IMAGE}
          alt="Painéis do Zone Connection em notebook, tablet e celular: dashboard, lista de leads e agenda."
          width={1876}
          height={742}
          decoding="async"
          className="mt-8 aspect-4/3 w-full object-cover object-right sm:aspect-video xl:absolute xl:inset-0 xl:mt-0 xl:aspect-auto xl:h-full"
        />

        {/* Véu claro atrás do texto para manter a leitura em telas intermediárias */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-3/5 bg-linear-to-r from-white/90 via-white/60 to-transparent xl:block"
          aria-hidden
        />
      </div>
    </section>
  );
}
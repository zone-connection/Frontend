import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import { HOME_ANCHORS } from "./routes";

const HERO_IMAGE =
    "https://res.cloudinary.com/dkgjwrjpv/image/upload/f_auto,q_auto/v1792406229/heroImagem_lrepmb.png";

const HERO_IMAGE_MOBILE =
    "https://res.cloudinary.com/dkgjwrjpv/image/upload/f_auto,q_auto/v1792439664/Painel_SaaS_em_Dispositivos_Modernos_qh9kob.png";

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
            className="w-full bg-white pb-5"
            aria-labelledby="home-hero-title"
        >
            <div className="relative flex w-full flex-col overflow-hidden bg-white py-10 sm:px-10 sm:py-10 xl:min-h-136 xl:justify-center xl:bg-[#d6eef6] xl:px-16 xl:py-16">

                <img
                    src={HERO_IMAGE_MOBILE}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover object-bottom xl:hidden"
                    loading="eager"
                    fetchPriority="high"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/50 via-white/55 to-white/35 xl:hidden"
                />

                <img
                    src={HERO_IMAGE}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-center xl:block"
                    loading="eager"
                    fetchPriority="high"
                />

                {/* Conteúdo textual */}
                <motion.div
                    className="relative z-2 flex max-w-xl flex-col px-6 sm:px-0"
                    initial={
                        reducedMotion ? false : { opacity: 0, y: 20 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                >
                    <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-brand-dark uppercase">
                        Zone Connection
                    </p>

                    <h1
                        id="home-hero-title"
                        className="text-3xl font-semibold leading-tight tracking-tight text-brand-dark sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]"
                    >
                        Sua imobiliária mais organizada, automatizada e
                        conectada em um só lugar.
                    </h1>

                    <p className="mt-5 max-w-lg text-base leading-relaxed text-brand-dark/70 sm:text-lg">
                        Centralize CRM, WhatsApp, equipe, vendas e financeiro
                        em uma única plataforma e deixe sua operação mais
                        inteligente.
                    </p>

                    {/* Diferenciais */}
                    <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
                        {HIGHLIGHTS.map((item, index) => (
                            <motion.li
                                key={item}
                                className="flex items-start gap-2 text-sm leading-snug text-brand-dark"
                                initial={
                                    reducedMotion
                                        ? false
                                        : { opacity: 0, y: 10 }
                                }
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: 0.2 + index * 0.08,
                                    duration: 0.4,
                                }}
                            >
                                <span
                                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-accent/20 text-brand-accent"
                                    aria-hidden="true"
                                >
                                    <Check size={12} strokeWidth={3} />
                                </span>

                                {item}
                            </motion.li>
                        ))}
                    </ul>

                    {/* Botões */}
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
        </section>
    );
}
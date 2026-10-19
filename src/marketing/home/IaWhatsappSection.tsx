import type { ReactNode } from "react";
import {
    FiArrowRight,
    FiCalendar,
    FiCheck,
    FiClock,
    FiDatabase,
    FiUserPlus,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { HiOutlineSparkles } from "react-icons/hi2";

const features = [
    {
        icon: FiClock,
        title: "Atendimento 24h",
        text: "Responde na hora, de madrugada ou no fim de semana, antes da concorrência.",
    },
    {
        icon: FiUserPlus,
        title: "Qualifica o lead",
        text: "Pergunta interesse, faixa de valor e região, e entrega o contato já preparado.",
    },
    {
        icon: FiCalendar,
        title: "Agenda visitas",
        text: "Propõe horários e confirma com o cliente. O compromisso cai na agenda do corretor.",
    },
    {
        icon: FiDatabase,
        title: "Tudo no CRM",
        text: "Cada conversa vira card no funil, com histórico e próximo passo definidos.",
    },
];

type MessageProps = {
    from: "client" | "ai";
    time: string;
    children: ReactNode;
};

function Message({ from, children, time }: MessageProps) {
    const isClient = from === "client";
    return (
        <div className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
            <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug shadow-sm ${isClient
                        ? "rounded-tl-sm border border-border bg-card text-brand-dark"
                        : "rounded-tr-sm bg-brand-cta text-white"
                    }`}
            >
                {children}
                <span
                    className={`mt-1 block text-right text-[10px] ${isClient ? "text-text-muted" : "text-white/70"
                        }`}
                >
                    {time}
                </span>
            </div>
        </div>
    );
}

export function IaWhatsappSection() {
    return (
        <section className="bg-secondary py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
                {/* Mockup */}
                <div className="relative mx-auto w-full max-w-md lg:mx-0">
                    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-brand-dark/10">
                        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                            <span className="relative flex size-10 items-center justify-center rounded-full bg-brand-cta text-white">
                                <HiOutlineSparkles className="size-5" />
                                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success" />
                            </span>
                            <div className="leading-tight">
                                <p className="text-sm font-semibold text-brand-dark">
                                    IA Zone Connection
                                </p>
                                <p className="text-xs text-text-muted">Online agora</p>
                            </div>
                            <FaWhatsapp className="ml-auto size-5 text-success" />
                        </div>

                        <div className="space-y-3 bg-surface-muted px-5 py-5">
                            <Message from="client" time="22:41">
                                Oi! Vi o apartamento de 3 quartos no anúncio. Ainda está
                                disponível?
                            </Message>
                            <Message from="ai" time="22:41">
                                Olá! Está sim. Posso te passar valores e fotos. Você procura
                                para morar ou investir?
                            </Message>
                            <Message from="client" time="22:43">
                                Morar. Orçamento até R$ 650 mil.
                            </Message>
                            <Message from="ai" time="22:43">
                                Perfeito, ele cabe no seu orçamento. Que tal visitar amanhã às
                                10h ou às 15h?
                            </Message>
                        </div>

                        <div className="flex items-center gap-2 border-t border-border bg-accent px-5 py-3 text-xs font-medium text-brand-dark">
                            <FiCheck className="size-4 text-brand-accent" />
                            Lead qualificado e enviado ao CRM
                        </div>
                    </div>

                    <div className="absolute -right-3 -top-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg shadow-brand-dark/10 sm:-right-6">
                        <span className="flex size-6 items-center justify-center rounded-full bg-accent text-brand-accent">
                            <FiUserPlus className="size-3.5" />
                        </span>
                        <span className="font-medium text-brand-dark">Novo lead</span>
                    </div>

                    <div className="absolute -bottom-4 -left-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg shadow-brand-dark/10 sm:-left-6">
                        <span className="flex size-6 items-center justify-center rounded-full bg-accent text-brand-accent">
                            <FiCalendar className="size-3.5" />
                        </span>
                        <span className="font-medium text-brand-dark">
                            Visita agendada · amanhã, 10h
                        </span>
                    </div>
                </div>

                {/* Texto */}
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-module-title sm:text-4xl">
                        Sua IA atende no WhatsApp enquanto você fecha negócios
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-text-muted">
                        Uma Inteligência Artificial conectada ao seu CRM conversa com cada
                        cliente, tira dúvidas sobre os imóveis e passa para o corretor só
                        quem está pronto para avançar.
                    </p>

                    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                        {features.map(({ icon: Icon, title, text }) => (
                            <li
                                key={title}
                                className="rounded-2xl border border-border border-t-2 border-t-brand-accent bg-card p-4 shadow-sm"
                            >
                                <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-brand-accent">
                                    <Icon className="size-4.5" />
                                </span>
                                <h3 className="mt-3 text-sm font-semibold text-brand-dark">
                                    {title}
                                </h3>
                                <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                                    {text}
                                </p>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-6 flex items-center gap-3 rounded-xl border border-info/30 bg-accent px-4 py-3 text-sm text-brand-dark">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-accent text-white">
                            <FiCheck className="size-3.5" />
                        </span>
                        Menos lead esquecido: a IA responde primeiro e o corretor assume
                        na hora certa.
                    </div>

                    <a
                        href="/produtos/ia-whatsapp"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-dark px-6 py-3 text-sm font-medium text-white transition hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        Conhecer a IA
                        <FiArrowRight className="size-4" />
                    </a>
                </div>
            </div>
        </section>
    );
}
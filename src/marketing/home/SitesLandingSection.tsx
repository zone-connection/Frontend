import { useEffect, useState, type ReactNode } from "react";
import {
    FiArrowRight,
    FiDatabase,
    FiLayout,
    FiLock,
    FiSearch,
    FiTarget,
    FiUser,
    FiZap,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const topics = [
    {
        id: "site",
        icon: FiLayout,
        title: "Site completo da imobiliária",
        text: "Vitrine de imóveis, páginas de corretores e contato, com a sua marca.",
    },
    {
        id: "captacao",
        icon: FiTarget,
        title: "Landing pages de captação",
        text: "Uma página por empreendimento ou campanha, feita para gerar contatos.",
    },
    {
        id: "corretor",
        icon: FiUser,
        title: "Landing pages para corretores",
        text: "Cada corretor com sua página própria, pronta para divulgar nas redes.",
    },
    {
        id: "crm",
        icon: FiDatabase,
        title: "Leads direto no CRM",
        text: "Cada formulário preenchido vira card no funil, sem copiar e colar.",
    },
    {
        id: "rapido",
        icon: FiZap,
        title: "Rápido e fácil de achar",
        text: "Páginas leves, boas no celular e prontas para aparecer no Google.",
    },
];

const AUTOPLAY_MS = 5000;

/* ---------- Visuais de cada tópico ---------- */

function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
    return (
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-card text-brand-dark shadow-2xl shadow-black/30">
            <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-4 py-2.5">
                <div className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2.5 rounded-full bg-border" />
                    <span className="size-2.5 rounded-full bg-border" />
                    <span className="size-2.5 rounded-full bg-border" />
                </div>
                <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] text-text-muted">
                    <FiLock className="size-3" />
                    {url}
                </div>
            </div>
            {children}
        </div>
    );
}

const cards = [
    { name: "Mar Azul", price: "R$ 520 mil", tone: "from-info to-module-title" },
    { name: "Parque Real", price: "R$ 390 mil", tone: "from-brand-accent to-brand-dark" },
    { name: "Vista Verde", price: "R$ 455 mil", tone: "from-chart-4 to-brand-accent" },
];

function SiteVisual() {
    return (
        <BrowserFrame url="suaimobiliaria.com.br">
            <div className="bg-linear-to-br from-module-title to-brand-dark px-5 py-6 text-white">
                <p className="text-base font-semibold leading-tight">Encontre o imóvel certo no Recife</p>
                <div className="mt-3 flex items-center gap-2 rounded-full bg-white p-1 pl-3 text-[11px] text-text-muted">
                    <FiSearch className="size-3.5" />
                    <span className="flex-1">Bairro, cidade ou código</span>
                    <span className="rounded-full bg-brand-cta px-3 py-1.5 font-medium text-white">Buscar</span>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 bg-surface-muted p-4">
                {cards.map((c) => (
                    <div key={c.name} className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className={`h-16 bg-linear-to-br ${c.tone}`} />
                        <div className="p-2.5">
                            <p className="text-xs font-semibold">{c.name}</p>
                            <p className="text-[11px] font-semibold text-module-title">{c.price}</p>
                        </div>
                    </div>
                ))}
            </div>
        </BrowserFrame>
    );
}

function CaptacaoVisual() {
    return (
        <BrowserFrame url="suaimobiliaria.com.br/mar-azul">
            <div className="grid grid-cols-5">
                <div className="col-span-3 flex flex-col justify-end bg-linear-to-br from-info to-module-title p-5 text-white">
                    <p className="text-[11px] text-white/80">Boa Viagem, Recife</p>
                    <p className="mt-1 text-lg font-semibold leading-tight">Residencial Mar Azul</p>
                    <p className="mt-1 text-[11px] text-white/80">2 e 3 quartos · a partir de R$ 520 mil</p>
                </div>
                <div className="col-span-2 space-y-2 bg-surface-muted p-4">
                    <p className="text-xs font-semibold">Quero conhecer</p>
                    <div className="h-7 rounded-lg border border-border bg-card px-2 text-[11px] leading-7 text-text-muted">Seu nome</div>
                    <div className="h-7 rounded-lg border border-border bg-card px-2 text-[11px] leading-7 text-text-muted">WhatsApp</div>
                    <div className="rounded-lg bg-brand-cta py-2 text-center text-[11px] font-medium text-white">Receber contato</div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-border bg-card px-4 py-3 text-center text-[11px] text-text-muted">
                <span>68 a 92 m²</span>
                <span>Lazer completo</span>
                <span>Entrega 2028</span>
            </div>
        </BrowserFrame>
    );
}

function CorretorVisual() {
    return (
        <div className="w-56 overflow-hidden rounded-exlborder-[6px] border-primary bg-card text-brand-dark shadow-2xl shadow-black/40">
            <div className="bg-linear-to-br from-module-title to-brand-dark px-4 pb-6 pt-5 text-center text-white">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-white/60 bg-brand-cta text-lg font-semibold">
                    MC
                </div>
                <p className="mt-2 text-sm font-semibold">Marina Costa</p>
                <p className="text-[10px] text-white/70">Corretora de imóveis · CRECI 00000</p>
            </div>
            <div className="space-y-2 p-3">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-success py-2 text-xs font-medium text-white">
                    <FaWhatsapp className="size-4" />
                    Chamar no WhatsApp
                </div>
                {cards.slice(0, 2).map((c) => (
                    <div key={c.name} className="flex items-center gap-2 rounded-xl border border-border p-2">
                        <div className={`size-9 rounded-lg bg-linear-to-br ${c.tone}`} />
                        <div>
                            <p className="text-[11px] font-semibold">{c.name}</p>
                            <p className="text-[10px] text-module-title">{c.price}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CrmVisual() {
    return (
        <div className="flex w-full items-center gap-3 text-brand-dark">
            <div className="w-[38%] rounded-2xl border border-white/10 bg-card p-3 shadow-2xl shadow-black/30">
                <p className="text-[11px] font-semibold">Formulário da landing</p>
                <div className="mt-2 space-y-1.5">
                    <div className="h-6 rounded-md border border-border bg-surface-muted px-2 text-[10px] leading-6">Carlos Souza</div>
                    <div className="h-6 rounded-md border border-border bg-surface-muted px-2 text-[10px] leading-6">(81) 9 9999-0000</div>
                    <div className="rounded-md bg-brand-cta py-1.5 text-center text-[10px] font-medium text-white">Enviar</div>
                </div>
            </div>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info text-white">
                <FiArrowRight className="size-4" />
            </span>
            <div className="flex-1 rounded-2xl border border-white/10 bg-card p-3 shadow-2xl shadow-black/30">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
                    <span>Funil comercial</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-brand-accent">Novo lead</span>
                </div>
                <div className="rounded-xl border border-border border-l-4 border-l-brand-accent bg-surface-muted p-2.5">
                    <p className="text-[11px] font-semibold">Carlos Souza</p>
                    <p className="text-[10px] text-text-muted">Landing Mar Azul · agora</p>
                </div>
                <div className="mt-2 rounded-xl border border-border bg-card p-2.5 opacity-70">
                    <p className="text-[11px] font-semibold">Paula Lima</p>
                    <p className="text-[10px] text-text-muted">Site · 2 h atrás</p>
                </div>
                <div className="mt-2 rounded-xl border border-border bg-card p-2.5 opacity-40">
                    <p className="text-[11px] font-semibold">Rafael Dias</p>
                    <p className="text-[10px] text-text-muted">Landing · ontem</p>
                </div>
            </div>
        </div>
    );
}

function RapidoVisual() {
    return (
        <div className="grid w-full gap-3 text-brand-dark sm:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-card p-4 shadow-2xl shadow-black/30 sm:col-span-3">
                <div className="flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-[11px] text-text-muted">
                    <FiSearch className="size-3.5" />
                    apartamento 3 quartos boa viagem
                </div>
                <p className="mt-4 text-[10px] text-text-muted">suaimobiliaria.com.br › mar-azul</p>
                <p className="text-sm font-semibold text-module-title">Residencial Mar Azul | Apartamentos em Boa Viagem</p>
                <p className="mt-1 text-[11px] leading-snug text-text-muted">
                    Apartamentos de 2 e 3 quartos a partir de R$ 520 mil. Agende sua visita.
                </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-card p-4 shadow-2xl shadow-black/30 sm:col-span-2">
                <div
                    className="flex size-20 items-center justify-center rounded-full"
                    style={{ background: "conic-gradient(var(--success) 98%, var(--border) 0)" }}
                >
                    <span className="flex size-15 items-center justify-center rounded-full bg-card text-xl font-semibold text-success">
                        98
                    </span>
                </div>
                <p className="mt-2 text-xs font-semibold">Desempenho</p>
                <p className="text-[11px] text-text-muted">Carrega em 1,2 s no celular</p>
            </div>
        </div>
    );
}

const visuals = [SiteVisual, CaptacaoVisual, CorretorVisual, CrmVisual, RapidoVisual];

/* ---------- Seção ---------- */

export function SitesLandingSection() {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (paused || reduce) return;
        const timer = window.setInterval(
            () => setActive((i) => (i + 1) % topics.length),
            AUTOPLAY_MS,
        );
        return () => window.clearInterval(timer);
    }, [paused, active]);

    const ActiveIcon = topics[active].icon;

    return (
        <section
            className="bg-linear-to-br from-brand-dark to-primary py-20 text-white sm:py-24"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
                {/* Texto */}
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
                        Sites e landing pages que transformam visitas em contatos
                    </h2>
                    <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
                        Desenvolvemos o site da sua imobiliária e páginas de captação
                        profissionais, conectadas ao CRM para que nenhum interessado se
                        perca no caminho.
                    </p>

                    <a
                        href="#contato"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-brand-dark transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        Quero meu site
                        <FiArrowRight className="size-4" />
                    </a>
                </div>

                {/* Tela animada */}
                <div role="group" aria-roledescription="carrossel" aria-label="Soluções em sites e landing pages">
                    <div className="relative h-84 sm:h-96">
                        {visuals.map((Visual, i) => (
                            <div
                                key={topics[i].id}
                                aria-hidden={i !== active}
                                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out motion-reduce:transition-none ${i === active
                                        ? "translate-y-0 scale-100 opacity-100"
                                        : "pointer-events-none translate-y-4 scale-95 opacity-0"
                                    }`}
                            >
                                <Visual />
                            </div>
                        ))}
                    </div>

                    {/* Legenda do tópico em exibição */}
                    <div
                        key={active}
                        className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-cta text-white">
                            <ActiveIcon className="size-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">{topics[active].title}</p>
                            <p className="mt-0.5 text-[13px] leading-relaxed text-white/65">{topics[active].text}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2">
                        {topics.map((t, i) => (
                            <button
                                key={t.id}
                                type="button"
                                aria-label={`Ver: ${t.title}`}
                                aria-current={i === active}
                                onClick={() => setActive(i)}
                                className={`h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info ${i === active ? "w-8 bg-info" : "w-2 bg-white/30 hover:bg-white/50"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
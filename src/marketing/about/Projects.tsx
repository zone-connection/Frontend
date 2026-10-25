import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import assistek from "./assets/assistekassistencia.vercel.app-Assistek Clima e Refrigeração-cvscreenshot.jpeg";
import openhaus from "./assets/openhaus-delta.vercel.app-OpenHaus Negócios Imobiliários-cvscreenshot.jpeg";
import jonathas from "./assets/jonathascorretor.com.br-Jonathas Luz Corretor de Imóveis-cvscreenshot.jpeg";
import debora from "./assets/corretoradebora.com.br-Débora Silva Corretora de Imóveis-cvscreenshot.jpeg";
import alexandre from "./assets/alexandrecorretordeimoveis.com.br-Alexandre Arruda Corretor de Imóveis-cvscreenshot.jpeg";
import zone from "./assets/zoneconnection.jpeg";

gsap.registerPlugin(useGSAP, ScrollTrigger);
// Evita saltos no mobile quando a barra do navegador aparece/some
ScrollTrigger.config({ ignoreMobileResize: true });

type Project = {
    id: string;
    name: string;
    type: string;
    description: string;
    href: string;
    image: string;
};

const projects: Project[] = [
    {
        id: "zone",
        name: "CRM Zone Connection",
        type: "CRM para imobiliárias",
        description:
            "CRM para imobiliárias, com controle de leads, agendamentos, contatos e muito mais.",
        href: "https://zoneconnection.com.br",
        image: zone,
    },
    {
        id: "openhaus",
        name: "OpenHaus",
        type: "Site para imobiliária",
        description:
            "Site completo para uma imobiliária, com visual profissional para apresentar a empresa e os imóveis, e facilitar o contato com quem procura comprar ou alugar.",
        href: "https://www.openhausimob.com.br",
        image: openhaus,
    },
    {
        id: "jonathas",
        name: "Jonathas Luz",
        type: "Landing page para corretor de imóveis",
        description:
            "Landing page focada em converter visitantes em contatos, apresentando o corretor, seus diferenciais e os caminhos para falar com ele.",
        href: "https://jonathascorretor.com.br",
        image: jonathas,
    },
    {
        id: "debora",
        name: "Débora Silva",
        type: "Landing page para corretora de imóveis",
        description:
            "Landing page pensada para fortalecer a presença digital da corretora e transformar o interesse de quem visita em atendimento.",
        href: "https://corretoradebora.com.br",
        image: debora,
    },
    {
        id: "alexandre",
        name: "Alexandre Arruda",
        type: "Landing page para corretor de imóveis",
        description:
            "Landing page direta e objetiva, criada para apresentar o corretor com clareza e levar o cliente rápido ao contato.",
        href: "https://alexandrecorretordeimoveis.com.br",
        image: alexandre,
    },
    {
        id: "assistek",
        name: "Assistek Clima e Refrigeração",
        type: "Site para técnico de refrigeração",
        description:
            "Site institucional para um técnico de refrigeração, apresentando os serviços e transmitindo confiança para quem precisa de assistência.",
        href: "https://assistekassistencia.vercel.app",
        image: assistek,
    },
];

const titleWords = "Projetos que já estão no ar.".split(" ");

const buttonClass =
    "inline-block rounded-full bg-brand-dark px-5 py-2.5 text-[0.8rem] font-semibold text-white no-underline transition-colors hover:bg-brand-dark/90";
const imageClass =
    "rounded-lg border border-brand-dark/15 bg-white shadow-[0_18px_40px_rgba(5,54,71,0.1)]";

function ProjectInfo({ project }: { project: Project }) {
    return (
        <>
            <p className="m-0 text-[0.95rem] text-text-muted">{project.type}</p>
            <h3 className="mt-3 mb-0 font-sans text-[clamp(2.2rem,4vw,3.6rem)] leading-[0.98] font-normal tracking-[-0.03em]">
                {project.name}
            </h3>
            <p className="mt-6 mb-0 max-w-[46ch] text-[1.02rem] leading-[1.65] text-text-muted">{project.description}</p>
            <div className="mt-8">
                <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass}
                    aria-label={`Visitar o site ${project.name} (abre em nova aba)`}
                >
                    Visitar site
                </a>
            </div>
        </>
    );
}

export default function Projects() {
    const root = useRef<HTMLElement>(null);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReduced(query.matches);
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    useGSAP(
        () => {
            const scope = root.current;
            if (!scope) return;

            const mm = gsap.matchMedia();

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set(scope.querySelectorAll("[data-scrub]"), { opacity: 1 });
            });

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const lead = scope.querySelector<HTMLElement>("[data-lead]");
                if (!lead) return;

                const tween = gsap.fromTo(
                    lead.querySelectorAll("[data-scrub]"),
                    { opacity: 0.16 },
                    {
                        opacity: 1,
                        ease: "none",
                        stagger: 0.12,
                        scrollTrigger: {
                            trigger: lead,
                            start: "top 82%",
                            end: "bottom 48%",
                            scrub: true,
                        },
                    },
                );

                return () => {
                    tween.scrollTrigger?.kill();
                    tween.kill();
                };
            });

            // Cards empilhados com a rolagem (desktop e mobile)
            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const stage = scope.querySelector<HTMLElement>("[data-stage]");
                const cards = gsap.utils.toArray<HTMLElement>("[data-card]", scope);
                const infos = gsap.utils.toArray<HTMLElement>("[data-info]", scope);
                const bar = scope.querySelector<HTMLElement>("[data-bar]");
                const total = cards.length;
                if (!stage || total < 2) return;

                gsap.set(cards.slice(1), { yPercent: 115, rotate: 3 });
                gsap.set(infos.slice(1), { autoAlpha: 0, y: 24 });

                const tl = gsap.timeline({
                    defaults: { ease: "none" },
                    scrollTrigger: {
                        trigger: stage,
                        start: "top top",
                        end: () => `+=${(total - 1) * window.innerHeight * 0.9}`,
                        pin: true,
                        scrub: 0.6,
                        anticipatePin: 1,
                        invalidateOnRefresh: true,
                        snap: {
                            snapTo: 1 / (total - 1),
                            duration: { min: 0.2, max: 0.6 },
                            ease: "power2.inOut",
                        },
                    },
                });

                for (let i = 1; i < total; i++) {
                    const at = i - 1;
                    tl.to(cards[i], { yPercent: 0, rotate: 0, duration: 1, ease: "power2.out" }, at);
                    for (let j = 0; j < i; j++) {
                        const depth = i - j;
                        tl.to(cards[j], { y: -depth * 16, scale: 1 - depth * 0.05, duration: 1 }, at);
                    }
                    tl.to(infos[i - 1], { autoAlpha: 0, y: -24, duration: 0.4 }, at + 0.1);
                    tl.fromTo(infos[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.5);
                }

                if (bar) tl.fromTo(bar, { scaleX: 1 / total }, { scaleX: 1, duration: total - 1 }, 0);

                return () => {
                    tl.scrollTrigger?.kill();
                    tl.kill();
                };
            });
        },
        { scope: root, dependencies: [reduced] },
    );

    return (
        <section
            ref={root}
            id="projetos"
            aria-labelledby="projects-title"
            className="relative bg-white text-brand-dark"
        >
            <div data-header className="mx-auto max-w-7xl px-8 pt-28 max-md:px-6 max-md:pt-20">
                <h2
                    id="projects-title"
                    data-lead
                    className="m-0 max-w-[14ch] font-sans text-[clamp(2rem,4vw,3em)] leading-[1.1] font-semibold tracking-[0.03em]"
                >
                    {titleWords.map((word, i) => (
                        <Fragment key={i}>
                            <span data-scrub className="inline-block">
                                {word}
                            </span>{" "}
                        </Fragment>
                    ))}
                </h2>
            </div>

            {/* Cards empilhados que trocam com a rolagem (desktop e mobile) */}
            {!reduced && (
                <div data-stage className="h-svh overflow-hidden px-8 max-md:px-6">
                    <div className="mx-auto grid h-full max-w-7xl grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center gap-20 max-lg:gap-10 max-md:grid-cols-1 max-md:content-center max-md:gap-6">
                        <div
                            className="relative h-[68svh] max-h-136 max-md:h-auto max-md:aspect-16/10 max-md:[clip-path:inset(-3rem_-1rem_-0.5rem_-1rem)]"
                            role="list"
                            aria-label="Projetos"
                        >
                            {projects.map((p) => (
                                <div
                                    key={p.id}
                                    data-card
                                    role="listitem"
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    <img
                                        src={p.image}
                                        alt={`Captura de tela do site ${p.name}`}
                                        className={`block h-auto max-h-full w-auto max-w-full ${imageClass}`}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="relative h-112 max-md:h-72">
                            {projects.map((p, i) => (
                                <div
                                    key={p.id}
                                    data-info
                                    aria-hidden={undefined}
                                    className={`absolute inset-0 flex flex-col justify-center max-md:justify-start ${i > 0 ? "invisible opacity-0" : ""}`}
                                >
                                    <ProjectInfo project={p} />
                                </div>
                            ))}
                            <div className="absolute inset-x-0 bottom-0 h-px bg-brand-dark/15">
                                <div data-bar className="h-full origin-left bg-brand-accent" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Movimento reduzido: lista simples */}
            {reduced && (
            <div className="mx-auto max-w-7xl px-8 pb-20 max-md:px-6">
                <ul className="m-0 grid list-none gap-16 p-0 md:grid-cols-2 md:gap-x-16 md:gap-y-20">
                    {projects.map((p) => (
                        <li key={p.id}>
                            <img
                                src={p.image}
                                alt={`Captura de tela do site ${p.name}`}
                                loading="lazy"
                                className={`block h-auto w-full ${imageClass}`}
                            />
                            <div className="mt-6">
                                <ProjectInfo project={p} />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            )}

            {!reduced && <div className="h-24 max-md:h-12" aria-hidden="true" />}
        </section>
    );
}
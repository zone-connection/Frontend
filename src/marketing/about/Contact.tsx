import { Fragment, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FaGlobe, FaInstagram, FaWhatsapp } from "react-icons/fa6";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type LinkKind = "whatsapp" | "instagram" | "site";

type ContactLink = {
    kind: LinkKind;
    href: string;
    label: string;
};

type Contact = {
    id: string;
    name: string;
    role: string;
    description: string;
    links: ContactLink[];
};

function whatsapp(number: string, name: string): ContactLink {
    const text = `Olá, ${name.split(" ")[0]}! Vim pelo site da Zone Connection e gostaria de conversar sobre um projeto.`;
    return {
        kind: "whatsapp",
        href: `https://wa.me/${number}?text=${encodeURIComponent(text)}`,
        label: `Chamar ${name} no WhatsApp`,
    };
}

const contacts: Contact[] = [
    {
        id: "eduardo",
        name: "Eduardo Alves",
        role: "Desenvolvedor Full Stack",
        description:
            "Atua de ponta a ponta, do frontend ao backend: interface, regras de negócio, dados e integrações. Fale com ele sobre ERP, CRM, gestão e outros sistemas.",
        links: [
            whatsapp("558192215812", "Eduardo Alves"),
            { kind: "instagram", href: "https://www.instagram.com/eduardoalves.sena/", label: "Instagram de Eduardo Alves" },
        ],
    },
    {
        id: "priscilla",
        name: "Priscilla Marinho",
        role: "Desenvolvedora Frontend",
        description:
            "Cuida da parte que o cliente vê e usa, com design, interface e experiência. Fale com ela para tirar o seu site, landing page ou sistema do papel.",
        links: [
            whatsapp("5581989877451", "Priscilla Marinho"),
            { kind: "instagram", href: "https://www.instagram.com/_priscilla_marinho_/", label: "Instagram de Priscilla Marinho" },
        ],
    },
];

const icons: Record<LinkKind, ReactNode> = {
    whatsapp: <FaWhatsapp aria-hidden="true" />,
    instagram: <FaInstagram aria-hidden="true" />,
    site: <FaGlobe aria-hidden="true" />,
};

const titleWords = "Vamos tirar o seu projeto do papel?".split(" ");

const buttonClass =
    "inline-flex size-12 items-center justify-center rounded-full border border-brand-dark bg-brand-dark text-[1.2rem] text-white no-underline transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink group-hover/row:border-paper group-hover/row:bg-white group-hover/row:text-brand-dark";

export default function Contact() {
    const root = useRef<HTMLElement>(null);

    useGSAP(
        () => {
            const scope = root.current;
            if (!scope) return;

            const mm = gsap.matchMedia();

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set(scope.querySelectorAll("[data-scrub]"), { opacity: 1 });
            });

            // Entrada: título, linhas que se desenham e conteúdo que sobe, linha por linha
            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const rows = gsap.utils.toArray<HTMLElement>("[data-row]", scope);
                const lines = gsap.utils.toArray<HTMLElement>("[data-line]", scope);
                const lead = scope.querySelector<HTMLElement>("[data-lead]");

                gsap.set(lines, { scaleX: 0, autoAlpha: 1, transformOrigin: "left center" });

                const head = gsap.timeline({
                    defaults: { ease: "power3.out" },
                    scrollTrigger: { trigger: scope.querySelector("[data-head]"), start: "top 80%", once: true },
                });
                head.fromTo(
                    scope.querySelectorAll("[data-sub]"),
                    { autoAlpha: 0, y: 12 },
                    { autoAlpha: 1, y: 0, duration: 0.6 },
                    0.5,
                );

                let titleTween: gsap.core.Tween | undefined;
                if (lead) {
                    titleTween = gsap.fromTo(
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
                }

                const timelines = rows.map((row, i) => {
                    const tl = gsap.timeline({
                        defaults: { ease: "power3.out" },
                        scrollTrigger: { trigger: row, start: "top 88%", once: true },
                    });
                    tl.to(lines[i], { scaleX: 1, duration: 1.1, ease: "power4.inOut" }).fromTo(
                        row.querySelectorAll("[data-item]"),
                        { autoAlpha: 0, y: 22 },
                        { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 },
                        0.25,
                    );
                    return tl;
                });

                const endLine = scope.querySelector<HTMLElement>("[data-line-end]");
                let endTween: gsap.core.Tween | undefined;
                if (endLine) {
                    gsap.set(endLine, { scaleX: 0, autoAlpha: 1, transformOrigin: "left center" });
                    endTween = gsap.to(endLine, {
                        scaleX: 1,
                        duration: 1.1,
                        ease: "power4.inOut",
                        scrollTrigger: { trigger: endLine, start: "top 95%", once: true },
                    });
                }

                return () => {
                    [head, ...timelines].forEach((t) => {
                        t.scrollTrigger?.kill();
                        t.kill();
                    });
                    titleTween?.scrollTrigger?.kill();
                    titleTween?.kill();
                    endTween?.scrollTrigger?.kill();
                    endTween?.kill();
                };
            });

            // Botões "magnéticos": seguem levemente o cursor (só com mouse)
            mm.add("(hover: hover) and (prefers-reduced-motion: no-preference)", () => {
                const cleanups: Array<() => void> = [];

                scope.querySelectorAll<HTMLElement>("[data-magnet]").forEach((el) => {
                    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3" });
                    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3" });

                    const move = (e: PointerEvent) => {
                        const r = el.getBoundingClientRect();
                        xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
                        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
                    };
                    const leave = () => {
                        xTo(0);
                        yTo(0);
                    };

                    el.addEventListener("pointermove", move);
                    el.addEventListener("pointerleave", leave);
                    cleanups.push(() => {
                        el.removeEventListener("pointermove", move);
                        el.removeEventListener("pointerleave", leave);
                    });
                });

                return () => cleanups.forEach((fn) => fn());
            });
        },
        { scope: root },
    );

    return (
        <section
            ref={root}
            id="contato"
            aria-labelledby="contact-title"
            className="relative bg-white px-8 py-28 text-brand-dark max-md:px-6 max-md:py-20"
        >
            <div className="mx-auto max-w-7xl">
                <div data-head className="mb-16 max-md:mb-10">
                    <h2
                        id="contact-title"
                        data-lead
                        className="m-0 max-w-[20ch] font-sans text-[clamp(2rem,4vw,3em)] leading-[1.1] font-semibold tracking-[0.03em]"
                    >
                        {titleWords.map((word, i) => (
                            <Fragment key={i}>
                                <span data-scrub className="inline-block">
                                    {word}
                                </span>{" "}
                            </Fragment>
                        ))}
                    </h2>
                    <p
                        data-sub
                        className="mt-6 mb-0 text-[1.02rem] text-text-muted opacity-0 motion-reduce:opacity-100"
                    >
                        Escolha com quem quer falar.
                    </p>
                </div>

                <ul className="m-0 list-none p-0">
                    {contacts.map((c) => (
                        <li
                            key={c.id}
                            data-row
                            className="group/row relative isolate -mx-4 px-4 md:-mx-8 md:px-8"
                        >
                            {/* linha superior que se desenha */}
                            <div
                                data-line
                                aria-hidden="true"
                                className="absolute inset-x-4 top-0 h-px bg-brand-dark/25 opacity-0 motion-reduce:opacity-100 md:inset-x-8"
                            />
                            {/* fundo que sobe ao passar o mouse */}
                            <span
                                aria-hidden="true"
                                className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-brand-dark transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] group-hover/row:scale-y-100"
                            />

                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-10 py-10 transition-colors duration-500 group-hover/row:text-white max-md:grid-cols-1 max-md:gap-5 max-md:py-8">
                                <div data-item className="opacity-0 motion-reduce:opacity-100">
                                    <p className="m-0 text-[0.95rem] text-text-muted transition-colors duration-500 group-hover/row:text-white/70">
                                        {c.role}
                                    </p>
                                    <h3 className="mt-2 mb-0 font-sans text-[clamp(2rem,3.6vw,3.2rem)] leading-none font-normal tracking-[-0.03em]">
                                        {c.name}
                                    </h3>
                                </div>

                                <p
                                    data-item
                                    className="m-0 max-w-[44ch] text-[0.98rem] leading-[1.65] text-text-muted opacity-0 transition-colors duration-500 group-hover/row:text-white/70 motion-reduce:opacity-100"
                                >
                                    {c.description}
                                </p>

                                <div data-item className="flex gap-3 opacity-0 motion-reduce:opacity-100">
                                    {c.links.map((link) => (
                                        <a
                                            key={link.kind}
                                            data-magnet
                                            href={link.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={buttonClass}
                                            aria-label={`${link.label} (abre em nova aba)`}
                                            title={link.label}
                                        >
                                            {icons[link.kind]}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>

                <div
                    data-line-end
                    aria-hidden="true"
                    className="h-px bg-brand-dark/25 opacity-0 motion-reduce:opacity-100"
                />
            </div>
        </section>
    );
}
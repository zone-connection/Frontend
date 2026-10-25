import { Fragment, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const companyLead =
    "Uma ideia que se tornou um propósito.";
const systemsText =
    "A Zone Connection nasceu para aproximar empresas da tecnologia e transformar ideias em soluções reais. Trabalhamos com ERP, CRM, sistemas de gestão e qualquer outra solução que a sua empresa precisar. Desenvolvemos sistemas sob medida, do controle da rotina ao acompanhamento de clientes e resultados.";

const services = [
    { name: "ERP e sistemas de gestão", note: "Para organizar e automatizar a rotina da empresa" },
    { name: "CRM", note: "Clientes, atendimentos e negociações num só lugar" },
    { name: "Sites e landing pages", note: "Presença digital forte, para atrair clientes" },
    { name: "Qualquer outro sistema", note: "Se o seu negócio precisa, a gente desenvolve sob medida" },
];

const foundersLead =
    "Por trás da Zone Connection estão Eduardo Alves e Priscilla Marinho.";
const foundersBody =
    "Somos dois desenvolvedores que decidiram unir suas habilidades para construir algo próprio. Compartilhando ideias, enfrentando desafios e aprendendo a cada projeto, encontramos na tecnologia uma forma de transformar planos em realidade e fazer nossa parceria crescer para além do código.";

function Lead({ text }: { text: string }) {
    return (
        <p
            data-lead
            className="m-0 font-sans text-[clamp(1.7rem,2.9vw,2.5rem)] leading-[1.19] font-semibold tracking-[0.03em]"
        >
            {text.split(" ").map((word, i) => (
                <Fragment key={i}>
                    <span data-scrub className="inline-block">
                        {word}
                    </span>{" "}
                </Fragment>
            ))}
        </p>
    );
}

export default function About() {
    const root = useRef<HTMLElement>(null);

    useGSAP(
        () => {
            const scope = root.current;
            if (!scope) return;

            const blocks = gsap.utils.toArray<HTMLElement>("[data-block]", scope);
            const mm = gsap.matchMedia();

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set(scope.querySelectorAll("[data-word]"), { y: 0 });
                gsap.set(scope.querySelectorAll("[data-reveal]"), { autoAlpha: 1, y: 0 });
                gsap.set(scope.querySelectorAll("[data-photo]"), { clipPath: "inset(0% 0% 0% 0%)" });
                gsap.set(scope.querySelectorAll("[data-frame]"), { autoAlpha: 1, x: 0, y: 0 });
            });

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const tweens: gsap.core.Animation[] = [];

                blocks.forEach((block) => {
                    const words = block.querySelectorAll<HTMLElement>("[data-word]");
                    const reveal = block.querySelectorAll<HTMLElement>("[data-reveal]");
                    const photo = block.querySelector<HTMLElement>("[data-photo]");
                    const photoImg = block.querySelector<HTMLElement>("[data-photo-img]");
                    const frame = block.querySelector<HTMLElement>("[data-frame]");

                    const tl = gsap.timeline({
                        defaults: { ease: "power3.out" },
                        scrollTrigger: { trigger: block, start: "top 78%", once: true },
                    });

                    if (photo) {
                        tl.fromTo(
                            photo,
                            { clipPath: "inset(0% 0% 100% 0%)" },
                            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power4.inOut" },
                        );
                        if (photoImg) tl.fromTo(photoImg, { scale: 1.15 }, { scale: 1, duration: 1.4 }, 0);
                        if (frame) tl.fromTo(frame, { autoAlpha: 0, x: -16, y: -16 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.8 }, 0.7);
                    }

                    if (words.length) tl.to(words, { y: 0, duration: 0.85, stagger: 0.05 }, 0.2);
                    if (reveal.length) {
                        tl.fromTo(
                            reveal,
                            { autoAlpha: 0, y: 14 },
                            { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.09 },
                            0.6,
                        );
                    }
                    tweens.push(tl);

                    // O texto de destaque "acende" palavra por palavra conforme a rolagem
                    block.querySelectorAll<HTMLElement>("[data-lead]").forEach((lead) => {
                        tweens.push(
                            gsap.fromTo(
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
                            ),
                        );
                    });
                });

                return () => {
                    tweens.forEach((t) => {
                        t.scrollTrigger?.kill();
                        t.kill();
                    });
                };
            });
        },
        { scope: root },
    );

    return (
        <section
            ref={root}
            id="sobre"
            aria-labelledby="about-title"
            className="relative overflow-hidden bg-white px-8 md:py-20 text-brand-dark "
        >
            <div className="mx-auto flex max-w-7xl flex-col gap-24 max-md:gap-16">

                {/* Bloco 1: logo à esquerda, empresa à direita */}
                <div
                    data-block
                    className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] items-start gap-20 max-lg:gap-10 max-md:grid-cols-1"
                >
                    <div className="relative max-md:mr-4">
                        <div
                            data-frame
                            aria-hidden="true"
                            className="absolute inset-0 translate-x-4 translate-y-4 rounded-lg border border-brand-dark opacity-0 motion-reduce:opacity-100"
                        />
                        <div
                            data-photo
                            className="relative overflow-hidden rounded-lg bg-white shadow-[0_18px_40px_rgba(5,54,71,0.08)] [clip-path:inset(0%_0%_100%_0%)] motion-reduce:[clip-path:none]"
                        >
                            <img
                                data-photo-img
                                src="/portfolio/LogoComFundo.png"
                                alt="Logo da Zone Connection"
                                loading="lazy"
                                className="block aspect-square h-auto w-full object-cover"
                            />
                        </div>
                    </div>

                    <div>
                        <Lead text={companyLead} />

                        <p
                            data-reveal
                            className="mt-8 mb-0 max-w-[70ch] text-[1.02rem] leading-[1.7] opacity-0 motion-reduce:opacity-100"
                        >
                            {systemsText}
                        </p>

                        <ul className="mt-10 mb-0 list-none p-0">
                            {services.map((s) => (
                                <li
                                    key={s.name}
                                    data-reveal
                                    className="flex items-baseline justify-between gap-6 border-t border-brand-dark/20 py-4 opacity-0 last:border-b max-sm:flex-col max-sm:gap-1 motion-reduce:opacity-100"
                                >
                                    <span className="text-[1.05rem] font-semibold tracking-[-0.02em]">{s.name}</span>
                                    <span className="max-w-[30ch] text-right text-[0.85rem] leading-snug text-text-muted max-sm:max-w-none max-sm:text-left">
                                        {s.note}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bloco 2: fundadores à esquerda, foto à direita */}
                <div
                    id="historia"
                    data-block
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] items-center gap-20 max-lg:gap-10 max-md:grid-cols-1"
                >
                    <div className="max-md:order-2">
                        <Lead text={foundersLead} />
                        <p
                            data-reveal
                            className="mt-8 mb-0 max-w-[58ch] text-[1.02rem] leading-[1.7] text-text-muted opacity-0 motion-reduce:opacity-100"
                        >
                            {foundersBody}
                        </p>
                    </div>

                    <figure className="relative m-0 max-md:order-1 max-md:mr-4">
                        <div
                            data-frame
                            aria-hidden="true"
                            className="absolute inset-0 translate-x-4 translate-y-4 rounded-lg border border-brand-dark opacity-0 motion-reduce:opacity-100"
                        />
                        <div
                            data-photo
                            className="relative overflow-hidden rounded-lg shadow-[0_18px_40px_rgba(5,54,71,0.08)] [clip-path:inset(0%_0%_100%_0%)] motion-reduce:[clip-path:none]"
                        >
                            <img
                                data-photo-img
                                src="/portfolio/foto.JPG"
                                alt="Priscilla Marinho Falcão e Eduardo Alves, fundadores da Zone Connection"
                                loading="lazy"
                                className="block aspect-2/2 h-auto w-full object-cover"
                            />
                        </div>
                    </figure>
                </div>
            </div>
        </section>
    );
}
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import assistek from "./assets/assistekassistencia.vercel.app-Assistek Clima e Refrigeração-cvscreenshot.jpeg";
import openhaus from "./assets/openhaus-delta.vercel.app-OpenHaus Negócios Imobiliários-cvscreenshot.jpeg";
import jonathas from "./assets/jonathascorretor.com.br-Jonathas Luz Corretor de Imóveis-cvscreenshot.jpeg";
import alexandre from "./assets/alexandrecorretordeimoveis.com.br-Alexandre Arruda Corretor de Imóveis-cvscreenshot.jpeg";
import zone from "./assets/zoneconnection.com.br-Zone Connection CRM IA no WhatsApp e Sites para Imobiliárias-cvscreenshot.jpeg";
import debora from "./assets/corretoradebora.com.br-Débora Silva Corretora de Imóveis-cvscreenshot.jpeg";

gsap.registerPlugin(useGSAP);

/* ------------------------------------------------------------------ */
/* Conteúdo                                                           */
/* ------------------------------------------------------------------ */

export type HeroProject = {
  id: string;
  title: string;
  category: string;
  src: string;
};

export const heroContent = {
  title: "Transformamos ideias em experiências digitais.",
  highlight: "Sites, CRM's e outros sistemas web.",
  support:
    "Desenvolvemos soluções digitais que unem design, tecnologia e funcionalidade para transformar ideias em projetos reais.",
  primary: { label: "Explorar projetos", href: "#projetos" },
  secondary: { label: "Conheça nossa história", href: "#historia" },
};

export const heroProjects: HeroProject[] = [
  { id: "zone", title: "Zone Connection", category: "Site", src: zone },
  { id: "openhaus", title: "OpenHaus", category: "Site institucional", src: openhaus },
  { id: "assistek", title: "Assistek", category: "Site", src: assistek },
  { id: "jonathas", title: "Jonathas Luz", category: "Landing page", src: jonathas },
  { id: "alexandre", title: "Alexandre Arruda", category: "Landing page", src: alexandre },
  { id: "debora", title: "Débora Silva", category: "Landing page", src: debora },
];

const leftWords = heroContent.highlight.split(" ");
const rightWords = heroContent.title.split(" ");

const lanes = [
  heroProjects,
  [...heroProjects.slice(3), ...heroProjects.slice(0, 3)],
];

/* ------------------------------------------------------------------ */
/* Componente                                                         */
/* ------------------------------------------------------------------ */

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const scope = root.current;
      if (!scope) return;

      const left = scope.querySelectorAll<HTMLElement>("[data-left]");
      const right = scope.querySelectorAll<HTMLElement>("[data-right]");
      const fade = scope.querySelectorAll<HTMLElement>("[data-fade]");
      const stage = scope.querySelector<HTMLElement>("[data-stage]");
      const tracks = scope.querySelectorAll<HTMLElement>("[data-lane]");

      const showFinal = () => {
        gsap.set([...left, ...right], { y: 0 });
        gsap.set(fade, { autoAlpha: 1, y: 0 });
        gsap.set(stage, { autoAlpha: 1 });
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        showFinal();
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const loops: gsap.core.Tween[] = [];

        tracks.forEach((lane, index) => {
          const distance = lane.scrollWidth / 2;
          loops.push(
            gsap.fromTo(
              lane,
              { x: index === 1 ? -distance * 0.35 : 0 },
              {
                x: index === 1 ? -distance * 1.35 : -distance,
                duration: index === 0 ? 42 : 52,
                ease: "none",
                repeat: -1,
              },
            ),
          );
        });

        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .fromTo(stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 })
          .to(left, { y: 0, duration: 0.9, stagger: 0.04 }, 0.2)
          .to(right, { y: 0, duration: 0.85, stagger: 0.035 }, 0.35)
          .fromTo(fade, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.55);

        return () => {
          intro.kill();
          loops.forEach((loop) => loop.kill());
        };
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-label="Apresentação"
      className="relative h-[calc(100svh-4.5rem)] min-h-160 overflow-hidden bg-white text-brand-dark max-md:h-auto max-md:min-h-[calc(100svh-4.5rem)]"
    >
      <div
        data-stage
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 motion-reduce:opacity-100"
      >
        <div className="absolute top-[6%] left-[-17%] w-[150%] origin-left rotate-[-14deg] max-md:top-[4%] max-md:left-[-40%] max-md:w-[190%] max-md:rotate-[-18deg]">
          {lanes.map((projects, laneIndex) => (
            <div
              key={laneIndex}
              data-lane
              className={`flex w-max items-center gap-6 py-3 max-md:gap-3 ${laneIndex === 1 ? "mt-2 ml-[8%]" : ""}`}
            >
              {[0, 1].map((copy) => (
                <div key={copy} className="flex items-center gap-6 max-md:gap-3">
                  {projects.map((project) => (
                    <img
                      key={`${copy}-${project.id}`}
                      src={project.src}
                      alt=""
                      className="h-auto w-105 rounded-lg object-contain shadow-[0_18px_40px_rgba(5,54,71,0.08)] max-md:w-105"
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.7fr)] items-end gap-5 bg-linear-to-t from-white via-white/95 to-transparent px-8 pt-28 pb-10 max-md:relative max-md:grid-cols-1 max-md:px-6 max-md:pt-89">
        <div className="max-md:contents">
          <h1 className="m-0 max-w-[19ch] text-[clamp(2.5rem,4.2vw,3.6rem)] leading-[0.9] font-[650] max-md:order-1">
            {leftWords.map((word) => (
              <span key={word} className="mr-[0.22em] inline-block overflow-hidden align-bottom">
                <span data-left className="inline-block translate-y-[110%] motion-reduce:translate-y-0">
                  {word}
                </span>
              </span>
            ))}
          </h1>
          <div data-fade className="mt-6 flex flex-wrap gap-3 opacity-0 motion-reduce:opacity-100 max-md:order-3">
            <a
              href={heroContent.primary.href}
              className="rounded-full bg-brand-dark px-5 py-2.5 text-[0.8rem] font-semibold text-white no-underline transition-colors hover:bg-brand-dark/90"
            >
              {heroContent.primary.label}
            </a>
            <a
              href={heroContent.secondary.href}
              className="rounded-full border border-brand-dark px-5 py-2.5 text-[0.8rem] font-semibold text-brand-dark no-underline transition-colors hover:bg-brand-dark/5"
            >
              {heroContent.secondary.label}
            </a>
          </div>
        </div>

        <div className="max-w-88 justify-self-end text-right max-md:order-2 max-md:justify-self-start max-md:text-left">
          <p className="mb-0 text-[1.1rem] md:text-[1.7rem] leading-[1.15] font-semibold tracking-[-0.03em] md:text-[clamp(1.35rem,2vw,1.85rem)]">
            {rightWords.map((word) => (
              <span key={word} className="mr-[0.24em] inline-block overflow-hidden align-bottom">
                <span data-right className="inline-block translate-y-[110%] motion-reduce:translate-y-0">
                  {word}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
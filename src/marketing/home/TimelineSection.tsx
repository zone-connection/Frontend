import { ScrollReveal } from "./ScrollReveal";

const STEPS = [
  {
    title: "Consultoria",
    text: "Conte com uma equipe altamente especializada para te ajudar com soluções específicas para o seu negócio.",
  },
  {
    title: "Experimente",
    text: "Experimente nossos sistemas e conheça as facilidades que eles podem oferecer para sua operação.",
  },
  {
    title: "Migração",
    text: "Auxiliamos você na migração de dados para nosso sistema, com segurança e experiência.",
  },
  {
    title: "Treinamento",
    text: "Realizamos treinamentos para adaptação ao sistema e suporte contínuo.",
  },
] as const;

export function TimelineSection() {
  return (
    <section
      id="como-trabalhamos"
      className="bg-surface-muted px-6 py-20 lg:px-12 lg:py-28"
      aria-labelledby="timeline-title"
    >
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <header className="mb-12 max-w-2xl md:mx-auto md:text-center">
            <p className="mb-3 text-xs font-semibold tracking-widest text-brand-dark uppercase">
              Nossa forma de trabalhar
            </p>
            <h2
              id="timeline-title"
              className="text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl"
            >
              Do diagnóstico ao suporte contínuo.
            </h2>
          </header>
        </ScrollReveal>

        <ol className="relative m-0 grid list-none gap-10 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* Linha horizontal (desktop) */}
          <div
            className="pointer-events-none absolute top-5 right-[12.5%] left-[12.5%] hidden h-px bg-border lg:block"
            aria-hidden
          />

          {STEPS.map((step, index) => (
            <ScrollReveal key={step.title} delay={index * 0.08}>
              <li className="relative flex flex-col items-start rounded-3xl border border-black/5 bg-white p-5 shadow-[0_14px_36px_-24px_rgba(5,54,71,0.32)] lg:items-center lg:p-6 lg:text-center">
                <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-brand-dark text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-brand-dark">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-muted sm:text-[0.95rem]">
                  {step.text}
                </p>
              </li>
            </ScrollReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

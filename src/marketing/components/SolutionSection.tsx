import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const MODULES = [
  "CRM",
  "Financeiro",
  "Imóveis",
  "Atendimento",
  "Contratos",
  "Leads",
] as const;

const SVG_WIDTH = 200;
const SVG_HEIGHT = 320;
const CONVERGE_X = SVG_WIDTH - 8;
const CONVERGE_Y = SVG_HEIGHT / 2;

function moduleY(index: number, total: number) {
  const padding = 32;
  const span = SVG_HEIGHT - padding * 2;
  return padding + (span / (total - 1)) * index;
}

function connectionPath(index: number) {
  const startY = moduleY(index, MODULES.length);
  const startX = 0;
  const cpX = CONVERGE_X * 0.45;

  return `M ${startX} ${startY} C ${cpX} ${startY}, ${CONVERGE_X - 28} ${CONVERGE_Y}, ${CONVERGE_X} ${CONVERGE_Y}`;
}

function ConvergenceLines({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="h-55 w-18 shrink-0 sm:h-72 sm:w-36 lg:h-80 lg:w-40"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      {MODULES.map((label, index) => {
        const path = connectionPath(index);
        const lineDelay = 0.25 + index * 0.1;
        const startY = moduleY(index, MODULES.length);

        return (
          <g key={label}>
            <motion.path
              d={path}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="4 5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{
                pathLength: {
                  duration: reducedMotion ? 0 : 0.9,
                  delay: lineDelay,
                  ease: "easeOut",
                },
                opacity: { duration: 0.2, delay: lineDelay },
              }}
            />

            {!reducedMotion && (
              <>
                <motion.path
                  d={path}
                  fill="none"
                  stroke="#079ed4"
                  strokeWidth={2}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0] }}
                  transition={{
                    duration: 2.4,
                    delay: lineDelay + 0.9,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                    ease: "easeInOut",
                    times: [0, 0.45, 0.55, 1],
                  }}
                />
                <motion.circle
                  r={3}
                  fill="#079ed4"
                  initial={{ cx: 0, cy: startY, opacity: 0 }}
                  animate={{
                    cx: [0, CONVERGE_X * 0.45, CONVERGE_X],
                    cy: [startY, startY, CONVERGE_Y],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2.4,
                    delay: lineDelay + 0.9 + index * 0.12,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                    ease: "easeInOut",
                  }}
                />
              </>
            )}
          </g>
        );
      })}

      <motion.circle
        cx={CONVERGE_X}
        cy={CONVERGE_Y}
        r={4}
        fill="#079ed4"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.8 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      />
    </svg>
  );
}

function PlatformHub({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      className="relative flex shrink-0 items-center justify-center"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: reducedMotion ? 0 : 0.5,
        delay: reducedMotion ? 0 : 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="relative rounded-xl bg-brand-dark px-4 py-5 text-center shadow-lg sm:rounded-2xl sm:px-8 sm:py-9 lg:px-10 lg:py-11">
        <p className="text-sm font-semibold leading-tight text-white sm:text-xl lg:text-2xl">
          Zone Connection
        </p>
        <p className="mt-0.5 text-[10px] font-medium text-brand-accent sm:mt-1 sm:text-sm">
          plataforma única
        </p>
      </div>
    </motion.div>
  );
}

function SolutionFlow({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-5 lg:gap-8 xl:gap-12">
      <div className="flex h-55 shrink-0 flex-col justify-between sm:h-70 lg:h-80">
        {MODULES.map((module, index) => (
          <motion.span
            key={module}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: reducedMotion ? 0 : index * 0.07,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              "rounded-lg bg-surface-muted text-center font-medium text-brand-dark",
              "min-w-18 px-1.5 py-1 text-[10px] leading-tight",
              "sm:min-w-28 sm:rounded-xl sm:px-4 sm:py-1.5 sm:text-xs",
              "lg:min-w-38 lg:px-5 lg:py-2 lg:text-sm xl:min-w-40 xl:text-base",
            )}
          >
            {module}
          </motion.span>
        ))}
      </div>

      <ConvergenceLines reducedMotion={reducedMotion} />

      <PlatformHub reducedMotion={reducedMotion} />
    </div>
  );
}

export function SolutionSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="bg-white px-4 py-14 sm:px-6 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10">
        <div className="flex max-w-2xl flex-col items-center gap-2 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            A solução
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Tudo converge para um único sistema inteligente.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Os módulos deixam de ser ilhas. Cada informação entra uma única vez
            e circula por toda a operação da imobiliária, em tempo real.
          </p>
        </div>

        <div className="w-full overflow-x-auto overflow-y-hidden rounded-2xl border border-border bg-white p-2 shadow-sm sm:p-3 lg:p-5">
          <div className="flex min-w-[min(100%,320px)] justify-center px-1 sm:min-w-0 sm:px-4 lg:px-6 xl:px-10">
            <SolutionFlow reducedMotion={!!reducedMotion} />
          </div>
        </div>
      </div>
    </section>
  );
}

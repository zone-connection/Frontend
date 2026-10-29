import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Cartão usado só em Melhorias, Suporte e Implantação. */
export const CENTRAL_CARD =
  "rounded-[26px] border border-[#DCE5EC] bg-white shadow-[0_8px_28px_rgba(6,48,71,0.045)] dark:border-white/10 dark:bg-card";

export const CENTRAL_FIELD =
  "h-11 rounded-[18px] border-[#DCE5EC] bg-white px-3.5 text-[13px] text-[#153047] shadow-none placeholder:text-[#8AA0B2] focus:border-[#008FD0] focus:ring-2 focus:ring-[#D3EBF5] dark:border-white/15 dark:bg-[#1c2430] dark:text-[#f8fafc]";

export const CENTRAL_AREA = cn(CENTRAL_FIELD, "h-auto min-h-[88px] py-3");

export const CENTRAL_BTN =
  "h-11 rounded-[16px] border-0 bg-[#79CCE7] px-4 text-white shadow-none hover:bg-[#5eb8d8] disabled:bg-[#C5D8E2]";

export function CentralCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn(CENTRAL_CARD, "px-6 py-6 sm:px-7 sm:py-7")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-[#063047] dark:text-[#f8fafc]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-[#60758B] dark:text-[#94a3b8]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function CentralLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs font-medium text-[#60758B]">{children}</span>;
}

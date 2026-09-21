import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NovoBadge } from "@/components/novo-badge";
import { isConfigItemNovo } from "@/lib/novidades";
import type {
  ConfigItem,
  ConfigNavModule,
  ConfigSecao,
  ConfigSelection,
} from "@/lib/config-settings-nav";

export function ConfigSettingsLayout({
  modules,
  selection,
  onChange,
  children,
}: {
  modules: ConfigNavModule[];
  selection: ConfigSelection;
  onChange: (secao: ConfigSecao, item: ConfigItem) => void;
  children: ReactNode;
}) {
  const active = modules.find((mod) => mod.id === selection.secao) ?? modules[0];
  const subitems = active?.items ?? [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <nav
        aria-label="Módulos de configuração"
        className="lg:sticky lg:top-4 lg:w-56 lg:shrink-0"
      >
        <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const selected = mod.id === selection.secao;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() =>
                  onChange(
                    mod.id,
                    selected ? selection.item : (mod.items[0]?.id ?? selection.item),
                  )
                }
                className={cn(
                  "flex min-w-36 shrink-0 items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors lg:min-w-0 lg:w-full",
                  selected
                    ? "border-black/5 bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]"
                    : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{mod.label}</span>
                  <span className="mt-0.5 hidden text-xs leading-snug text-muted-foreground lg:block">
                    {mod.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {subitems.length > 1 ? (
          <div
            role="tablist"
            aria-label="Submódulos"
            className="mb-4 flex flex-wrap gap-1 rounded-xl border bg-muted/40 p-1"
          >
            {subitems.map((it) => {
              const selected = it.id === selection.item;
              return (
                <button
                  key={it.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onChange(selection.secao, it.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {it.label}
                    {isConfigItemNovo(it.id) ? <NovoBadge compact /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

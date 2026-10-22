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
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <nav
        aria-label="Seções de configuração"
        className="lg:sticky lg:top-4 lg:w-64 lg:shrink-0"
      >
        <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const sectionOpen = mod.id === selection.secao;
            return (
              <section
                key={mod.id}
                className="min-w-52 shrink-0 rounded-2xl border border-black/5 bg-card p-2 lg:min-w-0 lg:w-full"
              >
                <div className="flex items-start gap-2.5 px-2 py-1.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{mod.label}</span>
                    <span className="mt-0.5 hidden text-xs leading-snug text-muted-foreground lg:block">
                      {mod.description}
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  {mod.items.map((it) => {
                    const selected = sectionOpen && it.id === selection.item;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        aria-current={selected ? "page" : undefined}
                        onClick={() => onChange(mod.id, it.id)}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                          selected
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{it.label}</span>
                        {isConfigItemNovo(it.id) ? <NovoBadge compact /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

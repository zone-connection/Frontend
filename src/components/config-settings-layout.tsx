import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NovoBadge } from "@/components/novo-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        <Tabs
          value={active?.id}
          onValueChange={(value) => {
            const mod = modules.find((item) => item.id === value);
            const first = mod?.items[0];
            if (!mod || !first) return;
            if (mod.id === selection.secao) return;
            onChange(mod.id, first.id);
          }}
        >
          <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <TabsTrigger key={mod.id} value={mod.id} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {mod.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {active ? (
          <nav
            aria-label={active.label}
            className="flex flex-wrap gap-1 border-b"
          >
            {active.items.map((it) => {
              const selected = it.id === selection.item;
              return (
                <button
                  key={it.id}
                  type="button"
                  aria-current={selected ? "page" : undefined}
                  onClick={() => onChange(active.id, it.id)}
                  className={cn(
                    "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                    selected
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {it.label}
                  {isConfigItemNovo(it.id) ? <NovoBadge compact /> : null}
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

import { CalendarClock, ListTodo } from "lucide-react";
import type { AtividadeProxima } from "@/lib/atividades-proximas";
import { cn } from "@/lib/utils";

export function AtividadesProximasLista({
  items,
  className,
}: {
  items: AtividadeProxima[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item) => {
        const Icon = item.origem === "agenda" ? CalendarClock : ListTodo;
        return (
          <li
            key={item.id}
            className="flex gap-3 rounded-xl border bg-card px-3 py-2.5"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{item.titulo}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.quando}
                {item.detalhe ? ` · ${item.detalhe}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

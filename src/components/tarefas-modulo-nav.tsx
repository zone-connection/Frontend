import {
  Building2,
  CalendarDays,
  Headset,
  LayoutGrid,
  ListTodo,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TarefaSecao =
  | "geral"
  | "tarefas"
  | "calendario"
  | "leads"
  | "imoveis"
  | "atendimentos";

const WORKSPACE: { id: TarefaSecao; label: string; icon: LucideIcon }[] = [
  { id: "geral", label: "Visão geral", icon: LayoutGrid },
  { id: "tarefas", label: "Minhas tarefas", icon: ListTodo },
  { id: "calendario", label: "Agenda", icon: CalendarDays },
];

const RELACIONAMENTOS: { id: TarefaSecao; label: string; icon: LucideIcon }[] = [
  { id: "leads", label: "Leads e clientes", icon: Users },
  { id: "imoveis", label: "Imóveis", icon: Building2 },
  { id: "atendimentos", label: "Atendimentos", icon: Headset },
];

export function TarefasModuloNav({
  secao,
  abertas,
  onChange,
}: {
  secao: TarefaSecao;
  abertas: number;
  onChange: (secao: TarefaSecao) => void;
}) {
  return (
    <nav className="overflow-x-auto rounded-2xl border border-primary/15 bg-linear-to-br from-primary/10 via-card to-card p-1 shadow-sm shadow-primary/5">
      <div className="flex min-w-max items-center gap-1">
        {WORKSPACE.map((item) => (
          <Item
            key={item.id}
            item={item}
            active={secao === item.id}
            badge={item.id === "tarefas" ? abertas : undefined}
            onChange={onChange}
          />
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        {RELACIONAMENTOS.map((item) => (
          <Item key={item.id} item={item} active={secao === item.id} onChange={onChange} />
        ))}
      </div>
    </nav>
  );
}

function Item({
  item,
  active,
  badge,
  onChange,
}: {
  item: { id: TarefaSecao; label: string; icon: LucideIcon };
  active: boolean;
  badge?: number;
  onChange: (secao: TarefaSecao) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onChange(item.id)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
      {badge != null ? (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs",
            active ? "bg-primary-foreground/20" : "bg-muted",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

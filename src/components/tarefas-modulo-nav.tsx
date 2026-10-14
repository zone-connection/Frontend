import {
  CalendarDays,
  ListTodo,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItemClass, SlidingNav } from "@/components/operacao-ui";

export type TarefaSecao =
  | "geral"
  | "tarefas"
  | "calendario"
  | "leads"
  | "imoveis"
  | "atendimentos";

const WORKSPACE: { id: TarefaSecao; label: string; icon: LucideIcon }[] = [
  { id: "tarefas", label: "Pendências", icon: ListTodo },
  { id: "calendario", label: "Agenda", icon: CalendarDays },
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
    <SlidingNav activeKey={secao} className="items-center">
        {WORKSPACE.map((item) => (
          <Item
            key={item.id}
            item={item}
            active={secao === item.id}
            badge={item.id === "tarefas" ? abertas : undefined}
            onChange={onChange}
          />
        ))}
    </SlidingNav>
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
      data-nav-active={active ? "true" : undefined}
      onClick={() => onChange(item.id)}
      className={navItemClass(active)}
    >
      <Icon className="size-3.5" />
      {item.label}
      {badge != null ? (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs",
            active ? "bg-white/20 text-white" : "bg-[#E7F4FA] text-[#0B3148] dark:bg-[#079ED4]/20 dark:text-[#7DD3FC]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

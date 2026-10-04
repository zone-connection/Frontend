import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { AcompanhamentoTarefa } from "@/lib/captacao-acompanhamento";
import { cn } from "@/lib/utils";

export function CaptacaoProximosPassos({
  tarefas,
  onChange,
  compact,
}: {
  tarefas: AcompanhamentoTarefa[];
  onChange: (next: AcompanhamentoTarefa[]) => void;
  compact?: boolean;
}) {
  const [novo, setNovo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");

  function salvarEdicao() {
    const titulo = editTexto.trim();
    if (!editandoId || !titulo) return;
    onChange(
      tarefas.map((item) =>
        item.id === editandoId ? { ...item, titulo } : item,
      ),
    );
    setEditandoId(null);
    setEditTexto("");
  }

  return (
    <div>
      <ul className={compact ? "space-y-2" : "space-y-2.5"}>
        {tarefas.length === 0 ? (
          <li className="text-xs text-muted-foreground">Nenhum passo ainda.</li>
        ) : (
          tarefas.map((passo) => (
            <li key={passo.id} className="flex items-start gap-1.5">
              <Checkbox
                className="mt-0.5"
                checked={passo.feita}
                onCheckedChange={(v) =>
                  onChange(
                    tarefas.map((item) =>
                      item.id === passo.id ? { ...item, feita: v === true } : item,
                    ),
                  )
                }
              />
              {editandoId === passo.id ? (
                <form
                  className="min-w-0 flex-1 space-y-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    salvarEdicao();
                  }}
                >
                  <Input
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button type="submit" size="sm" className="h-7 px-2">
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      onClick={() => {
                        setEditandoId(null);
                        setEditTexto("");
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm leading-snug",
                      passo.feita && "text-muted-foreground line-through",
                    )}
                  >
                    {passo.titulo}
                  </span>
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Editar passo"
                    onClick={() => {
                      setEditandoId(passo.id);
                      setEditTexto(passo.titulo);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                    aria-label="Excluir passo"
                    onClick={() => {
                      if (editandoId === passo.id) {
                        setEditandoId(null);
                        setEditTexto("");
                      }
                      onChange(tarefas.filter((item) => item.id !== passo.id));
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </li>
          ))
        )}
      </ul>
      <form
        className={cn(compact ? "mt-3 space-y-2" : "mt-4 flex gap-2")}
        onSubmit={(e) => {
          e.preventDefault();
          const titulo = novo.trim();
          if (!titulo) return;
          onChange([...tarefas, { id: crypto.randomUUID(), titulo, feita: false }]);
          setNovo("");
        }}
      >
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder={compact ? "Adicionar próximo passo" : "Nova tarefa"}
          className={compact ? "h-8 text-sm" : undefined}
        />
        <Button
          type="submit"
          size={compact ? "sm" : "default"}
          variant="outline"
          className={compact ? "w-full" : undefined}
        >
          <Plus className="mr-1 size-3.5" />
          {compact ? "Adicionar" : "Adicionar tarefa"}
        </Button>
      </form>
    </div>
  );
}

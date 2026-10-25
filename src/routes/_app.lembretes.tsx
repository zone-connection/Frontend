import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarClock, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { AtividadesProximasLista } from "@/components/atividades-proximas-lista";
import { PagePanel } from "@/components/page-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  fetchAtividadesProximas,
  type AtividadeProxima,
} from "@/lib/atividades-proximas";
import {
  createLembrete,
  deleteLembrete,
  fetchLembretes,
  LEMBRETE_RECORRENCIA_LABEL,
  LEMBRETE_RECORRENCIAS,
  updateLembrete,
  type LembretePessoal,
  type LembreteRecorrencia,
} from "@/lib/lembretes-api";
import { SOFT_BTN } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/lembretes")({
  head: () => ({ meta: [{ title: "Lembretes — Zone Connection" }] }),
  component: LembretesPage,
});

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function LembretesPage() {
  const [items, setItems] = useState<LembretePessoal[]>([]);
  const [atividades, setAtividades] = useState<AtividadeProxima[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LembretePessoal | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [recorrencia, setRecorrencia] = useState<LembreteRecorrencia>("sempre");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lista, proxima] = await Promise.all([
        fetchLembretes().catch((err) => {
          if (!(err instanceof ApiError && err.status >= 500)) {
            toast.error(
              errorMessage(err, "Não foi possível carregar os lembretes."),
            );
          }
          return [] as LembretePessoal[];
        }),
        fetchAtividadesProximas().catch(() => [] as AtividadeProxima[]),
      ]);
      setItems(lista);
      setAtividades(proxima);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível carregar os lembretes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setTitulo("");
    setDescricao("");
    setRecorrencia("sempre");
    setDialogOpen(true);
  }

  function openEdit(item: LembretePessoal) {
    setEditing(item);
    setTitulo(item.titulo);
    setDescricao(item.descricao);
    setRecorrencia(item.recorrencia);
    setDialogOpen(true);
  }

  async function save() {
    const nome = titulo.trim();
    if (!nome) {
      toast.error("Informe o título do lembrete.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateLembrete(editing.id, {
          titulo: nome,
          descricao: descricao.trim(),
          recorrencia,
        });
        toast.success("Lembrete atualizado.");
      } else {
        await createLembrete({
          titulo: nome,
          descricao: descricao.trim(),
          recorrencia,
        });
        toast.success("Lembrete criado. Ele aparece na próxima entrada.");
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar o lembrete."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(item: LembretePessoal, ativo: boolean) {
    try {
      await updateLembrete(item.id, { ativo });
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, ativo } : row)),
      );
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível atualizar o lembrete."));
    }
  }

  async function remove(item: LembretePessoal) {
    if (!window.confirm(`Excluir o lembrete “${item.titulo}”?`)) return;
    try {
      await deleteLembrete(item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      toast.success("Lembrete excluído.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível excluir o lembrete."));
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader
        title="Lembretes"
        description="Avisos ao entrar no CRM e as atividades dos próximos dias."
        actions={
          <Button type="button" onClick={openCreate} className={cn("h-8 text-xs", SOFT_BTN)}>
            <Plus className="h-4 w-4" />
            Novo lembrete
          </Button>
        }
      />

      <PagePanel
        title="Atividades próximas"
        description="Agenda e tarefas de hoje até os próximos 7 dias."
      >
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : atividades.length === 0 ? (
          <div className="flex items-start gap-2 py-2 text-sm text-muted-foreground">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
            Nenhuma atividade próxima.
          </div>
        ) : (
          <AtividadesProximasLista items={atividades} />
        )}
      </PagePanel>

      <PagePanel title="Meus lembretes" className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/70" />
            <p className="mt-3 text-sm font-medium">Nenhum lembrete ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um aviso para ver na próxima vez que entrar no sistema.
            </p>
            <Button type="button" className="mt-4" onClick={openCreate}>
              Criar lembrete
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.titulo}</p>
                    {!item.ativo ? (
                      <Badge variant="secondary">Pausado</Badge>
                    ) : null}
                  </div>
                  {item.descricao.trim() ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {item.descricao}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {LEMBRETE_RECORRENCIA_LABEL[item.recorrencia]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={item.ativo}
                    onCheckedChange={(value) => void toggleAtivo(item, value)}
                    aria-label={item.ativo ? "Pausar lembrete" : "Ativar lembrete"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(item)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void remove(item)}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PagePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lembrete" : "Novo lembrete"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="lembrete-titulo">Título</Label>
              <Input
                id="lembrete-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={120}
                placeholder="Ex.: Ligar para o cartório"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lembrete-desc">Descrição (opcional)</Label>
              <Textarea
                id="lembrete-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={2000}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quando mostrar</Label>
              <Select
                value={recorrencia}
                onValueChange={(value) => setRecorrencia(value as LembreteRecorrencia)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEMBRETE_RECORRENCIAS.map((opcao) => (
                    <SelectItem key={opcao} value={opcao}>
                      {LEMBRETE_RECORRENCIA_LABEL[opcao]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

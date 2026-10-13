import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  createDocumentoTag,
  fetchDocumentoTags,
  updateDocumentoTag,
  type DocumentoTag,
} from "@/lib/arquivos-api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function DocumentoTagsCatalogPanel() {
  const gestor =
    getSession()?.role === "admin" ||
    getSession()?.role === "gerente" ||
    getSession()?.role === "super_admin";
  const [items, setItems] = useState<DocumentoTag[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [edit, setEdit] = useState<DocumentoTag | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchDocumentoTags(true, q));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar as tags.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return items;
    return items.filter((t) => t.nome.toLowerCase().includes(n));
  }, [items, q]);

  async function salvarNovo() {
    try {
      await createDocumentoTag(nome);
      toast.success("Tag cadastrada.");
      setOpen(false);
      setNome("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    }
  }

  async function salvarEdit() {
    if (!edit) return;
    try {
      await updateDocumentoTag(edit.id, { nome: edit.nome });
      toast.success("Tag atualizada.");
      setEdit(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tags reutilizadas nos PDFs de leads, clientes, imóveis, tarefas, vendas e
        propostas. Inativar preserva o histórico dos arquivos já marcados.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Pesquisar por nome"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        {gestor ? (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            Nova tag
          </Button>
        ) : null}
      </div>
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {filtered.map((tag) => (
            <li key={tag.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{tag.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {tag.active ? "Ativa" : "Inativa"}
                  {tag._count ? ` · ${tag._count.arquivos} uso(s)` : ""}
                </p>
              </div>
              {gestor ? (
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEdit(tag)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void updateDocumentoTag(tag.id, { active: !tag.active }).then(
                        () => load(),
                      );
                    }}
                  >
                    {tag.active ? "Inativar" : "Ativar"}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tag de documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void salvarNovo()}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(edit)} onOpenChange={() => setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              value={edit?.nome ?? ""}
              onChange={(e) =>
                setEdit((cur) => (cur ? { ...cur, nome: e.target.value } : cur))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void salvarEdit()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

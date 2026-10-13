import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  deleteArquivo,
  downloadArquivoFile,
  downloadArquivosZip,
  fetchArquivos,
  fetchDocumentoTags,
  previewArquivo,
  saveBlob,
  shareArquivos,
  updateArquivo,
  uploadArquivo,
  type ArquivoCategoria,
  type ArquivoDocumento,
  type ArquivoVinculoTipo,
  type DocumentoTag,
} from "@/lib/arquivos-api";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Loader2,
  Mail,
  Plus,
  Trash2,
} from "lucide-react";

function canGestor() {
  const role = getSession()?.role;
  return role === "admin" || role === "gerente" || role === "super_admin";
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function DocumentosPanel({
  entityType,
  entityId,
  categoria = "outro",
  extraVinculo,
  related,
  title = "Documentos",
  allowUpload = true,
}: {
  entityType: ArquivoVinculoTipo;
  entityId: string;
  categoria?: ArquivoCategoria;
  extraVinculo?: { entityType: ArquivoVinculoTipo; entityId: string };
  related?: { entityType: ArquivoVinculoTipo; entityId: string; label: string };
  title?: string;
  allowUpload?: boolean;
}) {
  const gestor = canGestor();
  const [items, setItems] = useState<ArquivoDocumento[]>([]);
  const [relatedItems, setRelatedItems] = useState<ArquivoDocumento[]>([]);
  const [tags, setTags] = useState<DocumentoTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState("");

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [list, catalog] = await Promise.all([
        fetchArquivos({ entityType, entityId, categoria }),
        fetchDocumentoTags(false),
      ]);
      setItems(list);
      setTags(catalog);
      if (related?.entityId) {
        const extra = await fetchArquivos({
          entityType: related.entityType,
          entityId: related.entityId,
        });
        setRelatedItems(extra.filter((d) => !list.some((x) => x.id === d.id)));
      } else {
        setRelatedItems([]);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar os documentos.",
      );
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, categoria, related?.entityId, related?.entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!filterTag) return items;
    return items.filter((item) =>
      item.tags.some((t) => t.nome.toLowerCase().includes(filterTag.toLowerCase())),
    );
  }, [items, filterTag]);

  async function enviar() {
    if (!file) {
      toast.error("Selecione um PDF.");
      return;
    }
    if (tagIds.length === 0) {
      toast.error("Selecione pelo menos uma tag.");
      return;
    }
    setBusy(true);
    try {
      await uploadArquivo({
        file,
        entityType,
        entityId,
        nome: nome.trim() || file.name.replace(/\.pdf$/i, ""),
        categoria,
        tagIds,
        extraEntityType: extraVinculo?.entityType,
        extraEntityId: extraVinculo?.entityId,
      });
      toast.success("Documento enviado.");
      setOpen(false);
      setFile(null);
      setNome("");
      setTagIds([]);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha no envio.");
    } finally {
      setBusy(false);
    }
  }

  async function criarTag() {
    const nomeTag = newTag.trim();
    if (!nomeTag) return;
    setBusy(true);
    try {
      const tag = await createDocumentoTag(nomeTag);
      setTags((cur) => [...cur, tag].sort((a, b) => a.nome.localeCompare(b.nome)));
      setTagIds((cur) => [...cur, tag.id]);
      setNewTag("");
      toast.success("Tag criada.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível criar a tag.");
    } finally {
      setBusy(false);
    }
  }

  async function baixar(id: string) {
    try {
      const { blob, filename } = await downloadArquivoFile(id);
      saveBlob(blob, filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha no download.");
    }
  }

  async function ver(id: string) {
    try {
      const { url } = await previewArquivo(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível abrir o PDF.");
    }
  }

  async function excluir(id: string) {
    try {
      await deleteArquivo(id, entityType, entityId);
      toast.success("Documento removido.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível excluir.");
    }
  }

  async function zip() {
    setBusy(true);
    try {
      const { blob, filename } = await downloadArquivosZip({
        entityType,
        entityId,
        ids: selected.size ? [...selected] : undefined,
      });
      saveBlob(blob, filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao gerar o ZIP.");
    } finally {
      setBusy(false);
    }
  }

  async function enviarEmail() {
    if (!email.trim()) {
      toast.error("Informe o e-mail.");
      return;
    }
    setBusy(true);
    try {
      const result = await shareArquivos({
        entityType,
        entityId,
        email: email.trim(),
        ids: selected.size ? [...selected] : undefined,
        all: selected.size === 0,
      });
      toast.success(
        result.method === "link"
          ? "Link enviado por e-mail."
          : "Documentos enviados por e-mail.",
      );
      setShareOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha no envio.");
    } finally {
      setBusy(false);
    }
  }

  async function salvarTags(id: string, next: string[]) {
    try {
      await updateArquivo(id, { tagIds: next });
      await load();
      setEditId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar as tags.");
    }
  }

  function toggleTag(id: string) {
    setTagIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4" />
          {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          {gestor ? (
            <>
              <Button type="button" size="sm" variant="outline" disabled={busy || items.length === 0} onClick={() => void zip()}>
                <Download className="mr-1 h-3.5 w-3.5" />
                Baixar todos
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={items.length === 0} onClick={() => setShareOpen(true)}>
                <Mail className="mr-1 h-3.5 w-3.5" />
                E-mail
              </Button>
            </>
          ) : null}
          {allowUpload ? (
            <Button type="button" size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Enviar PDF
            </Button>
          ) : null}
        </div>
      </div>
      <Input
        placeholder="Filtrar por tag"
        value={filterTag}
        onChange={(e) => setFilterTag(e.target.value)}
        className="h-8 max-w-xs"
      />
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando documentos…
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum PDF nesta seção.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <div className="min-w-0 space-y-1">
                <label className="flex items-center gap-2 font-medium">
                  {gestor ? (
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => {
                        setSelected((cur) => {
                          const next = new Set(cur);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                    />
                  ) : null}
                  {item.nome}
                </label>
                <p className="text-xs text-muted-foreground">
                  {formatWhen(item.createdAt)}
                  {item.uploadedBy ? ` · ${item.uploadedBy.name}` : ""}
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-[10px]">
                      {tag.nome}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => void ver(item.id)}>
                  Ver
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void baixar(item.id)}>
                  Baixar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(item.id)}>
                  Tags
                </Button>
                {allowUpload ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => void excluir(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              {editId === item.id ? (
                <div className="w-full space-y-2 border-t pt-2">
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => {
                      const on = item.tags.some((t) => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => {
                            const next = on
                              ? item.tags.filter((t) => t.id !== tag.id).map((t) => t.id)
                              : [...item.tags.map((t) => t.id), tag.id];
                            void salvarTags(item.id, next);
                          }}
                        >
                          {tag.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {related && relatedItems.length > 0 ? (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Relacionados a {related.label}
          </p>
          <ul className="space-y-1 text-sm">
            {relatedItems.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span>
                  {item.nome}{" "}
                  {item.tags.map((t) => (
                    <Badge key={t.id} variant="outline" className="ml-1 text-[10px]">
                      {t.nome}
                    </Badge>
                  ))}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => void ver(item.id)}>
                  Ver
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Arquivo (PDF, máx. 5 MB)</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1">
              <Label>Nome do documento</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: RG frente e verso" />
            </div>
            <div className="space-y-1">
              <Label>Tags (obrigatório)</Label>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`rounded-full border px-2 py-0.5 text-xs ${tagIds.includes(tag.id) ? "bg-primary text-primary-foreground" : ""}`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.nome}
                  </button>
                ))}
              </div>
              {gestor ? (
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Criar nova tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={() => void criarTag()} disabled={busy}>
                    Criar
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void enviar()} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar por e-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Destinatário</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
            <p className="text-xs text-muted-foreground">
              {selected.size
                ? `${selected.size} documento(s) selecionado(s).`
                : "Todos os documentos autorizados deste registro."}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShareOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void enviarEmail()} disabled={busy}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

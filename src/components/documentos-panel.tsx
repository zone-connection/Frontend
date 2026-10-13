import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
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
import { SOFT_BTN, SOFT_BTN_ACTIVE } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Tags,
  Trash2,
  Upload,
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

function formatBytes(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TagChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "border-[#079ED4] bg-[#E7F4FA] text-[#0B3148] dark:border-[#079ED4]/60 dark:bg-[#079ED4]/20 dark:text-[#E7F4FA]"
          : "border-[#E2E8EC] bg-white text-[#16324A] hover:border-[#B7D7E6] hover:bg-[#F3FAFD] dark:border-white/15 dark:bg-[#1c2430] dark:text-[#f8fafc]",
      )}
    >
      {children}
    </button>
  );
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
  const fileRef = useRef<HTMLInputElement>(null);
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
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os documentos.",
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
      item.tags.some((t) =>
        t.nome.toLowerCase().includes(filterTag.toLowerCase()),
      ),
    );
  }, [items, filterTag]);

  function pickFile(next: File | null) {
    setFile(next);
    if (next && !nome.trim()) {
      setNome(next.name.replace(/\.pdf$/i, ""));
    }
  }

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
      setTags((cur) =>
        [...cur, tag].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      setTagIds((cur) => [...cur, tag.id]);
      setNewTag("");
      toast.success("Tag criada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível criar a tag.",
      );
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
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível abrir o PDF.",
      );
    }
  }

  async function excluir(id: string) {
    try {
      await deleteArquivo(id, entityType, entityId);
      toast.success("Documento removido.");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
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
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível atualizar as tags.",
      );
    }
  }

  function toggleTag(id: string) {
    setTagIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0B3148] dark:text-[#E7F4FA]">
          <span className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-white text-primary dark:border-white/10 dark:bg-[#1c2430]">
            <FileText className="h-4 w-4" />
          </span>
          {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          {gestor ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={SOFT_BTN}
                disabled={busy || items.length === 0}
                onClick={() => void zip()}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Baixar todos
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={SOFT_BTN}
                disabled={items.length === 0}
                onClick={() => setShareOpen(true)}
              >
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
        className="h-9 max-w-xs"
      />
      {loading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Carregando documentos…
        </p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] px-4 py-8 text-center">
          <FileText className="h-6 w-6 text-primary/70" />
          <p className="text-sm font-medium">Nenhum PDF nesta seção</p>
          <p className="text-xs text-muted-foreground">
            {allowUpload
              ? "Envie o PDF e marque as tags do documento."
              : "Os arquivos cadastrados no processo aparecem aqui."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-primary/[0.04] px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    {gestor ? (
                      <input
                        type="checkbox"
                        className="accent-[#079ED4]"
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
                    {item.bytes ? ` · ${formatBytes(item.bytes)}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-[#079ED4]/30 bg-[#E7F4FA] px-2 py-0.5 text-[10px] font-medium text-[#0B3148] dark:border-[#079ED4]/40 dark:bg-[#079ED4]/15 dark:text-[#E7F4FA]"
                      >
                        {tag.nome}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={SOFT_BTN}
                    onClick={() => void ver(item.id)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Ver
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={SOFT_BTN}
                    onClick={() => void baixar(item.id)}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Baixar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={editId === item.id ? SOFT_BTN_ACTIVE : SOFT_BTN}
                    onClick={() =>
                      setEditId((cur) => (cur === item.id ? null : item.id))
                    }
                  >
                    <Tags className="mr-1 h-3.5 w-3.5" />
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
              </div>
              {editId === item.id ? (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-primary/10 pt-3">
                  {tags.map((tag) => {
                    const on = item.tags.some((t) => t.id === tag.id);
                    return (
                      <TagChip
                        key={tag.id}
                        active={on}
                        onClick={() => {
                          const next = on
                            ? item.tags
                                .filter((t) => t.id !== tag.id)
                                .map((t) => t.id)
                            : [...item.tags.map((t) => t.id), tag.id];
                          void salvarTags(item.id, next);
                        }}
                      >
                        {tag.nome}
                      </TagChip>
                    );
                  })}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {related && relatedItems.length > 0 ? (
        <div className="space-y-2 border-t border-primary/10 pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Relacionados a {related.label}
          </p>
          <ul className="space-y-1 text-sm">
            {relatedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-primary/10 px-3 py-2"
              >
                <span>
                  {item.nome}{" "}
                  {item.tags.map((t) => (
                    <span
                      key={t.id}
                      className="ml-1 rounded-full border border-[#079ED4]/30 bg-[#E7F4FA] px-2 py-0.5 text-[10px] text-[#0B3148] dark:bg-[#079ED4]/15 dark:text-[#E7F4FA]"
                    >
                      {t.nome}
                    </span>
                  ))}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={SOFT_BTN}
                  onClick={() => void ver(item.id)}
                >
                  Ver
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <FormDialogShell
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setFile(null);
            setNome("");
            setTagIds([]);
          }
        }}
        icon={<Upload className="h-5 w-5" />}
        title="Enviar PDF"
        description="Arquivo em PDF, até 5 MB. Escolha as tags do documento."
        footer={
          <FormDialogActions hint="As tags ajudam o gerente a identificar o que falta.">
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void enviar()} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              Enviar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection
            icon={<FileText className="h-4 w-4" />}
            title="Arquivo"
            description="Somente PDF, no máximo 5 MB."
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] px-4 py-8 text-center transition hover:border-primary/50 hover:bg-primary/[0.07]"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-white text-primary shadow-sm dark:bg-[#1c2430]">
                <Upload className="h-5 w-5" />
              </span>
              {file ? (
                <>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} · clique para trocar
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    Clique para escolher o PDF
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ou selecione o arquivo no computador
                  </p>
                </>
              )}
            </button>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome do documento</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: RG frente e verso"
              />
            </div>
          </FormSection>
          <FormSection
            icon={<Tags className="h-4 w-4" />}
            title="Tags"
            description="Obrigatório. Marque o tipo do documento."
          >
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  active={tagIds.includes(tag.id)}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.nome}
                </TagChip>
              ))}
            </div>
            {gestor ? (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Input
                  placeholder="Criar nova tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void criarTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className={SOFT_BTN}
                  onClick={() => void criarTag()}
                  disabled={busy}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Criar
                </Button>
              </div>
            ) : null}
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={shareOpen}
        onOpenChange={setShareOpen}
        icon={<Mail className="h-5 w-5" />}
        title="Compartilhar por e-mail"
        description="O destinatário recebe os PDFs ou um link temporário."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setShareOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void enviarEmail()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-1 h-4 w-4" />
              )}
              Enviar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection
            icon={<Mail className="h-4 w-4" />}
            title="Destinatário"
            description={
              selected.size
                ? `${selected.size} documento(s) selecionado(s).`
                : "Todos os documentos autorizados deste registro."
            }
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}

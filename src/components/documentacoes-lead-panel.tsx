import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentosPanel } from "@/components/documentos-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  deleteArquivo,
  downloadArquivoFile,
  downloadArquivosZip,
  fetchArquivos,
  previewArquivo,
  saveBlob,
  shareArquivos,
  type ArquivoCategoria,
  type ArquivoDocumento,
  type ArquivoVinculoTipo,
} from "@/lib/arquivos-api";
import { cn } from "@/lib/utils";
import { SOFT_BTN } from "@/lib/soft-btn";
import {
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
  FILTER_VISTA_BTN,
  FILTER_VISTA_BTN_ACTIVE,
  FILTER_VISTA_WRAP,
} from "@/lib/filter-bar";

const PAGE_SIZE = 9;

const CATEGORIA_LABEL: Record<ArquivoCategoria, string> = {
  ficha: "Ficha",
  proposta: "Propostas",
  outro: "Outros arquivos",
};

const CATEGORIA_PILL: Record<ArquivoCategoria, string> = {
  ficha: "bg-[#E7F1FF] text-[#2563EB]",
  proposta: "bg-[#F3E8FF] text-[#7C3AED]",
  outro: "bg-[#E7F8EE] text-[#16A34A]",
};

function canGestor() {
  const role = getSession()?.role;
  return role === "admin" || role === "gerente" || role === "super_admin";
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString("pt-BR");
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function fileKind(item: ArquivoDocumento) {
  const name = `${item.nomeOriginal} ${item.nome}`.toLowerCase();
  const mime = (item.mime || "").toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    return { label: "PDF", className: "bg-[#FDECEC] text-[#E11D48]" };
  }
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(name)) {
    return { label: "JPG", className: "bg-[#E7F1FF] text-[#2563EB]" };
  }
  if (name.endsWith(".xls") || name.endsWith(".xlsx") || mime.includes("sheet")) {
    return { label: "XLS", className: "bg-[#E7F8EE] text-[#16A34A]" };
  }
  return { label: "ARQ", className: "bg-[#F1F5F9] text-[#475569]" };
}

type DocRow = ArquivoDocumento & { escopo: "proprio" | "relacionado" };

export function DocumentacoesLeadPanel({
  leadId,
  entityType = "lead",
  entityId,
  extraVinculo,
  related,
  descricao = "Arquivos e documentos vinculados a este lead.",
  onActivity,
}: {
  leadId?: string;
  entityType?: ArquivoVinculoTipo;
  entityId?: string;
  extraVinculo?: { entityType: ArquivoVinculoTipo; entityId: string };
  related?: { entityType: ArquivoVinculoTipo; entityId: string; label: string };
  descricao?: string;
  onActivity?: () => void;
}) {
  const alvoId = entityId ?? leadId ?? "";
  const gestor = canGestor();
  const [items, setItems] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<"todas" | ArquivoCategoria>("todas");
  const [vista, setVista] = useState<"lista" | "categorias">("lista");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [uploadNonce, setUploadNonce] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const proprios = await fetchArquivos({ entityType, entityId: alvoId });
      const base = proprios.map((item) => ({ ...item, escopo: "proprio" as const }));
      if (related?.entityId) {
        const extras = await fetchArquivos({
          entityType: related.entityType,
          entityId: related.entityId,
        });
        const relacionados = extras
          .filter((item) => !proprios.some((own) => own.id === item.id))
          .map((item) => ({ ...item, escopo: "relacionado" as const }));
        setItems([...base, ...relacionados]);
      } else {
        setItems(base);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar os documentos.",
      );
    } finally {
      setLoading(false);
    }
  }, [entityType, alvoId, related?.entityId, related?.entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((item) => {
      if (categoria !== "todas" && item.categoria !== categoria) return false;
      if (!q) return true;
      return item.nome.toLowerCase().includes(q) || item.nomeOriginal.toLowerCase().includes(q);
    });
  }, [items, busca, categoria]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pagina = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const todosMarcados = pagina.length > 0 && pagina.every((item) => selected.has(item.id));

  useEffect(() => {
    setPage(1);
  }, [busca, categoria, vista]);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePagina() {
    setSelected((cur) => {
      const next = new Set(cur);
      if (todosMarcados) pagina.forEach((item) => next.delete(item.id));
      else pagina.forEach((item) => next.add(item.id));
      return next;
    });
  }

  async function baixar(id: string) {
    try {
      const { blob, filename } = await downloadArquivoFile(id);
      saveBlob(blob, filename);
      onActivity?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha no download.");
    }
  }

  async function ver(id: string) {
    try {
      const { url } = await previewArquivo(id);
      window.open(url, "_blank", "noopener,noreferrer");
      onActivity?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível abrir o arquivo.");
    }
  }

  async function excluir(arquivoId: string) {
    try {
      await deleteArquivo(arquivoId, entityType, alvoId);
      toast.success("Arquivo removido.");
      setSelected((cur) => {
        const next = new Set(cur);
        next.delete(arquivoId);
        return next;
      });
      onActivity?.();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível excluir.");
    }
  }

  async function baixarSelecionados() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const { blob, filename } = await downloadArquivosZip({
        entityType,
        entityId: alvoId,
        ids: [...selected],
      });
      saveBlob(blob, filename);
      onActivity?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao baixar os arquivos.");
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
      await shareArquivos({
        entityType,
        entityId: alvoId,
        email: email.trim(),
        ids: selected.size ? [...selected] : undefined,
        all: selected.size === 0,
      });
      toast.success("Documentos enviados por e-mail.");
      setShareOpen(false);
      setEmail("");
      onActivity?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha no envio.");
    } finally {
      setBusy(false);
    }
  }

  const grupos = (["ficha", "proposta", "outro"] as const)
    .map((id) => ({
      id,
      label: CATEGORIA_LABEL[id],
      items: filtrados.filter((item) => item.categoria === id),
    }))
    .filter((grupo) => grupo.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#0B3148] dark:text-[#E7F4FA]">
            <FileText className="h-5 w-5 text-[#079ED4]" />
            Documentações
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {descricao}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome do documento..."
            className={cn("pl-9", FILTER_CONTROL)}
          />
        </div>
        <Select value={categoria} onValueChange={(value) => setCategoria(value as typeof categoria)}>
          <SelectTrigger className={cn("w-[190px]", FILTER_CONTROL)}>
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            <SelectItem value="ficha">Ficha</SelectItem>
            <SelectItem value="proposta">Propostas</SelectItem>
            <SelectItem value="outro">Outros arquivos</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          className="h-9 rounded-lg bg-[#079ED4] px-3 text-white hover:bg-[#05749E]"
          onClick={() => setUploadNonce((n) => n + 1)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Enviar arquivo
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={FILTER_VISTA_WRAP}>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5",
              FILTER_VISTA_BTN,
              vista === "lista" && FILTER_VISTA_BTN_ACTIVE,
            )}
            onClick={() => setVista("lista")}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5",
              FILTER_VISTA_BTN,
              vista === "categorias" && FILTER_VISTA_BTN_ACTIVE,
            )}
            onClick={() => setVista("categorias")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Categorias
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#5C6B76]">
          <span className="rounded-full bg-[#E7F4FA] px-2.5 py-1 text-xs font-medium text-[#05749E]">
            {selected.size} selecionados
          </span>
          {gestor ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={SOFT_BTN}
                disabled={busy || selected.size === 0}
                onClick={() => void baixarSelecionados()}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Baixar selecionados
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={SOFT_BTN}
                disabled={items.length === 0}
                onClick={() => setShareOpen(true)}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Enviar por e-mail
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando documentos…
        </p>
      ) : vista === "categorias" ? (
        <div className="space-y-4">
          {grupos.length === 0 ? (
            <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Nenhum documento encontrado.
            </p>
          ) : (
            grupos.map((grupo) => (
              <section key={grupo.id} className="overflow-hidden rounded-xl border bg-card">
                <h3 className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold">
                  {grupo.label} ({grupo.items.length})
                </h3>
                <Tabela
                  rows={grupo.items}
                  selected={selected}
                  onToggle={toggle}
                  onToggleAll={() => {
                    setSelected((cur) => {
                      const next = new Set(cur);
                      const all = grupo.items.every((item) => next.has(item.id));
                      grupo.items.forEach((item) => {
                        if (all) next.delete(item.id);
                        else next.add(item.id);
                      });
                      return next;
                    });
                  }}
                  allChecked={grupo.items.every((item) => selected.has(item.id))}
                  onDownload={(id) => void baixar(id)}
                  onView={(id) => void ver(id)}
                  onDelete={(id) => void excluir(id)}
                />
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Tabela
            rows={pagina}
            selected={selected}
            onToggle={toggle}
            onToggleAll={togglePagina}
            allChecked={todosMarcados}
            onDownload={(id) => void baixar(id)}
            onView={(id) => void ver(id)}
            onDelete={(id) => void excluir(id)}
          />
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              Mostrando {pagina.length} de {filtrados.length} documentos
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-6 text-center font-medium text-foreground">{page}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        <DocumentosPanel
          entityType={entityType}
          entityId={alvoId}
          categoria="outro"
          title="Arquivos"
          allowUpload
          extraVinculo={extraVinculo}
          uploadNonce={uploadNonce}
          onActivity={() => {
            onActivity?.();
            void load();
          }}
        />
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar por e-mail</DialogTitle>
            <DialogDescription>
              {selected.size
                ? `${selected.size} arquivo(s) selecionado(s) seguem para o endereço informado.`
                : "Os documentos deste cadastro seguem para o endereço informado."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="doc-share-email">E-mail</Label>
            <Input
              id="doc-share-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nome@email.com"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShareOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={() => void enviarEmail()}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tabela({
  rows,
  selected,
  allChecked,
  onToggle,
  onToggleAll,
  onDownload,
  onView,
  onDelete,
}: {
  rows: DocRow[];
  selected: Set<string>;
  allChecked: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onDownload: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum documento encontrado.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-[#F8FAFC] text-left text-xs text-muted-foreground dark:bg-[#1c2430]">
          <tr>
            <th className="w-10 px-3 py-2.5 font-medium">
              <Checkbox checked={allChecked} onCheckedChange={onToggleAll} aria-label="Selecionar página" />
            </th>
            <th className="px-2 py-2.5 font-medium">Nome do documento</th>
            <th className="px-2 py-2.5 font-medium">Categoria</th>
            <th className="px-2 py-2.5 font-medium">Data de envio</th>
            <th className="px-3 py-2.5 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const kind = fileKind(item);
            return (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2.5">
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={() => onToggle(item.id)}
                    aria-label={`Selecionar ${item.nome}`}
                  />
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[9px] font-bold",
                        kind.className,
                      )}
                    >
                      {kind.label}
                    </span>
                    <span className="truncate font-medium">{item.nome}</span>
                    {item.escopo === "relacionado" ? (
                      <span className="rounded-full bg-[#E7F4FA] px-1.5 py-0.5 text-[10px] font-medium text-[#05749E]">
                        Lead / cliente
                      </span>
                    ) : null}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {kind.label}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", CATEGORIA_PILL[item.categoria])}>
                    {CATEGORIA_LABEL[item.categoria]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">
                  {formatWhen(item.createdAt)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-[#079ED4]"
                      aria-label={`Baixar ${item.nome}`}
                      onClick={() => onDownload(item.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Mais ações">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(item.id)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDownload(item.id)}>
                          <Download className="mr-2 h-4 w-4" /> Baixar
                        </DropdownMenuItem>
                        {item.categoria === "outro" && item.escopo === "proprio" ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

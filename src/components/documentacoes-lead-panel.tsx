import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentosPanel } from "@/components/documentos-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  downloadArquivoFile,
  downloadArquivosZip,
  fetchArquivos,
  previewArquivo,
  saveBlob,
  shareArquivos,
  deleteArquivo,
  type ArquivoCategoria,
  type ArquivoDocumento,
} from "@/lib/arquivos-api";
import { cn } from "@/lib/utils";

type Filtro = "todos" | ArquivoCategoria;

const GRUPOS: { id: ArquivoCategoria; label: string; badge: string }[] = [
  { id: "ficha", label: "Ficha", badge: "Ficha" },
  { id: "proposta", label: "Propostas", badge: "Proposta" },
  { id: "outro", label: "Outros arquivos", badge: "Outros arquivos" },
];

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

export function DocumentacoesLeadPanel({
  leadId,
  onActivity,
}: {
  leadId: string;
  onActivity?: () => void;
}) {
  const gestor = canGestor();
  const [items, setItems] = useState<ArquivoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    ficha: true,
    proposta: true,
    outro: true,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [uploadNonce, setUploadNonce] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchArquivos({ entityType: "lead", entityId: leadId });
      setItems(list);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar os documentos.",
      );
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const ficha = items.filter((item) => item.categoria === "ficha").length;
    const proposta = items.filter((item) => item.categoria === "proposta").length;
    const outro = items.filter((item) => item.categoria === "outro").length;
    return { todos: items.length, ficha, proposta, outro };
  }, [items]);

  const grupos = GRUPOS.filter((grupo) => filtro === "todos" || filtro === grupo.id);

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

  async function excluir(id: string) {
    try {
      await deleteArquivo(id, "lead", leadId);
      toast.success("Arquivo removido.");
      onActivity?.();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível excluir.");
    }
  }

  async function baixarTodos() {
    setBusy(true);
    try {
      const { blob, filename } = await downloadArquivosZip({
        entityType: "lead",
        entityId: leadId,
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
        entityType: "lead",
        entityId: leadId,
        email: email.trim(),
        all: true,
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#0B3148] dark:text-[#E7F4FA]">
          <FileText className="h-5 w-5 text-[#079ED4]" />
          Documentações
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Centralize e gerencie os documentos deste cadastro.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ResumoCard
          icon={FileText}
          label="Documentos"
          value={counts.todos}
          active={filtro === "todos"}
          onClick={() => setFiltro("todos")}
        />
        <ResumoCard
          icon={FileText}
          label="Ficha"
          value={counts.ficha}
          active={filtro === "ficha"}
          onClick={() => setFiltro("ficha")}
        />
        <ResumoCard
          icon={FileText}
          label="Propostas"
          value={counts.proposta}
          active={filtro === "proposta"}
          onClick={() => setFiltro("proposta")}
        />
        <ResumoCard
          icon={Paperclip}
          label="Arquivos"
          value={counts.outro}
          active={filtro === "outro"}
          onClick={() => setFiltro("outro")}
        />
      </div>

      <section className="rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Documentos do processo</h3>
            <p className="text-xs text-muted-foreground">
              Ficha e propostas vinculadas ao módulo de Processos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {gestor ? (
              <Button
                type="button"
                size="sm"
                className="h-9 bg-[#2563EB] px-3 text-white hover:bg-[#1D4ED8]"
                disabled={busy || items.length === 0}
                onClick={() => void baixarTodos()}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Baixar todos
              </Button>
            ) : null}
            {gestor ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9"
                disabled={items.length === 0}
                onClick={() => setShareOpen(true)}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Enviar por e-mail
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => setUploadNonce((n) => n + 1)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Enviar arquivo
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["todos", "Todos"],
              ["ficha", "Ficha"],
              ["proposta", "Propostas"],
              ["outro", "Outros arquivos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium transition",
                filtro === id
                  ? "bg-[#2563EB] text-white"
                  : "border bg-background text-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando documentos…
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {grupos.map((grupo) => {
              const lista = items.filter((item) => item.categoria === grupo.id);
              const aberto = openGroups[grupo.id] !== false;
              const mostraTudo = expanded[grupo.id] === true;
              const visiveis = mostraTudo ? lista : lista.slice(0, 4);
              const resto = lista.length - visiveis.length;
              return (
                <div key={grupo.id} className="overflow-hidden rounded-xl border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 bg-muted/30 px-3 py-2.5 text-left"
                    onClick={() =>
                      setOpenGroups((cur) => ({ ...cur, [grupo.id]: !aberto }))
                    }
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {grupo.id === "outro" ? (
                        <Paperclip className="h-4 w-4 text-[#079ED4]" />
                      ) : (
                        <FileText className="h-4 w-4 text-[#079ED4]" />
                      )}
                      {grupo.label}
                      <span className="font-normal text-muted-foreground">
                        ({lista.length})
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition",
                        !aberto && "-rotate-90",
                      )}
                    />
                  </button>
                  {aberto ? (
                    lista.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Nenhum arquivo nesta seção.
                      </p>
                    ) : (
                      <ul>
                        {visiveis.map((item) => {
                          const kind = fileKind(item);
                          return (
                            <li
                              key={item.id}
                              className="flex items-center gap-3 border-t px-3 py-2.5"
                            >
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold",
                                  kind.className,
                                )}
                              >
                                {kind.label}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{item.nome}</p>
                              </div>
                              <span className="hidden rounded-full bg-[#E7F1FF] px-2 py-0.5 text-[11px] text-[#2563EB] sm:inline">
                                {grupo.badge}
                              </span>
                              <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground md:inline-flex">
                                {formatWhen(item.createdAt)}
                              </span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-[#2563EB]"
                                aria-label={`Baixar ${item.nome}`}
                                onClick={() => void baixar(item.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    aria-label="Mais ações"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => void ver(item.id)}>
                                    <Eye className="mr-2 h-4 w-4" /> Ver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void baixar(item.id)}>
                                    <Download className="mr-2 h-4 w-4" /> Baixar
                                  </DropdownMenuItem>
                                  {grupo.id === "outro" ? (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => void excluir(item.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                    </DropdownMenuItem>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </li>
                          );
                        })}
                        {resto > 0 ? (
                          <li className="border-t">
                            <button
                              type="button"
                              className="flex w-full items-center justify-center gap-1 py-2 text-xs font-medium text-[#2563EB]"
                              onClick={() =>
                                setExpanded((cur) => ({ ...cur, [grupo.id]: true }))
                              }
                            >
                              Ver mais {resto} arquivo(s)
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="hidden">
        <DocumentosPanel
          entityType="lead"
          entityId={leadId}
          categoria="outro"
          title="Arquivos"
          allowUpload
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
              Os documentos deste cadastro seguem para o endereço informado.
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

function ResumoCard({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#93C5FD]",
        active && "border-[#2563EB]",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7F1FF] text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block text-xl font-semibold leading-tight">{value}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

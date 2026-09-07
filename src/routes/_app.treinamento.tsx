import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  createTreinamentoLink,
  createTreinamentoSecao,
  deleteTreinamentoLink,
  deleteTreinamentoSecao,
  fetchTreinamento,
  updateTreinamentoLink,
  updateTreinamentoSecao,
  type TreinamentoLink,
  type TreinamentoSecao,
} from "@/lib/treinamento-api";
import {
  ChevronDown,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FILTER_BAR_SURFACE,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";

export const Route = createFileRoute("/_app/treinamento")({
  head: () => ({ meta: [{ title: "Treinamento — Zone Connection" }] }),
  component: TreinamentoPage,
});

const MANAGE_ROLES = new Set([
  "super_admin",
  "admin",
  "gerente",
  "analista",
  "treinee",
]);
const MAX_DEPTH = 4;

function secaoMatches(secao: TreinamentoSecao, query: string): boolean {
  if (!query) return true;
  if (secao.titulo.toLocaleLowerCase("pt-BR").includes(query)) return true;
  if (
    secao.links.some((link) =>
      `${link.titulo} ${link.url}`.toLocaleLowerCase("pt-BR").includes(query),
    )
  ) {
    return true;
  }
  return secao.children.some((child) => secaoMatches(child, query));
}

function TreinamentoPage() {
  const user = getSession();
  const canManage = Boolean(user && MANAGE_ROLES.has(user.role));
  const [secoes, setSecoes] = useState<TreinamentoSecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [secaoOpen, setSecaoOpen] = useState(false);
  const [secaoParentId, setSecaoParentId] = useState<string | null>(null);
  const [editingSecao, setEditingSecao] = useState<TreinamentoSecao | null>(
    null,
  );
  const [secaoTitulo, setSecaoTitulo] = useState("");

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSecaoId, setLinkSecaoId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<TreinamentoLink | null>(null);
  const [linkTitulo, setLinkTitulo] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [deleteSecao, setDeleteSecao] = useState<TreinamentoSecao | null>(null);
  const [deleteLink, setDeleteLink] = useState<TreinamentoLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSecoes(await fetchTreinamento());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o treinamento.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    if (!q) return secoes;
    return secoes.filter((secao) => secaoMatches(secao, q));
  }, [secoes, search]);

  function openNewSecao(parentId: string | null) {
    setEditingSecao(null);
    setSecaoParentId(parentId);
    setSecaoTitulo("");
    setSecaoOpen(true);
  }

  function openEditSecao(secao: TreinamentoSecao) {
    setEditingSecao(secao);
    setSecaoParentId(secao.parentId);
    setSecaoTitulo(secao.titulo);
    setSecaoOpen(true);
  }

  function openNewLink(secaoId: string) {
    setEditingLink(null);
    setLinkSecaoId(secaoId);
    setLinkTitulo("");
    setLinkUrl("");
    setLinkOpen(true);
  }

  function openEditLink(link: TreinamentoLink) {
    setEditingLink(link);
    setLinkSecaoId(link.secaoId);
    setLinkTitulo(link.titulo);
    setLinkUrl(link.url);
    setLinkOpen(true);
  }

  async function saveSecao() {
    const titulo = secaoTitulo.trim();
    if (titulo.length < 2) {
      toast.error("Informe o nome da seção.");
      return;
    }
    setSaving(true);
    try {
      if (editingSecao) {
        await updateTreinamentoSecao(editingSecao.id, titulo);
        toast.success("Seção atualizada.");
      } else {
        await createTreinamentoSecao({
          titulo,
          parentId: secaoParentId,
        });
        toast.success("Seção cadastrada.");
      }
      setSecaoOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a seção.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveLink() {
    const titulo = linkTitulo.trim();
    const url = linkUrl.trim();
    if (titulo.length < 2) {
      toast.error("Informe o nome do link.");
      return;
    }
    if (!url.startsWith("https://")) {
      toast.error("Informe uma URL https (ex.: pasta do Google Drive).");
      return;
    }
    if (!linkSecaoId) return;
    setSaving(true);
    try {
      if (editingLink) {
        await updateTreinamentoLink(editingLink.id, { titulo, url });
        toast.success("Link atualizado.");
      } else {
        await createTreinamentoLink({ secaoId: linkSecaoId, titulo, url });
        toast.success("Link cadastrado.");
      }
      setLinkOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o link.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteSecao() {
    if (!deleteSecao) return;
    setDeleting(true);
    try {
      await deleteTreinamentoSecao(deleteSecao.id);
      setDeleteSecao(null);
      toast.success("Seção excluída.");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a seção.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteLink() {
    if (!deleteLink) return;
    setDeleting(true);
    try {
      await deleteTreinamentoLink(deleteLink.id);
      setDeleteLink(null);
      toast.success("Link excluído.");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o link.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Treinamento"
        description={
          canManage
            ? "Pastas e links do Drive organizados em seções para o time."
            : "Consulte os materiais e abra as pastas do Drive cadastradas pela gerência."
        }
        actions={
          canManage ? (
            <Button type="button" onClick={() => openNewSecao(null)}>
              <Plus className="mr-1 h-4 w-4" />
              Nova seção
            </Button>
          ) : null
        }
      />

      <div className={cn("mb-4 max-w-sm", FILTER_BAR_SURFACE)}>
        <div className="relative">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar seção ou link…"
            className={cn("pl-9", FILTER_CONTROL)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <GraduationCap className="h-8 w-8 opacity-40" />
            <p>
              {secoes.length === 0
                ? canManage
                  ? "Nenhuma seção ainda. Crie a primeira, por exemplo “Empreendimentos”."
                  : "Nenhum material de treinamento cadastrado."
                : "Nenhum resultado para a busca."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((secao) => (
            <SecaoBlock
              key={secao.id}
              secao={secao}
              depth={1}
              canManage={canManage}
              onAddChild={(id) => openNewSecao(id)}
              onEditSecao={openEditSecao}
              onDeleteSecao={setDeleteSecao}
              onAddLink={openNewLink}
              onEditLink={openEditLink}
              onDeleteLink={setDeleteLink}
            />
          ))}
        </div>
      )}

      <FormDialogShell
        open={secaoOpen}
        onOpenChange={setSecaoOpen}
        icon={<FolderOpen className="h-5 w-5" />}
        title={
          editingSecao
            ? "Editar seção"
            : secaoParentId
              ? "Nova subseção"
              : "Nova seção"
        }
        description="Ex.: Empreendimentos, Tabelas, Processo de vendas."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSecaoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void saveSecao()}
            >
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editingSecao ? "Salvar" : "Cadastrar"}
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection title="Nome">
            <div className="space-y-1.5">
              <Label htmlFor="treino-secao">Seção</Label>
              <Input
                id="treino-secao"
                value={secaoTitulo}
                onChange={(event) => setSecaoTitulo(event.target.value)}
                placeholder="Ex.: Empreendimentos"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveSecao();
                  }
                }}
              />
            </div>
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={linkOpen}
        onOpenChange={setLinkOpen}
        icon={<Link2 className="h-5 w-5" />}
        title={editingLink ? "Editar link" : "Novo link"}
        description="Cole a URL https da pasta ou arquivo no Drive."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void saveLink()}
            >
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editingLink ? "Salvar" : "Cadastrar"}
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection title="Material">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="treino-link-nome">Nome</Label>
                <Input
                  id="treino-link-nome"
                  value={linkTitulo}
                  onChange={(event) => setLinkTitulo(event.target.value)}
                  placeholder="Ex.: Pasta de tabelas"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="treino-link-url">URL</Label>
                <Input
                  id="treino-link-url"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://drive.google.com/…"
                />
              </div>
            </div>
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteSecao)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteSecao(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seção?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSecao
                ? `"${deleteSecao.titulo}" e todas as subseções e links dentro dela serão removidos.`
                : "A seção e o conteúdo interno serão removidos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteSecao();
              }}
            >
              {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteLink)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteLink(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir link?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteLink
                ? `"${deleteLink.titulo}" sai desta seção.`
                : "O link será removido da seção."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteLink();
              }}
            >
              {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SecaoBlock({
  secao,
  depth,
  canManage,
  onAddChild,
  onEditSecao,
  onDeleteSecao,
  onAddLink,
  onEditLink,
  onDeleteLink,
}: {
  secao: TreinamentoSecao;
  depth: number;
  canManage: boolean;
  onAddChild: (parentId: string) => void;
  onEditSecao: (secao: TreinamentoSecao) => void;
  onDeleteSecao: (secao: TreinamentoSecao) => void;
  onAddLink: (secaoId: string) => void;
  onEditLink: (link: TreinamentoLink) => void;
  onDeleteLink: (link: TreinamentoLink) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasBody = secao.links.length > 0 || secao.children.length > 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        depth === 1
          ? "border-border/60 bg-gradient-to-br from-primary/[0.09] via-primary/[0.03] to-card shadow-sm"
          : "border-border/70 bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-2 px-3 py-2.5",
          depth === 1 &&
            "border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent",
        )}
      >
        <button
          type="button"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          title={open ? "Recolher" : "Expandir"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              !open && "-rotate-90",
            )}
          />
        </button>
        <FolderOpen className="mt-1 h-4 w-4 shrink-0 text-[#079ED4]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-6">{secao.titulo}</p>
          <p className="text-[11px] text-muted-foreground">
            {secao.links.length} link{secao.links.length === 1 ? "" : "s"}
            {secao.children.length
              ? ` · ${secao.children.length} subseção${secao.children.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
            {depth < MAX_DEPTH ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => onAddChild(secao.id)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Subseção
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => onAddLink(secao.id)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Editar seção"
              onClick={() => onEditSecao(secao)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              title="Excluir seção"
              onClick={() => onDeleteSecao(secao)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
      {open && hasBody ? (
        <div className="space-y-2 border-t px-3 py-3">
          {secao.links.length > 0 ? (
            <ul className="space-y-1.5">
              {secao.links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2"
                >
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                    title={link.url}
                  >
                    {link.titulo}
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  {canManage ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar link"
                        onClick={() => onEditLink(link)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Excluir link"
                        onClick={() => onDeleteLink(link)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {secao.children.length > 0 ? (
            <div className="space-y-2 pl-2">
              {secao.children.map((child) => (
                <SecaoBlock
                  key={child.id}
                  secao={child}
                  depth={depth + 1}
                  canManage={canManage}
                  onAddChild={onAddChild}
                  onEditSecao={onEditSecao}
                  onDeleteSecao={onDeleteSecao}
                  onAddLink={onAddLink}
                  onEditLink={onEditLink}
                  onDeleteLink={onDeleteLink}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {open && !hasBody ? (
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
          {canManage
            ? "Esta seção está vazia. Adicione um link ou uma subseção."
            : "Nenhum material nesta seção."}
        </p>
      ) : null}
    </div>
  );
}

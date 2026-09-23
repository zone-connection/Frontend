import { useEffect, useState } from "react";
import { PagePanel } from "@/components/page-panel";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  DOCUMENTOS_IDENTIFICACAO,
  createListaDocumento,
  deleteListaDocumento,
  fetchListasDocumento,
  updateListaDocumento,
  type ListaDocumento,
  type ListaDocumentoItemDraft,
} from "@/lib/listas-documentos-api";
import {
  downloadListaDocumentoPdf,
  listaDocumentoPaletteCss,
} from "@/lib/lista-documentos-pdf";
import { resolveContratoBrandHex } from "@/lib/contratos-pdf";
import { useTenantTheme } from "@/lib/tenant-theme";
import { SOFT_BTN } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type Draft = {
  id?: string;
  nome: string;
  chave?: string | null;
  intro: string;
  aviso: string;
  itens: ListaDocumentoItemDraft[];
};

function draftFrom(lista?: ListaDocumento): Draft {
  if (!lista) {
    return {
      nome: "",
      intro: "",
      aviso: "",
      itens: DOCUMENTOS_IDENTIFICACAO.map((item) => ({ ...item })),
    };
  }
  return {
    id: lista.id,
    nome: lista.nome,
    chave: lista.chave,
    intro: lista.intro,
    aviso: lista.aviso,
    itens: lista.itens.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      descricao: item.descricao,
    })),
  };
}

export function ListasDocumentosPanel() {
  const { brandName, logoUrl, tenant } = useTenantTheme();
  const [listas, setListas] = useState<ListaDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [brandHex, setBrandHex] = useState<string | null>(null);
  const [preview, setPreview] = useState<ListaDocumento | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ListaDocumento | null>(null);
  const [removing, setRemoving] = useState(false);

  async function load() {
    setLoading(true);
    setErro(null);
    try {
      setListas(await fetchListasDocumento());
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível carregar as listas.";
      setErro(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void resolveContratoBrandHex(logoUrl, tenant?.primaryColor).then(setBrandHex);
  }, [logoUrl, tenant?.primaryColor]);

  async function baixar(lista: ListaDocumento) {
    setDownloading(true);
    try {
      await downloadListaDocumentoPdf({
        nome: lista.nome,
        chave: lista.chave,
        intro: lista.intro,
        aviso: lista.aviso,
        itens: lista.itens,
        brandName,
        logoUrl,
        primaryColor: brandHex ?? tenant?.primaryColor,
      });
      toast.success("PDF baixado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o PDF.");
    } finally {
      setDownloading(false);
    }
  }

  async function salvar() {
    if (!draft) return;
    const nome = draft.nome.trim();
    if (!nome) {
      toast.error("Informe o nome da lista.");
      return;
    }
    const itens = draft.itens
      .map((item) => ({
        id: item.id,
        titulo: item.titulo.trim(),
        descricao: item.descricao.trim(),
      }))
      .filter((item) => item.titulo);
    if (itens.length === 0) {
      toast.error("Inclua ao menos um documento.");
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await updateListaDocumento(draft.id, {
          nome,
          intro: draft.intro.trim(),
          aviso: draft.aviso.trim(),
          itens,
        });
        toast.success("Lista atualizada.");
      } else {
        await createListaDocumento({
          nome,
          intro: draft.intro.trim() || undefined,
          aviso: draft.aviso.trim() || undefined,
          itens,
        });
        toast.success("Lista criada.");
      }
      setDraft(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function patchItem(index: number, partial: Partial<ListaDocumentoItemDraft>) {
    if (!draft) return;
    setDraft({
      ...draft,
      itens: draft.itens.map((item, i) => (i === index ? { ...item, ...partial } : item)),
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    if (!draft) return;
    const next = index + direction;
    if (next < 0 || next >= draft.itens.length) return;
    const itens = [...draft.itens];
    const current = itens[index];
    const target = itens[next];
    if (!current || !target) return;
    itens[index] = target;
    itens[next] = current;
    setDraft({ ...draft, itens });
  }

  const palette = listaDocumentoPaletteCss(brandHex ?? tenant?.primaryColor);

  return (
    <>
      <PagePanel
        title="Listas de documentos"
        description="Tipos de renda para enviar ao cliente. O PDF usa a logo e a cor da imobiliária."
        inset="muted"
        action={
          <Button size="sm" onClick={() => setDraft(draftFrom())}>
            <Plus className="mr-1 size-4" />
            Novo tipo
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando listas…
          </div>
        ) : erro ? (
          <p className="py-4 text-sm text-muted-foreground">{erro}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {listas.map((lista) => (
              <article
                key={lista.id}
                className="flex h-full flex-col rounded-2xl border border-black/5 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]"
              >
                <div
                  className="mb-3 flex size-11 items-center justify-center rounded-xl"
                  style={{ background: palette.tint, color: palette.accent }}
                >
                  <ClipboardList className="size-5" />
                </div>
                <h3 className="text-[15px] font-semibold leading-snug">{lista.nome}</h3>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">
                  {lista.itens.length} documento{lista.itens.length === 1 ? "" : "s"}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className={SOFT_BTN} onClick={() => setPreview(lista)}>
                    <Eye className="mr-1 size-3.5" />
                    Ver
                  </Button>
                  <Button size="sm" variant="outline" className={SOFT_BTN} onClick={() => setDraft(draftFrom(lista))}>
                    <Pencil className="mr-1 size-3.5" />
                    Editar
                  </Button>
                  <Button size="sm" disabled={downloading} onClick={() => void baixar(lista)}>
                    <Download className="mr-1 size-3.5" />
                    PDF
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </PagePanel>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.nome}</DialogTitle>
          </DialogHeader>
          {preview ? <ListaPreview lista={preview} brandName={brandName} logoUrl={logoUrl} palette={palette} /> : null}
          <DialogFooter>
            <Button variant="outline" className={SOFT_BTN} onClick={() => setPreview(null)}>
              Fechar
            </Button>
            {preview ? (
              <Button disabled={downloading} onClick={() => void baixar(preview)}>
                {downloading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Download className="mr-1 size-4" />}
                Baixar PDF
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar lista" : "Novo tipo de lista"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={draft.nome}
                  onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                  placeholder="Ex.: CLT"
                />
              </div>
              <div>
                <Label>Texto de abertura</Label>
                <Textarea
                  value={draft.intro}
                  onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
                  placeholder="Deixe em branco para usar o texto padrão da Caixa."
                />
              </div>
              <div>
                <Label>Aviso importante</Label>
                <Textarea
                  value={draft.aviso}
                  onChange={(e) => setDraft({ ...draft, aviso: e.target.value })}
                  placeholder="Texto do quadro Importante no final do PDF."
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Documentos</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={SOFT_BTN}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        itens: [...draft.itens, { titulo: "", descricao: "" }],
                      })
                    }
                  >
                    <Plus className="mr-1 size-3.5" />
                    Documento
                  </Button>
                </div>
                {draft.itens.map((item, index) => (
                  <div key={item.id ?? `novo-${index}`} className="rounded-xl border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === draft.itens.length - 1}
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              itens: draft.itens.filter((_, i) => i !== index),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={item.titulo}
                      placeholder="Nome do documento"
                      onChange={(e) => patchItem(index, { titulo: e.target.value })}
                    />
                    <Textarea
                      className="mt-2"
                      value={item.descricao}
                      placeholder="Orientação curta para o cliente"
                      onChange={(e) => patchItem(index, { descricao: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              {draft.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start text-destructive"
                  onClick={() => {
                    const atual = listas.find((item) => item.id === draft.id);
                    if (atual) setRemoveTarget(atual);
                  }}
                >
                  <Trash2 className="mr-1 size-4" />
                  Excluir esta lista
                </Button>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" className={SOFT_BTN} onClick={() => setDraft(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={saving}>
              {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Excluir lista"
        description={
          removeTarget
            ? `A lista ${removeTarget.nome} e os documentos dela serão apagados.`
            : ""
        }
        loading={removing}
        onConfirm={() => {
          if (!removeTarget) return;
          setRemoving(true);
          void deleteListaDocumento(removeTarget.id)
            .then(async () => {
              toast.success("Lista excluída.");
              setRemoveTarget(null);
              setDraft(null);
              await load();
            })
            .catch((err) => {
              toast.error(err instanceof ApiError ? err.message : "Não foi possível excluir.");
            })
            .finally(() => setRemoving(false));
        }}
      />
    </>
  );
}

function ListaPreview({
  lista,
  brandName,
  logoUrl,
  palette,
}: {
  lista: ListaDocumento;
  brandName: string;
  logoUrl: string;
  palette: ReturnType<typeof listaDocumentoPaletteCss>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border" style={{ background: palette.page }}>
      <div className="relative overflow-hidden px-6 py-6 text-white" style={{ background: palette.header }}>
        <div
          className="pointer-events-none absolute -right-6 -top-8 size-32 rounded-full opacity-40"
          style={{ background: palette.accent }}
        />
        <div className={cn("inline-flex items-center rounded-xl bg-white px-3 py-2")}>
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-8 max-w-[140px] object-contain" />
          ) : (
            <span className="text-sm font-semibold" style={{ color: palette.header }}>
              {brandName}
            </span>
          )}
        </div>
        <p className="mt-3 text-[11px] font-semibold tracking-[0.14em]">{brandName.toUpperCase()}</p>
      </div>
      <div className="space-y-3 px-6 py-5">
        <span
          className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold tracking-wide"
          style={{ background: palette.tint, color: palette.accent }}
        >
          LISTA DE DOCUMENTOS
        </span>
        <h3 className="text-2xl font-semibold" style={{ color: palette.ink }}>
          {lista.chave ? "Tipo de renda: " : "Lista: "}
          <span style={{ color: palette.accent }}>{lista.nome}</span>
        </h3>
        <p className="text-sm" style={{ color: palette.muted }}>
          {lista.intro}
        </p>
        <ul className="space-y-2">
          {lista.itens.map((item, index) => (
            <li key={item.id} className="flex items-start gap-3 rounded-xl border bg-white px-3 py-3">
              <span
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{ background: palette.tint, color: palette.accent }}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: palette.ink }}>
                  {index + 1}. {item.titulo}
                </p>
                {item.descricao ? (
                  <p className="text-xs" style={{ color: palette.muted }}>
                    {item.descricao}
                  </p>
                ) : null}
              </div>
              <span
                className="mt-1 size-4 shrink-0 rounded border"
                style={{ borderColor: palette.accent }}
              />
            </li>
          ))}
        </ul>
        <div className="flex gap-3 rounded-xl border bg-white p-3">
          <span className="w-1 shrink-0 rounded-full" style={{ background: palette.accent }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: palette.accent }}>
              Importante
            </p>
            <p className="text-xs" style={{ color: palette.muted }}>
              {lista.aviso}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

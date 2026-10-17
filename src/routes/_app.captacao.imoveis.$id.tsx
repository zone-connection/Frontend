import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentosPanel } from "@/components/documentos-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  deleteCaptacaoImovel,
  deleteCaptacaoImovelFoto,
  fetchCaptacaoImovel,
  formatBrl,
  imovelFotoItens,
  updateCaptacaoImovel,
  uploadCaptacaoImovelFoto,
  type Imovel,
} from "@/lib/captacao-api";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ImovelFichaFields } from "@/components/imovel-ficha-fields";
import { fichaToPayload, imovelToFicha } from "@/lib/imovel-ficha";
import { ImovelFichaVisao } from "@/components/imovel-ficha-visao";
import { PropostaLinkPublicoButton } from "@/components/proposta-link-publico-button";
import { BRAND_GRADIENT_BTN } from "@/lib/brand-gradient";
import { ArrowLeft, Building2, Loader2, Pencil, Trash2 } from "lucide-react";
import { PropostasDoAlvo } from "@/components/propostas-do-alvo";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/imoveis/$id")({
  component: ImovelDetalhePage,
});

function ImovelDetalhePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Imovel | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [ficha, setFicha] = useState(imovelToFicha({}));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fotoBusy, setFotoBusy] = useState(false);

  useEffect(() => {
    void fetchCaptacaoImovel(id)
      .then(setItem)
      .catch((err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível carregar.",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (!item) {
    return (
      <div className="space-y-3 py-10">
        <p className="text-sm text-muted-foreground">
          Não foi possível abrir este imóvel.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/imoveis">Voltar à lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-[#5C6B76]">
        <Link to="/imoveis">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para imóveis
        </Link>
      </Button>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#E2E8EC] bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-[#141a22]">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#079ED4] text-lg font-semibold text-white">
            {(item.titulo || "I").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#079ED4]">Imóvel</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0B3148] dark:text-white">{item.titulo}</h1>
            <p className="mt-1 text-sm text-[#5C6B76]">
              {CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo]}
              {item.cidade ? ` · ${item.cidade}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[#F3FAFD] px-2 py-1 font-medium text-[#05749E]">
                {CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo]}
              </span>
              {item.captacao?.etapa ? (
                <span className="rounded-full bg-[#F4F7F8] px-2 py-1 text-[#5C6B76]">{item.captacao.etapa}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setFicha(imovelToFicha(item)); setOpen(true); }}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Editar ficha
          </Button>
          <PropostaLinkPublicoButton imovelId={item.id} />
          {item.captacao ? (
            <Button asChild size="sm" className={BRAND_GRADIENT_BTN}>
              <Link to="/captacao/captacoes/$id" params={{ id: item.captacao.id }}>Ver captação</Link>
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Excluir
          </Button>
        </div>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          ["Valor", formatBrl(item.valor)],
          ["Cidade", item.cidade || "—"],
          ["Proprietário", item.proprietario?.nome || "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#E2E8EC] bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#141a22]">
            <p className="text-[11px] text-[#5C6B76]">{label}</p>
            <p className="mt-1 truncate text-sm font-medium text-[#0B3148] dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6">
      <Card className="rounded-2xl border-[#E2E8EC] shadow-sm dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-base text-[#0B3148] dark:text-white">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            Proprietário:{" "}
            {item.proprietario ? (
              <Link
                to="/captacao/proprietarios/$id"
                params={{ id: item.proprietario.id }}
                className="hover:underline"
              >
                {item.proprietario.nome}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <p>
            {[item.logradouro, item.numero, item.complemento, item.bairro, item.cidade, item.estado]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
          <p>CEP: {item.cep || "—"}</p>
          <p>Valor pretendido (captação): {formatBrl(item.valor)}</p>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-[#E2E8EC] shadow-sm dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-base text-[#0B3148] dark:text-white">Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          {imovelFotoItens(item).length === 0 ? (
            <p className="text-sm text-[#5C6B76]">Nenhuma foto. Use Editar ficha para enviar.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {imovelFotoItens(item).map((foto, index) => (
                <li key={foto.id ?? foto.url} className="overflow-hidden rounded-xl border border-[#E2E8EC]">
                  <img src={foto.url} alt="" className="aspect-[4/3] w-full object-cover" />
                  {index === 0 ? (
                    <p className="px-2 py-1 text-[10px] font-medium text-[#05749E]">Capa</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <DocumentosPanel entityType="imovel" entityId={item.id} title="Documentação do imóvel" />
      <Card className="rounded-2xl border-[#E2E8EC] shadow-sm dark:border-white/10">
        <CardContent className="pt-6">
          <ImovelFichaVisao imovel={item} />
        </CardContent>
      </Card>
      <PropostasDoAlvo imovelId={item.id} titulo="Propostas deste imóvel" />
      {item.descricao ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descrição do anúncio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{item.descricao}</p>
          </CardContent>
        </Card>
      ) : null}
      </div>
      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        className="max-w-3xl"
        icon={<Building2 className="h-5 w-5" />}
        title="Editar ficha do imóvel"
        description="Atualiza a visão geral na captação, na venda de usados e no portal."
      >
        <FormDialogBody>
          <ImovelFichaFields
            resetKey={`${open}-${item.id}`}
            value={ficha}
            onChange={setFicha}
            foto={{
              items: imovelFotoItens(item),
              busy: fotoBusy,
              onAdd: (file) => {
                setFotoBusy(true);
                void uploadCaptacaoImovelFoto(item.id, file)
                  .then((next) => {
                    setItem(next);
                    toast.success("Foto enviada.");
                  })
                  .catch((err) => {
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Não foi possível enviar a foto.",
                    );
                  })
                  .finally(() => setFotoBusy(false));
              },
              onRemove: (_index, fotoId) => {
                setFotoBusy(true);
                void deleteCaptacaoImovelFoto(item.id, fotoId)
                  .then((next) => {
                    setItem(next);
                    toast.success("Foto removida.");
                  })
                  .catch((err) => {
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Não foi possível remover a foto.",
                    );
                  })
                  .finally(() => setFotoBusy(false));
              },
            }}
          />
        </FormDialogBody>
        <FormDialogActions>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void updateCaptacaoImovel(item.id, fichaToPayload(ficha))
                .then((next) => {
                  setItem(next);
                  setOpen(false);
                  toast.success("Ficha atualizada.");
                })
                .catch((err) => {
                  toast.error(
                    err instanceof ApiError
                      ? err.message
                      : "Não foi possível salvar.",
                  );
                })
                .finally(() => setSaving(false));
            }}
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </FormDialogActions>
      </FormDialogShell>
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir imóvel?"
        description="O imóvel e as captações ligadas a ele serão removidos. Venda de usados impede a exclusão."
        loading={deleting}
        onConfirm={() => {
          setDeleting(true);
          void deleteCaptacaoImovel(item.id)
            .then(() => {
              toast.success("Imóvel excluído.");
              void navigate({ to: "/imoveis" });
            })
            .catch((err) => {
              toast.error(
                err instanceof ApiError
                  ? err.message
                  : "Não foi possível excluir.",
              );
            })
            .finally(() => setDeleting(false));
        }}
      />
    </>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  deleteCaptacaoImovel,
  deleteCaptacaoImovelFoto,
  fetchCaptacaoImovel,
  formatBrl,
  imovelCapaUrl,
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
import { Building2, Loader2, Pencil, Trash2 } from "lucide-react";
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
      <PageHeader
        title={item.titulo}
        description={`${CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo]} · ${item.cidade || "sem cidade"}`}
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/imoveis">Voltar ao catálogo</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFicha(imovelToFicha(item));
                setOpen(true);
              }}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Editar ficha
            </Button>
            <PropostaLinkPublicoButton imovelId={item.id} />
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Excluir
            </Button>
            {item.captacao ? (
              <Button asChild size="sm">
                <Link to="/captacao/captacoes/$id" params={{ id: item.captacao.id }}>
                  Ver captação
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/captacao/captacoes">Criar captação</Link>
              </Button>
            )}
          </div>
        }
      />
      <div className="grid gap-6">
      {imovelCapaUrl(item) ? (
        <img
          src={imovelCapaUrl(item) ?? ""}
          alt={item.titulo}
          className="max-h-72 w-full rounded-xl object-cover"
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereço</CardTitle>
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
      <Card>
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import {
  deleteCaptacao,
  fetchCaptacao,
  fetchCaptacaoResponsaveis,
  formatBrl,
  updateCaptacao,
  type Captacao,
  type CaptacaoResponsavel,
} from "@/lib/captacao-api";
import { fetchFunis, type Funil } from "@/lib/funis-api";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { LostMotivoFields } from "@/components/lost-motivo-fields";
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
import { formatMoneyInput, maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/captacoes/$id")({
  component: CaptacaoDetalhePage,
});

function CaptacaoDetalhePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Captacao | null>(null);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [responsaveis, setResponsaveis] = useState<CaptacaoResponsavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [valorPretendido, setValorPretendido] = useState("");
  const [valorAvaliacao, setValorAvaliacao] = useState("");
  const [lostEtapaId, setLostEtapaId] = useState<string | null>(null);
  const [lostMotivo, setLostMotivo] = useState("");
  const [lostMotivoOutro, setLostMotivoOutro] = useState("");
  const [retornoEm, setRetornoEm] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [cap, list, users] = await Promise.all([
        fetchCaptacao(id),
        fetchFunis(),
        fetchCaptacaoResponsaveis(),
      ]);
      setItem(cap);
      setFunis(list.filter((f) => f.tipo === "captacao"));
      setResponsaveis(users);
      setValorPretendido(
        cap.valorPretendido != null ? formatMoneyInput(cap.valorPretendido) : "",
      );
      setValorAvaliacao(
        cap.valorAvaliacao != null ? formatMoneyInput(cap.valorAvaliacao) : "",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const etapas =
    funis.find((f) => f.id === item?.funilId)?.etapas.filter((e) => e.active) ??
    [];

  async function patch(body: Record<string, unknown>, ok: string) {
    setSaving(true);
    try {
      const updated = await updateCaptacao(id, body);
      setItem(updated);
      toast.success(ok);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !item) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Captação"
        description={`${item.proprietario.nome} · ${item.imovel.titulo}`}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Excluir
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Proprietário:{" "}
              <Link
                to="/captacao/proprietarios/$id"
                params={{ id: item.proprietario.id }}
                className="hover:underline"
              >
                {item.proprietario.nome}
              </Link>
            </p>
            <p>
              Imóvel:{" "}
              <Link
                to="/captacao/imoveis/$id"
                params={{ id: item.imovel.id }}
                className="hover:underline"
              >
                {item.imovel.titulo}
              </Link>
            </p>
            <div>
              <Label>Responsável</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={item.responsavelId}
                disabled={saving}
                onChange={(e) =>
                  void patch(
                    { responsavelId: e.target.value },
                    "Responsável atualizado.",
                  )
                }
              >
                {responsaveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            {item.canceladoPeloProprietario ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">
                O proprietário cancelou o anúncio pelo portal. Entre em contato
                ou registre a perda com motivo.
              </p>
            ) : null}
            <p>Origem: {item.origem || "—"}</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.exclusividade}
                disabled={saving}
                onChange={(e) =>
                  void patch(
                    { exclusividade: e.target.checked },
                    "Exclusividade atualizada.",
                  )
                }
              />
              Exclusividade
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Valor pretendido</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valorPretendido}
                  onChange={(e) =>
                    setValorPretendido(maskMoneyInput(e.target.value))
                  }
                />
              </div>
              <div>
                <Label>Valor de avaliação</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valorAvaliacao}
                  onChange={(e) =>
                    setValorAvaliacao(maskMoneyInput(e.target.value))
                  }
                />
              </div>
            </div>
            <Button
              size="sm"
              disabled={saving}
              onClick={() =>
                void patch(
                  {
                    valorPretendido: parseOptionalMoneyInput(valorPretendido),
                    valorAvaliacao: parseOptionalMoneyInput(valorAvaliacao),
                  },
                  "Valores atualizados.",
                )
              }
            >
              Salvar valores
            </Button>
            <p className="text-muted-foreground">
              Pretendido atual: {formatBrl(item.valorPretendido)} · Avaliação:{" "}
              {formatBrl(item.valorAvaliacao)}
            </p>
            <div>
              <Label>Etapa do funil</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={item.funilEtapaId}
                disabled={saving}
                onChange={(e) => {
                  const etapaId = e.target.value;
                  const etapa = etapas.find((itemEtapa) => itemEtapa.id === etapaId);
                  if (etapa?.papel === "perdido") {
                    setLostEtapaId(etapaId);
                    return;
                  }
                  void patch({ funilEtapaId: etapaId }, "Etapa atualizada.");
                }}
              >
                {etapas.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Funil: {item.funil.name}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(item.historicos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos.</p>
            ) : (
              (item.historicos ?? []).map((h) => (
                <div key={h.id} className="border-b pb-2 text-sm last:border-0">
                  <p className="whitespace-pre-wrap">{h.texto}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.autor?.name ?? "Sistema"} ·{" "}
                    {new Date(h.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog
        open={!!lostEtapaId}
        onOpenChange={(open) => {
          if (!open) {
            setLostEtapaId(null);
            setLostMotivo("");
            setLostMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Por que esta captação foi perdida?</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o motivo para mover para Perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <LostMotivoFields
            value={lostMotivo}
            outroValue={lostMotivoOutro}
            onChange={setLostMotivo}
            onOutroChange={setLostMotivoOutro}
          />
          <div className="space-y-1">
            <Label htmlFor="detalhe-retorno">Tentar de novo em</Label>
            <Input
              id="detalhe-retorno"
              type="date"
              value={retornoEm}
              onChange={(e) => setRetornoEm(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                const motivo =
                  lostMotivo === "__outro__"
                    ? lostMotivoOutro.trim()
                    : lostMotivo.trim();
                if (!motivo || !lostEtapaId) {
                  toast.error("Selecione o motivo da perda.");
                  return;
                }
                void patch(
                  { funilEtapaId: lostEtapaId, motivoPerda: motivo, retornoEm: retornoEm || undefined },
                  "Perda registrada.",
                ).then(() => {
                  setLostEtapaId(null);
                  setLostMotivo("");
                  setLostMotivoOutro("");
                });
              }}
            >
              Confirmar perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir captação?"
        description="O processo sai do funil. O imóvel e o proprietário permanecem cadastrados."
        loading={deleting}
        onConfirm={() => {
          setDeleting(true);
          void deleteCaptacao(item.id)
            .then(() => {
              toast.success("Captação excluída.");
              void navigate({ to: "/captacao/captacoes" });
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

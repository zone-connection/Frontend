import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import {
  deleteCaptacao,
  deleteCaptacaoImovelFoto,
  fetchCaptacao,
  fetchCaptacaoResponsaveis,
  formatBrl,
  IMOVEL_MAX_FOTOS,
  updateCaptacao,
  uploadCaptacaoImovelFoto,
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
import { BRAND_GRADIENT_BTN } from "@/lib/brand-gradient";
import { cn } from "@/lib/utils";
import { DocumentosPanel } from "@/components/documentos-panel";
import { ArrowLeft, Building2, Clock, ImagePlus, Loader2, MapPin, Trash2, UserRound } from "lucide-react";
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
  const [fotoBusy, setFotoBusy] = useState(false);
  const [photo, setPhoto] = useState(0);

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

  const fotos = item.imovel.fotos ?? [];
  const current = fotos[photo] ?? fotos[0];
  const endereco = [item.imovel.titulo, item.imovel.cidade].filter(Boolean).join(" · ");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button asChild variant="ghost" size="sm" className="-ml-2 rounded-full">
            <Link to="/captacao/captacoes">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Captações
            </Link>
          </Button>
          <span>/</span>
          <span className="font-medium text-foreground">{item.proprietario.nome}</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Excluir
        </Button>
      </div>

      <section className="mb-6 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
        <div className="relative bg-white px-3 pb-4 pt-3 sm:px-6">
          <div className="absolute left-4 top-4 z-10 flex gap-2 sm:left-7 sm:right-7">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950">
              {item.funilEtapa.label}
            </span>
            <div className="ml-auto flex gap-2">
              {item.origem ? (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm">
                  {item.origem}
                </span>
              ) : null}
              {item.exclusividade ? (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm">
                  Exclusividade
                </span>
              ) : null}
            </div>
          </div>
          {current ? (
            <div className="relative mx-auto max-w-4xl">
              <img
                src={current.url}
                alt={item.imovel.titulo}
                className="mx-auto max-h-[28rem] w-auto max-w-full rounded-md object-contain"
              />
              <span className="absolute bottom-4 left-4 rounded-full bg-[#6b7a3d]/92 px-5 py-1.5 text-sm font-medium text-white shadow-sm">
                {photo === 0 ? "Capa" : `Foto ${photo + 1}`}
              </span>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md bg-muted/40">
              <Building2 className="h-14 w-14 text-primary/35" />
            </div>
          )}
          {fotos.length > 1 ? (
            <div className="mx-auto mt-4 grid max-w-4xl grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {fotos.slice(0, 15).map((foto, index) => (
                <button
                  key={foto.id}
                  type="button"
                  onClick={() => setPhoto(index)}
                  className={cn(
                    "aspect-[16/10] overflow-hidden rounded-md",
                    index === photo
                      ? "ring-2 ring-primary ring-offset-2"
                      : "opacity-80 hover:opacity-100",
                  )}
                >
                  <img src={foto.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="mx-auto mt-3 flex max-w-4xl justify-end gap-2">
            {current ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={fotoBusy}
                onClick={() => {
                  setFotoBusy(true);
                  void deleteCaptacaoImovelFoto(item.imovel.id, current.id)
                    .then((imovel) => {
                      setItem({ ...item, imovel: { ...item.imovel, ...imovel } });
                      setPhoto(0);
                      toast.success("Foto removida.");
                    })
                    .catch((err) => {
                      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover a foto.");
                    })
                    .finally(() => setFotoBusy(false));
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remover foto
              </Button>
            ) : null}
            <Button asChild size="sm" className="rounded-full" disabled={fotoBusy || fotos.length >= IMOVEL_MAX_FOTOS}>
              <label className="cursor-pointer">
                {fotoBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
                Enviar foto
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={fotoBusy || fotos.length >= IMOVEL_MAX_FOTOS}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setFotoBusy(true);
                    void uploadCaptacaoImovelFoto(item.imovel.id, file)
                      .then((imovel) => {
                        setItem({ ...item, imovel: { ...item.imovel, ...imovel } });
                        toast.success("Foto enviada.");
                      })
                      .catch((err) => {
                        toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar a foto.");
                      })
                      .finally(() => setFotoBusy(false));
                  }}
                />
              </label>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Captação
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {item.proprietario.nome}
            </h1>
            {endereco ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {endereco}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          ["Pretendido", formatBrl(item.valorPretendido)],
          ["Avaliação", formatBrl(item.valorAvaliacao)],
          ["Responsável", item.responsavel.name],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#E2E8EC] bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#141a22]">
            <p className="text-[11px] text-[#5C6B76]">{label}</p>
            <p className="mt-1 truncate text-sm font-medium text-[#0B3148] dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="rounded-2xl border-[#E2E8EC] shadow-sm dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-[#0B3148] dark:text-white">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Proprietário:{" "}
              <Link
                to="/captacao/proprietarios/$id"
                params={{ id: item.proprietario.id }}
                className="font-medium text-[#079ED4] hover:underline"
              >
                {item.proprietario.nome}
              </Link>
            </p>
            <p>
              Imóvel:{" "}
              <Link
                to="/captacao/imoveis/$id"
                params={{ id: item.imovel.id }}
                className="font-medium text-[#079ED4] hover:underline"
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
              className={BRAND_GRADIENT_BTN}
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
        <Card className="rounded-2xl border-[#E2E8EC] shadow-sm dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-[#0B3148] dark:text-white">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {(item.historicos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos.</p>
            ) : (
              <ul className="divide-y">
                {(item.historicos ?? []).map((h) => (
                  <li key={h.id} className="flex items-start gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#079ED4] text-white">
                      <Clock className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap text-sm text-[#0B3148] dark:text-white">{h.texto}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#5C6B76]">
                        <UserRound className="h-3 w-3" />
                        {h.autor?.name ?? "Sistema"} · {new Date(h.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <DocumentosPanel
          entityType="imovel"
          entityId={item.imovel.id}
          title="Documentação do imóvel"
        />
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

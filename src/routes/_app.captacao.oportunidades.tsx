import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { ImovelFichaFields } from "@/components/imovel-ficha-fields";
import {
  emptyImovelFicha,
  fichaToPayload,
  imovelToFicha,
} from "@/lib/imovel-ficha";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  CAPTACAO_IMOVEL_TIPOS,
  CAPTACAO_MOTIVOS_PERDA,
  createOportunidade,
  deleteCaptacaoImovelFoto,
  fetchCaptacaoImovel,
  fetchCaptacaoResponsaveis,
  fetchOportunidades,
  formatBrl,
  IMOVEL_MAX_FOTOS,
  imovelFotoItens,
  perderOportunidade,
  promoverOportunidade,
  updateCaptacaoImovel,
  uploadCaptacaoImovelFoto,
  type CaptacaoImovelTipo,
  type CaptacaoResponsavel,
  type Imovel,
  type OportunidadeCaptacao,
} from "@/lib/captacao-api";
import { OPORTUNIDADES_MOCK } from "@/lib/modulos-mock";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { cn } from "@/lib/utils";
import { ArrowRight, ImagePlus, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/oportunidades")({
  component: OportunidadesPage,
});

const STATUS_LABEL = {
  aberta: "Aberta",
  convertida: "Virou captação",
  perdida: "Perdida",
} as const;

function OportunidadesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OportunidadeCaptacao[]>([]);
  const [exemplo, setExemplo] = useState(false);
  const [responsaveis, setResponsaveis] = useState<CaptacaoResponsavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [perderId, setPerderId] = useState<string | null>(null);
  const [ficha, setFicha] = useState<OportunidadeCaptacao | null>(null);
  const [motivo, setMotivo] = useState<string>(CAPTACAO_MOTIVOS_PERDA[0]);
  const [form, setForm] = useState({
    localizacao: "",
    proprietarioNome: "",
    telefone: "",
    tipo: "apartamento" as CaptacaoImovelTipo,
    valorPretendido: "",
    origem: "",
    responsavelId: getSession()?.id ?? "",
    proximaAcao: "",
    proximaAcaoEm: "",
  });

  function load() {
    setLoading(true);
    void Promise.all([
      fetchOportunidades().catch(() => [] as OportunidadeCaptacao[]),
      fetchCaptacaoResponsaveis().catch(() => [] as CaptacaoResponsavel[]),
    ])
      .then(([next, pessoas]) => {
        const abertas = next.filter((row) => row.status !== "convertida");
        const usarExemplo = abertas.length === 0;
        setExemplo(usarExemplo);
        setRows(usarExemplo ? OPORTUNIDADES_MOCK : abertas);
        setResponsaveis(pessoas);
        setForm((current) => ({
          ...current,
          responsavelId: current.responsavelId || pessoas[0]?.id || "",
        }));
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const criada = await createOportunidade({
        ...form,
        valorPretendido: form.valorPretendido
          ? Number(form.valorPretendido)
          : undefined,
        proximaAcaoEm: form.proximaAcaoEm || undefined,
      });
      toast.success("Oportunidade registrada. Agora envie as fotos e complete a ficha.");
      setOpen(false);
      setFicha(criada);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Banco de oportunidades"
        description={
          exemplo
            ? "Exemplos para visualizar o banco. Os registros reais substituem esta lista."
            : "Imóveis com potencial que ainda não entraram no funil de captação."
        }
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nova oportunidade
          </Button>
        }
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma oportunidade registrada.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const foto = row.imovel?.fotos?.[0]?.url || row.imovel?.fotoUrl || "";
            const quando = row.proximaAcaoEm
              ? ` · ${row.proximaAcaoEm.slice(8, 10)}/${row.proximaAcaoEm.slice(5, 7)}`
              : "";
            return (
              <li key={row.id}>
                <article className={cn(SOFT_SURFACE, "overflow-hidden")}>
                  <div className="grid gap-0 lg:grid-cols-[200px_minmax(0,1fr)]">
                    <div className="relative min-h-[180px] bg-muted">
                      {foto ? (
                        <img src={foto} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full min-h-[180px] items-center justify-center text-xs text-muted-foreground">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 p-4 sm:p-5">
                      <p className="mb-3 rounded-xl bg-[#E7F6FB] px-3 py-2 text-sm font-medium text-[#075985] dark:bg-[#079ED4]/15 dark:text-[#7DD3FC]">
                        {row.proximaAcao
                          ? `Próxima ação: ${row.proximaAcao}${quando}`
                          : "Sem próxima ação definida"}
                      </p>
                      <h2 className="text-base font-semibold tracking-tight">
                        {CAPTACAO_IMOVEL_TIPO_LABEL[row.tipo]}
                      </h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {row.proprietarioNome} · responsável {row.responsavel.name}
                      </p>
                      <p className="mt-3 text-sm tabular-nums">
                        <span className="font-semibold">{formatBrl(row.valorPretendido)}</span>
                        <span className="text-muted-foreground"> · {row.origem || "sem origem"}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {STATUS_LABEL[row.status]}
                        </span>
                        {exemplo ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            Exemplo
                          </span>
                        ) : null}
                        {row.telefone ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {row.telefone}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {row.localizacao}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button size="sm" variant="outline" onClick={() => setFicha(row)}>
                          Fotos e ficha
                        </Button>
                        {!exemplo && row.status === "aberta" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              void promoverOportunidade(row.id)
                                .then((captacao) => {
                                  toast.success("Captação cadastrada. Saiu do banco.");
                                  void navigate({
                                    to: "/captacao/captacoes/$id",
                                    params: { id: captacao.id },
                                  });
                                })
                                .catch((err) => {
                                  toast.error(
                                    err instanceof ApiError
                                      ? err.message
                                      : "Não foi possível cadastrar.",
                                  );
                                });
                            }}
                          >
                            Cadastrar em captações
                          </Button>
                        ) : null}
                        {!exemplo && row.status === "aberta" ? (
                          <Button size="sm" variant="ghost" onClick={() => setPerderId(row.id)}>
                            Perder
                          </Button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          onClick={() => setFicha(row)}
                        >
                          Ver detalhes
                          <ArrowRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova oportunidade</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
            <div className="space-y-1">
              <Label>Localização</Label>
              <Input
                required
                value={form.localizacao}
                onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                placeholder="Bairro, rua ou referência"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Proprietário</Label>
                <Input
                  required
                  value={form.proprietarioNome}
                  onChange={(e) =>
                    setForm({ ...form, proprietarioNome: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(tipo) =>
                    setForm({ ...form, tipo: tipo as CaptacaoImovelTipo })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPTACAO_IMOVEL_TIPOS.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {CAPTACAO_IMOVEL_TIPO_LABEL[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor pretendido</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.valorPretendido}
                  onChange={(e) =>
                    setForm({ ...form, valorPretendido: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Origem</Label>
                <Input
                  value={form.origem}
                  onChange={(e) => setForm({ ...form, origem: e.target.value })}
                  placeholder="Indicação, portaria, placa…"
                />
              </div>
              <div className="space-y-1">
                <Label>Responsável</Label>
                <Select
                  value={form.responsavelId}
                  onValueChange={(responsavelId) =>
                    setForm({ ...form, responsavelId })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Corretor" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsaveis.map((pessoa) => (
                      <SelectItem key={pessoa.id} value={pessoa.id}>
                        {pessoa.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Próxima ação</Label>
                <Input
                  value={form.proximaAcao}
                  onChange={(e) => setForm({ ...form, proximaAcao: e.target.value })}
                  placeholder="Ligar para o proprietário"
                />
              </div>
              <div className="space-y-1">
                <Label>Quando</Label>
                <Input
                  type="date"
                  value={form.proximaAcaoEm}
                  onChange={(e) =>
                    setForm({ ...form, proximaAcaoEm: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!perderId} onOpenChange={(value) => !value && setPerderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da perda</DialogTitle>
          </DialogHeader>
          <Select value={motivo} onValueChange={setMotivo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAPTACAO_MOTIVOS_PERDA.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (!perderId) return;
                void perderOportunidade(perderId, { motivoPerda: motivo })
                  .then(() => {
                    toast.success("Perda registrada. A tarefa de retorno foi criada.");
                    setPerderId(null);
                    load();
                  })
                  .catch((err) => {
                    toast.error(
                      err instanceof ApiError ? err.message : "Não foi possível registrar.",
                    );
                  });
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OportunidadeFichaDialog
        row={ficha}
        onClose={() => setFicha(null)}
        onCaptada={() => {
          setFicha(null);
          load();
        }}
      />
    </>
  );
}

function OportunidadeFichaDialog({
  row,
  onClose,
  onCaptada,
}: {
  row: OportunidadeCaptacao | null;
  onClose: () => void;
  onCaptada: () => void;
}) {
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [ficha, setFicha] = useState(emptyImovelFicha());
  const [fotoBusy, setFotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [captando, setCaptando] = useState(false);

  useEffect(() => {
    if (!row?.imovel?.id && !row?.imovelId) {
      setImovel(null);
      return;
    }
    const id = row.imovel?.id ?? row.imovelId;
    if (!id) return;
    void fetchCaptacaoImovel(id)
      .then((next) => {
        setImovel(next);
        setFicha(imovelToFicha(next));
      })
      .catch(() => setImovel(null));
  }, [row]);

  const fotos = imovelFotoItens({
    fotos: imovel?.fotos,
    fotoUrl: imovel?.fotoUrl,
  });

  return (
    <Dialog open={row != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha da oportunidade</DialogTitle>
        </DialogHeader>
        {row ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {row.proprietarioNome}
              {row.telefone ? ` · ${row.telefone}` : ""} · {row.localizacao}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotos.map((foto) => (
                <div key={foto.id ?? foto.url} className="relative">
                  <img src={foto.url} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                  {imovel && foto.id ? (
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-destructive"
                      disabled={fotoBusy}
                      onClick={() => {
                        setFotoBusy(true);
                        void deleteCaptacaoImovelFoto(imovel.id, foto.id!)
                          .then((next) => {
                            setImovel(next);
                            toast.success("Foto removida.");
                          })
                          .catch((err) => {
                            toast.error(err instanceof ApiError ? err.message : "Não foi possível remover.");
                          })
                          .finally(() => setFotoBusy(false));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {imovel ? (
              <Button asChild size="sm" variant="outline" disabled={fotoBusy || fotos.length >= IMOVEL_MAX_FOTOS}>
                <label className="cursor-pointer">
                  {fotoBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
                  Cadastrar imagem
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file || !imovel) return;
                      setFotoBusy(true);
                      void uploadCaptacaoImovelFoto(imovel.id, file)
                        .then((next) => {
                          setImovel(next);
                          toast.success("Foto enviada.");
                        })
                        .catch((err) => {
                          toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar.");
                        })
                        .finally(() => setFotoBusy(false));
                    }}
                  />
                </label>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta oportunidade ainda não tem imóvel vinculado para receber fotos.
              </p>
            )}
            {imovel ? (
              <ImovelFichaFields
                value={ficha}
                onChange={setFicha}
                resetKey={imovel.id}
              />
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          {imovel ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                void updateCaptacaoImovel(imovel.id, fichaToPayload(ficha))
                  .then((next) => {
                    setImovel(next);
                    toast.success("Ficha salva.");
                  })
                  .catch((err) => {
                    toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
                  })
                  .finally(() => setSaving(false));
              }}
            >
              Salvar ficha
            </Button>
          ) : null}
          {row && row.status === "aberta" && !row.id.startsWith("mock") ? (
            <Button
              disabled={captando}
              onClick={() => {
                setCaptando(true);
                void promoverOportunidade(row.id)
                  .then(() => {
                    toast.success("Captação cadastrada. A oportunidade saiu do banco.");
                    onCaptada();
                  })
                  .catch((err) => {
                    toast.error(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
                  })
                  .finally(() => setCaptando(false));
              }}
            >
              Cadastrar em captações
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

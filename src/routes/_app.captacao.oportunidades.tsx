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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FormDialogBody, FormDialogShell } from "@/components/form-dialog";
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
import { formatPhone } from "@/lib/phone";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  ImagePlus,
  Images,
  Loader2,
  MapPin,
  MoreVertical,
  Plus,
  Maximize2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/oportunidades")({
  component: OportunidadesPage,
});

const STATUS_LABEL = {
  aberta: "Aberta",
  convertida: "Virou captação",
  perdida: "Perdida",
} as const;

const STATUS_PILL = {
  aberta:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  convertida:
    "border-[#079ED4]/35 bg-[#E7F4FA] text-[#05749E] dark:border-[#079ED4]/40 dark:bg-[#079ED4]/15 dark:text-[#7DD3FC]",
  perdida:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300",
} as const;

function formatAcaoQuando(value: string | null | undefined) {
  if (!value) return "";
  const day = value.slice(8, 10);
  const month = value.slice(5, 7);
  if (!day || !month) return "";
  return `${day}/${month}`;
}

function SpecItem({
  icon: Icon,
  label,
}: {
  icon: typeof BedDouble;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-[#079ED4]" />
      {label}
    </span>
  );
}

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
            const quando = formatAcaoQuando(row.proximaAcaoEm);
            const telefone = formatPhone(row.telefone) || row.telefone;
            const quartos = row.imovel?.quartos;
            const vagas = row.imovel?.vagas;
            const area = row.imovel?.areaConstruida ?? row.imovel?.area;
            const specs = [
              quartos != null
                ? {
                    icon: BedDouble,
                    label: `${quartos} ${quartos === 1 ? "quarto" : "quartos"}`,
                  }
                : null,
              vagas != null
                ? {
                    icon: Car,
                    label: `${vagas} ${vagas === 1 ? "vaga" : "vagas"}`,
                  }
                : null,
              area != null
                ? { icon: Maximize2, label: `${area} m²` }
                : null,
            ].filter(Boolean) as Array<{
              icon: typeof BedDouble;
              label: string;
            }>;
            const canAct = !exemplo && row.status === "aberta";

            return (
              <li key={row.id}>
                <article className={cn(SOFT_SURFACE, "overflow-hidden")}>
                  <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)_minmax(11rem,15rem)]">
                    <div className="relative min-h-[200px] bg-[#E7F4FA] dark:bg-[#102838]">
                      {foto ? (
                        <img
                          src={foto}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-[#05749E] dark:text-[#7DD3FC]">
                          <Building2 className="size-8 opacity-50" />
                          <span className="text-xs">Sem foto</span>
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-lg bg-[#079ED4] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-sm">
                        Captação
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3 border-black/5 p-4 sm:p-5 lg:border-r dark:border-white/10">
                      <p className="inline-flex items-center gap-2 rounded-xl bg-[#E7F4FA] px-3 py-2 text-sm font-medium text-[#05749E] dark:bg-[#079ED4]/15 dark:text-[#7DD3FC]">
                        <CalendarDays className="size-4 shrink-0" />
                        <span className="min-w-0 truncate">
                          {row.proximaAcao
                            ? `Próxima ação: ${row.proximaAcao}${quando ? ` - ${quando}` : ""}`
                            : "Sem próxima ação definida"}
                        </span>
                      </p>

                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold tracking-tight text-[#0B3148] dark:text-[#f8fafc]">
                          {CAPTACAO_IMOVEL_TIPO_LABEL[row.tipo]}
                        </h2>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-[#5C6B76] dark:text-[#94a3b8]">
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#079ED4]" />
                          <span>
                            <span className="font-medium text-[#0B3148] dark:text-[#E7F4FA]">
                              {row.proprietarioNome}
                            </span>
                            {" - responsável "}
                            {row.responsavel.name}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                            STATUS_PILL[row.status],
                          )}
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                        {exemplo ? (
                          <span className="rounded-full border border-[#E2E8EC] bg-[#F4F7F8] px-2.5 py-0.5 text-[11px] font-medium text-[#5C6B76] dark:border-white/10 dark:bg-[#1c2430] dark:text-[#94a3b8]">
                            Exemplo
                          </span>
                        ) : null}
                        {telefone ? (
                          <span className="rounded-full border border-[#D3EBF5] bg-[#E7F4FA] px-2.5 py-0.5 text-[11px] font-medium text-[#05749E] dark:border-[#079ED4]/30 dark:bg-[#079ED4]/15 dark:text-[#7DD3FC]">
                            {telefone}
                          </span>
                        ) : null}
                      </div>

                      <p className="flex items-center gap-1.5 text-sm text-[#5C6B76] dark:text-[#94a3b8]">
                        <MapPin className="size-3.5 shrink-0 text-[#079ED4]" />
                        {row.localizacao}
                      </p>

                      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-[#0B3148]/20 text-[#0B3148] hover:bg-[#E7F4FA] dark:border-white/15 dark:text-[#E7F4FA] dark:hover:bg-[#1c2430]"
                          onClick={() => setFicha(row)}
                        >
                          <Images className="mr-1.5 size-3.5" />
                          Fotos e ficha
                        </Button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#079ED4] hover:underline"
                          onClick={() => setFicha(row)}
                        >
                          Ver detalhes
                          <ArrowRight className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="relative flex flex-col gap-3 p-4 sm:p-5">
                      <div className="absolute right-3 top-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#5C6B76] hover:bg-[#E7F4FA] hover:text-[#0B3148] dark:text-[#94a3b8] dark:hover:bg-[#1c2430]"
                              title="Ações"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setFicha(row)}>
                              <Images className="mr-2 size-3.5" />
                              Fotos e ficha
                            </DropdownMenuItem>
                            {canAct ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    void promoverOportunidade(row.id)
                                      .then((captacao) => {
                                        toast.success(
                                          "Captação cadastrada. Saiu do banco.",
                                        );
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
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setPerderId(row.id)}
                                >
                                  Perder
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="pr-8 pt-1">
                        <p className="text-xl font-semibold tabular-nums tracking-tight text-[#0B3148] dark:text-[#f8fafc] sm:text-2xl">
                          {formatBrl(row.valorPretendido)}
                        </p>
                        <p className="mt-1 text-sm text-[#8B98A3] dark:text-[#94a3b8]">
                          {row.origem || "Sem origem"}
                        </p>
                      </div>

                      {specs.length > 0 ? (
                        <div className="mt-auto rounded-xl bg-[#F3FAFD] px-3 py-3 text-xs font-medium text-[#0B3148] dark:bg-[#102838] dark:text-[#E7F4FA]">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                            {specs.slice(0, 2).map((item, index) => (
                              <span
                                key={item.label}
                                className="inline-flex items-center gap-2"
                              >
                                {index > 0 ? (
                                  <span className="text-[#B7D7E6] dark:text-white/20">
                                    |
                                  </span>
                                ) : null}
                                <SpecItem icon={item.icon} label={item.label} />
                              </span>
                            ))}
                          </div>
                          {specs[2] ? (
                            <div className="mt-2">
                              <SpecItem
                                icon={specs[2].icon}
                                label={specs[2].label}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-auto rounded-xl border border-dashed border-[#D3EBF5] px-3 py-3 text-xs text-[#8B98A3] dark:border-[#079ED4]/25 dark:text-[#94a3b8]">
                          Complete a ficha para exibir quartos, vagas e área.
                        </div>
                      )}
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
  const [photo, setPhoto] = useState(0);

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

  const fotos = imovel
    ? imovelFotoItens({
        fotos: imovel.fotos,
        fotoUrl: imovel.fotoUrl,
      })
    : (row?.imovel?.fotos ?? []).map((foto) => ({
        url: foto.url,
        id: undefined as string | undefined,
      }));

  const current = fotos[photo] ?? fotos[0];

  return (
    <FormDialogShell
      open={row != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={<Building2 className="h-5 w-5" />}
      title={row?.proprietarioNome ?? "Oportunidade"}
      description={row?.localizacao}
      footer={
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t px-4 py-3 sm:px-6">
          {imovel ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
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
              className="rounded-full"
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
        </div>
      }
    >
      {row ? (
        <FormDialogBody>
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Button type="button" variant="ghost" size="sm" className="-ml-2 rounded-full" onClick={onClose}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Oportunidades
            </Button>
            <span>/</span>
            <span className="font-medium text-foreground">{row.proprietarioNome}</span>
          </div>
          <section className="mb-6 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
            <div className="relative bg-white px-3 pb-4 pt-3 sm:px-6">
              <div className="absolute left-4 top-4 z-10 flex gap-2 sm:left-7 sm:right-7">
                <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950">
                  {STATUS_LABEL[row.status]}
                </span>
                <div className="ml-auto flex gap-2">
                  {row.origem ? (
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm">
                      {row.origem}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm">
                    {CAPTACAO_IMOVEL_TIPO_LABEL[row.tipo]}
                  </span>
                </div>
              </div>
              {current ? (
                <div className="relative mx-auto max-w-4xl">
                  <img
                    src={current.url}
                    alt=""
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
                      key={foto.url}
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
              {imovel ? (
                <div className="mx-auto mt-3 flex max-w-4xl justify-end gap-2">
                  {current?.id ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={fotoBusy}
                      onClick={() => {
                        setFotoBusy(true);
                        void deleteCaptacaoImovelFoto(imovel.id, current.id!)
                          .then((next) => {
                            setImovel(next);
                            setPhoto(0);
                            toast.success("Foto removida.");
                          })
                          .catch((err) => {
                            toast.error(err instanceof ApiError ? err.message : "Não foi possível remover.");
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
                </div>
              ) : null}
            </div>
            <div className="border-t border-border/60 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Oportunidade
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {row.proprietarioNome}
              </h2>
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {row.localizacao}
              </p>
            </div>
          </section>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Localização", row.localizacao],
              ["Proprietário", row.proprietarioNome],
              ["Telefone", row.telefone || "—"],
              ["Tipo", CAPTACAO_IMOVEL_TIPO_LABEL[row.tipo]],
              ["Valor pretendido", formatBrl(row.valorPretendido)],
              ["Origem", row.origem || "—"],
              ["Responsável", row.responsavel.name],
              ["Próxima ação", row.proximaAcao || "—"],
              [
                "Quando",
                row.proximaAcaoEm
                  ? `${row.proximaAcaoEm.slice(8, 10)}/${row.proximaAcaoEm.slice(5, 7)}/${row.proximaAcaoEm.slice(0, 4)}`
                  : "—",
              ],
              ["Status", STATUS_LABEL[row.status]],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#E2E8EC] bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#141a22]">
                <p className="text-[11px] text-[#5C6B76]">{label}</p>
                <p className="mt-1 truncate text-sm font-medium text-[#0B3148] dark:text-white">{value}</p>
              </div>
            ))}
          </div>
          {imovel ? (
            <ImovelFichaFields value={ficha} onChange={setFicha} resetKey={imovel.id} />
          ) : null}
        </FormDialogBody>
      ) : null}
    </FormDialogShell>
  );
}

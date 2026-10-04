import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { ImovelFichaFields } from "@/components/imovel-ficha-fields";
import { fichaToPayload, imovelToFicha } from "@/lib/imovel-ficha";
import { ImovelFichaVisao } from "@/components/imovel-ficha-visao";
import { fetchFunis, type Funil } from "@/lib/funis-api";
import { PillTabs } from "@/components/operacao-ui";
import {
  addNegociacaoMovimento,
  createPropostaUsado,
  createVisitaUsado,
  createContratoUsado,
  createDocumentoUsado,
  concluirFechamentoUsado,
  concluirPosVendaUsado,
  createChaveUsado,
  createPosVendaPendencia,
  devolverChaveUsado,
  entregarChaveComprador,
  fetchChaveHistorico,
  fetchChavesUsado,
  fetchPosVendaUsado,
  iniciarPosVendaUsado,
  perderChaveUsado,
  retirarChaveUsado,
  updatePosVendaPendencia,
  CHAVE_LOCALIZACAO_LABEL,
  CHAVE_STATUS_LABEL,
  POS_VENDA_STATUS_LABEL,
  feedbackVisitaUsado,
  fetchFechamentoUsado,
  fetchInteressadosUsado,
  fetchMatching,
  fetchPropostasUsado,
  fetchUsadosResponsaveis,
  fetchVendaUsado,
  fetchVisitasUsado,
  formatBrl,
  iniciarFechamentoUsado,
  INTERESSE_STATUS_LABEL,
  NEGOCIACAO_ORIGEM_LABEL,
  PROPOSTA_STATUS_LABEL,
  CONTRATO_STATUS_LABEL,
  DOCUMENTO_CATEGORIA_LABEL,
  DOCUMENTO_FORNECEDOR_LABEL,
  DOCUMENTO_STATUS_LABEL,
  FECHAMENTO_STATUS_LABEL,
  removerVinculo,
  updateContratoUsado,
  updateDocumentoUsado,
  updateFechamentoUsado,
  updatePropostaUsado,
  updateVendaUsado,
  updateVendaUsadoImovel,
  updateVinculo,
  updateVisitaUsado,
  VENDA_STATUS_LABEL,
  VISITA_INTERESSE_LABEL,
  VISITA_STATUS_LABEL,
  vincularInteressado,
  type DocumentoUsado,
  type DocumentoUsadoCategoria,
  type DocumentoUsadoFornecedor,
  type DocumentoUsadoStatus,
  type FechamentoUsado,
  type ImovelChave,
  type ImovelChaveMovimento,
  type PosVendaUsado,
  type InteresseUsadoStatus,
  type InteressadoUsado,
  type NegociacaoOrigem,
  type PropostaUsado,
  type PropostaUsadoStatus,
  type VendaUsado,
  type VendaUsadoStatus,
  type VisitaUsado,
  type VisitaUsadoInteresse,
  type VisitaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import { ApiError } from "@/lib/api";
import {
  deleteCaptacaoImovelFoto,
  imovelCapaUrl,
  imovelFotoItens,
  uploadCaptacaoImovelFoto,
} from "@/lib/captacao-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/vendas/$id")({
  component: VendaUsadoDetalhePage,
});

const TABS = [
  { id: "informacoes", label: "Informações" },
  { id: "comercializacao", label: "Comercialização" },
  { id: "interessados", label: "Interessados" },
  { id: "visitas", label: "Visitas" },
  { id: "propostas", label: "Propostas" },
  { id: "fechamento", label: "Fechamento" },
  { id: "documentacao", label: "Documentação" },
  { id: "contrato", label: "Contrato" },
  { id: "chaves", label: "Chaves" },
  { id: "pos-venda", label: "Pós-venda" },
  { id: "historico", label: "Histórico" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_OPTS: VendaUsadoStatus[] = [
  "disponivel",
  "reservado",
  "vendido",
  "indisponivel",
];

const INTERESSE_OPTS: InteresseUsadoStatus[] = [
  "novo",
  "em_contato",
  "interessado",
  "sem_interesse",
  "descartado",
];

const PROPOSTA_OPTS: PropostaUsadoStatus[] = [
  "rascunho",
  "enviada",
  "em_analise",
  "aceita",
  "recusada",
  "cancelada",
];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function VendaUsadoDetalhePage() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<TabId>("informacoes");
  const [item, setItem] = useState<VendaUsado | null>(null);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [responsaveis, setResponsaveis] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [matching, setMatching] = useState<InteressadoUsado[]>([]);
  const [todos, setTodos] = useState<InteressadoUsado[]>([]);
  const [visitas, setVisitas] = useState<VisitaUsado[]>([]);
  const [propostas, setPropostas] = useState<PropostaUsado[]>([]);
  const [fechamento, setFechamento] = useState<FechamentoUsado | null>(null);
  const [propostaAberta, setPropostaAberta] = useState<PropostaUsado | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preco, setPreco] = useState("");
  const [addId, setAddId] = useState("");
  const [visitaOpen, setVisitaOpen] = useState(false);
  const [propostaOpen, setPropostaOpen] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [visitaForm, setVisitaForm] = useState({
    interessadoId: "",
    responsavelId: "",
    dataHora: "",
    observacoes: "",
  });
  const [propostaForm, setPropostaForm] = useState({
    interessadoId: "",
    responsavelId: "",
    valor: "",
    entrada: "",
    valorFinanciamento: "",
    observacoes: "",
  });
  const [feedbackForm, setFeedbackForm] = useState({
    avaliacao: "4",
    interesse: "interessado" as VisitaUsadoInteresse,
    comentarios: "",
    observacoes: "",
  });
  const [contraForm, setContraForm] = useState({
    valor: "",
    entrada: "",
    valorFinanciamento: "",
    origem: "corretor" as NegociacaoOrigem,
    observacoes: "",
  });
  const [iniciarOpen, setIniciarOpen] = useState(false);
  const [iniciarPropostaId, setIniciarPropostaId] = useState("");
  const [docObs, setDocObs] = useState<Record<string, string>>({});
  const [novoDoc, setNovoDoc] = useState({
    categoria: "comprador" as DocumentoUsadoCategoria,
    tipo: "complementar",
    nome: "",
    fornecedor: "comprador" as DocumentoUsadoFornecedor,
  });
  const [contratoObs, setContratoObs] = useState("");
  const [chaves, setChaves] = useState<ImovelChave[]>([]);
  const [posVenda, setPosVenda] = useState<PosVendaUsado | null>(null);
  const [chaveHist, setChaveHist] = useState<ImovelChaveMovimento[] | null>(null);
  const [chaveForm, setChaveForm] = useState({
    identificacao: "Chave principal",
    quantidade: "1",
  });
  const [novaPendencia, setNovaPendencia] = useState("");
  const [fichaOpen, setFichaOpen] = useState(false);
  const [ficha, setFicha] = useState(imovelToFicha({}));
  const [fichaSaving, setFichaSaving] = useState(false);
  const [fotoBusy, setFotoBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [venda, list, users, match, all, vis, props, fecha, keys, pos] =
        await Promise.all([
        fetchVendaUsado(id),
        fetchFunis("venda_usados"),
        fetchUsadosResponsaveis(),
        fetchMatching(id),
        fetchInteressadosUsado(),
        fetchVisitasUsado(id),
        fetchPropostasUsado(id),
        fetchFechamentoUsado(id),
        fetchChavesUsado(id),
        fetchPosVendaUsado(id),
      ]);
      setItem(venda);
      setFunis(list);
      setResponsaveis(users);
      setMatching(match);
      setTodos(all);
      setVisitas(vis);
      setPropostas(props);
      setFechamento(fecha);
      setChaves(keys);
      setPosVenda(pos);
      setContratoObs(fecha?.contrato?.observacoes ?? "");
      setPreco(
        venda.precoVenda != null ? formatMoneyInput(venda.precoVenda) : "",
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
    funis.find((f) => f.id === item?.funil.id)?.etapas.filter((e) => e.active) ??
    [];
  const linkedIds = new Set((item?.vinculos ?? []).map((v) => v.interessado.id));
  const disponiveis = todos.filter((i) => !linkedIds.has(i.id));
  const vinculados = item?.vinculos ?? [];

  const proximas = useMemo(
    () =>
      visitas.filter(
        (v) => v.status === "agendada" || v.status === "confirmada",
      ),
    [visitas],
  );
  const historicoVisitas = useMemo(
    () =>
      visitas.filter(
        (v) => v.status !== "agendada" && v.status !== "confirmada",
      ),
    [visitas],
  );

  async function patch(body: Record<string, unknown>, ok: string) {
    setSaving(true);
    try {
      const updated = await updateVendaUsado(id, body);
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

  async function setVisitaStatus(visitaId: string, status: VisitaUsadoStatus) {
    try {
      const updated = await updateVisitaUsado(id, visitaId, { status });
      setVisitas((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      toast.success("Visita atualizada.");
      const venda = await fetchVendaUsado(id);
      setItem(venda);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível atualizar.",
      );
    }
  }

  const aceitas = propostas.filter((p) => p.status === "aceita");
  const fechamentoAberto =
    fechamento &&
    fechamento.status !== "concluido" &&
    fechamento.status !== "cancelado";
  const categorias: DocumentoUsadoCategoria[] = [
    "comprador",
    "proprietario",
    "imovel",
    "venda",
  ];

  async function refreshFechamento() {
    const [fecha, venda] = await Promise.all([
      fetchFechamentoUsado(id),
      fetchVendaUsado(id),
    ]);
    setFechamento(fecha);
    setItem(venda);
    if (fecha?.contrato) setContratoObs(fecha.contrato.observacoes);
  }

  async function markDoc(documentoId: string, status: DocumentoUsadoStatus) {
    try {
      await updateDocumentoUsado(id, documentoId, {
        status,
        observacao: docObs[documentoId],
      });
      toast.success("Documento atualizado.");
      await refreshFechamento();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível atualizar.",
      );
    }
  }

  function docMark(status: DocumentoUsadoStatus) {
    if (status === "aprovado") return "✓";
    if (status === "recusado") return "✗";
    if (status === "pendente") return "○";
    return "⚠";
  }

  if (loading || !item) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  const im = item.imovel;

  return (
    <>
      <PageHeader
        title={im.titulo}
        description={`${formatBrl(item.precoVenda)} · ${VENDA_STATUS_LABEL[item.status]} · ${item.responsavel.name}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/imoveis">Voltar ao catálogo</Link>
          </Button>
        }
      />
      {imovelCapaUrl(im) ? (
        <img
          src={imovelCapaUrl(im) ?? ""}
          alt=""
          className="max-h-64 w-full rounded-2xl object-cover"
        />
      ) : null}
      <PillTabs
        items={[...TABS]}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {tab === "informacoes" ? (
        <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Informações</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFicha(imovelToFicha(im));
                setFichaOpen(true);
              }}
            >
              Editar ficha
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Endereço: {im.logradouro}, {im.numero}
              {im.complemento ? ` — ${im.complemento}` : ""}
            </p>
            <p>
              {im.bairro} · {im.cidade}/{im.estado}
            </p>
            <p>Preço: {formatBrl(item.precoVenda)}</p>
            <p>
              Proprietário:{" "}
              {im.proprietarioId ? (
                <Link
                  to="/captacao/proprietarios/$id"
                  params={{ id: im.proprietarioId }}
                  className="hover:underline"
                >
                  {im.proprietario?.nome ?? "—"}
                </Link>
              ) : (
                im.proprietario?.nome ?? "—"
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <ImovelFichaVisao imovel={im} />
          </CardContent>
        </Card>
        {im.descricao ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descrição do anúncio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{im.descricao}</p>
            </CardContent>
          </Card>
        ) : null}
        </div>
      ) : null}

      {tab === "comercializacao" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comercialização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm max-w-lg">
            <div>
              <Label>Status</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={item.status}
                disabled={saving}
                onChange={(e) =>
                  void patch({ status: e.target.value }, "Status atualizado.")
                }
              >
                {STATUS_OPTS.map((s) => (
                  <option key={s} value={s}>
                    {VENDA_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Responsável</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={item.responsavel.id}
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
            <div>
              <Label>Preço de venda</Label>
              <Input
                inputMode="numeric"
                placeholder="0,00"
                value={preco}
                onChange={(e) => setPreco(maskMoneyInput(e.target.value))}
              />
              <Button
                className="mt-2"
                size="sm"
                disabled={saving}
                onClick={() =>
                  void patch(
                    { precoVenda: parseOptionalMoneyInput(preco) },
                    "Preço atualizado.",
                  )
                }
              >
                Salvar preço
              </Button>
            </div>
            <p>Funil: {item.funil.name}</p>
            <div>
              <Label>Etapa atual</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={item.funilEtapa.id}
                disabled={saving}
                onChange={(e) =>
                  void patch(
                    { funilEtapaId: e.target.value },
                    "Etapa atualizada.",
                  )
                }
              >
                {etapas.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-muted-foreground">
              Disponibilizado em{" "}
              {new Date(item.dataDisponibilizacao).toLocaleDateString("pt-BR")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "interessados" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interessados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vinculados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum interessado vinculado.
                </p>
              ) : (
                <ul className="space-y-3">
                  {vinculados.map((v) => (
                    <li key={v.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{v.interessado.nome}</span>
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                          value={v.interesse}
                          disabled={saving}
                          onChange={(e) => {
                            setSaving(true);
                            void updateVinculo(id, v.id, {
                              interesse: e.target.value as InteresseUsadoStatus,
                            })
                              .then(setItem)
                              .then(() => toast.success("Interesse atualizado."))
                              .catch((err) =>
                                toast.error(
                                  err instanceof ApiError
                                    ? err.message
                                    : "Não foi possível atualizar.",
                                ),
                              )
                              .finally(() => setSaving(false));
                          }}
                        >
                          {INTERESSE_OPTS.map((s) => (
                            <option key={s} value={s}>
                              {INTERESSE_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        className="mt-2"
                        placeholder="Observação"
                        defaultValue={v.observacoes}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value === v.observacoes) return;
                          void updateVinculo(id, v.id, { observacoes: value })
                            .then(setItem)
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Não foi possível salvar a observação.",
                              ),
                            );
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 px-0"
                        onClick={() => {
                          void removerVinculo(id, v.id)
                            .then(setItem)
                            .then(() => {
                              toast.success("Interessado removido.");
                              return fetchMatching(id).then(setMatching);
                            })
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Não foi possível remover.",
                              ),
                            );
                        }}
                      >
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 min-w-40 flex-1 rounded-md border bg-background px-3 text-sm"
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                >
                  <option value="">Adicionar interessado</option>
                  {disponiveis.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!addId || saving}
                  onClick={() => {
                    setSaving(true);
                    void vincularInteressado(id, { interessadoId: addId })
                      .then(setItem)
                      .then(() => {
                        setAddId("");
                        toast.success("Interessado vinculado.");
                        return fetchMatching(id).then(setMatching);
                      })
                      .catch((err) =>
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível vincular.",
                        ),
                      )
                      .finally(() => setSaving(false));
                  }}
                >
                  Adicionar
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/imoveis-usados/interessados">Cadastrar novo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Possíveis interessados</CardTitle>
            </CardHeader>
            <CardContent>
              {matching.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum perfil compatível ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {matching.map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{i.nome}</p>
                        <p className="text-muted-foreground">
                          {formatBrl(i.precoMin)} — {formatBrl(i.precoMax)}
                          {i.cidade ? ` · ${i.cidade}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void vincularInteressado(id, { interessadoId: i.id })
                            .then(setItem)
                            .then(() => {
                              toast.success("Interessado vinculado.");
                              return fetchMatching(id).then(setMatching);
                            })
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Não foi possível vincular.",
                              ),
                            );
                        }}
                      >
                        Adicionar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "visitas" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setVisitaForm({
                  interessadoId: vinculados[0]?.interessado.id ?? todos[0]?.id ?? "",
                  responsavelId: item.responsavel.id,
                  dataHora: toLocalInput(new Date().toISOString()),
                  observacoes: "",
                });
                setVisitaOpen(true);
              }}
            >
              Agendar visita
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximas visitas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {proximas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma visita agendada.</p>
              ) : (
                proximas.map((v) => (
                  <VisitaCard
                    key={v.id}
                    visita={v}
                    onStatus={(s) => void setVisitaStatus(v.id, s)}
                    onFeedback={() => {
                      setFeedbackId(v.id);
                      setFeedbackForm({
                        avaliacao: "4",
                        interesse: "interessado",
                        comentarios: "",
                        observacoes: "",
                      });
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {historicoVisitas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem visitas encerradas.</p>
              ) : (
                historicoVisitas.map((v) => (
                  <VisitaCard
                    key={v.id}
                    visita={v}
                    onStatus={(s) => void setVisitaStatus(v.id, s)}
                    onFeedback={() => {
                      setFeedbackId(v.id);
                      setFeedbackForm({
                        avaliacao: String(v.feedbackAvaliacao ?? 4),
                        interesse: v.feedbackInteresse ?? "interessado",
                        comentarios: v.feedbackComentarios,
                        observacoes: v.feedbackObservacoes,
                      });
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "propostas" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setPropostaForm({
                  interessadoId: vinculados[0]?.interessado.id ?? "",
                  responsavelId: item.responsavel.id,
                  valor: item.precoVenda != null ? formatMoneyInput(item.precoVenda) : "",
                  entrada: "",
                  valorFinanciamento: "",
                  observacoes: "",
                });
                setPropostaOpen(true);
              }}
            >
              Nova proposta
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Propostas recebidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {propostas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>
              ) : (
                propostas.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{p.interessado.nome}</p>
                        <p>
                          {formatBrl(p.valorAtual ?? p.valor)} ·{" "}
                          {PROPOSTA_STATUS_LABEL[p.status]}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                          value={p.status}
                          onChange={(e) => {
                            void updatePropostaUsado(id, p.id, {
                              status: e.target.value,
                            })
                              .then((updated) => {
                                setPropostas((prev) =>
                                  prev.map((x) =>
                                    x.id === updated.id ? updated : x,
                                  ),
                                );
                                toast.success("Status da proposta atualizado.");
                                return fetchVendaUsado(id).then(setItem);
                              })
                              .catch((err) =>
                                toast.error(
                                  err instanceof ApiError
                                    ? err.message
                                    : "Não foi possível atualizar.",
                                ),
                              );
                          }}
                        >
                          {PROPOSTA_OPTS.map((s) => (
                            <option key={s} value={s}>
                              {PROPOSTA_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPropostaAberta(p);
                            setContraForm({
                              valor:
                                p.valorAtual != null
                                  ? formatMoneyInput(p.valorAtual)
                                  : formatMoneyInput(p.valor),
                              entrada:
                                p.entrada != null
                                  ? formatMoneyInput(p.entrada)
                                  : "",
                              valorFinanciamento:
                                p.valorFinanciamento != null
                                  ? formatMoneyInput(p.valorFinanciamento)
                                  : "",
                              origem: "corretor",
                              observacoes: "",
                            });
                          }}
                        >
                          Abrir negociação
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "fechamento" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fechamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!fechamento || fechamento.status === "cancelado" ? (
              <p className="text-muted-foreground">
                {fechamento?.status === "cancelado"
                  ? "O fechamento anterior foi cancelado. Uma proposta aceita é necessária para iniciar novamente."
                  : "A venda só é concluída pelo fechamento. Inicie após aceitar uma proposta."}
              </p>
            ) : (
              <>
                <p>
                  Status:{" "}
                  <span className="font-medium">
                    {FECHAMENTO_STATUS_LABEL[fechamento.status]}
                  </span>
                </p>
                <p>Comprador: {fechamento.interessado.nome}</p>
                <p>Proposta: {formatBrl(fechamento.proposta.valor)}</p>
                <p>Responsável: {fechamento.responsavel.name}</p>
                <p>
                  Documentação: {fechamento.documentacao.aprovados}/
                  {fechamento.documentacao.obrigatorios} obrigatórios
                  aprovados
                </p>
                <p>
                  Contrato:{" "}
                  {fechamento.contrato
                    ? CONTRATO_STATUS_LABEL[fechamento.contrato.status]
                    : "Não criado"}
                </p>
              </>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {!fechamentoAberto ? (
                <Button
                  size="sm"
                  disabled={!aceitas.length}
                  onClick={() => {
                    setIniciarPropostaId(aceitas[0]?.id ?? "");
                    setIniciarOpen(true);
                  }}
                >
                  Iniciar fechamento
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTab("documentacao")}
                  >
                    Continuar fechamento
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void updateFechamentoUsado(id, { status: "cancelado" })
                        .then(() => {
                          toast.success("Fechamento cancelado.");
                          return refreshFechamento();
                        })
                        .catch((err) =>
                          toast.error(
                            err instanceof ApiError
                              ? err.message
                              : "Não foi possível cancelar.",
                          ),
                        );
                    }}
                  >
                    Cancelar fechamento
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      void concluirFechamentoUsado(id)
                        .then(() => {
                          toast.success("Venda concluída.");
                          return load();
                        })
                        .catch((err) =>
                          toast.error(
                            err instanceof ApiError
                              ? err.message
                              : "Não foi possível concluir.",
                          ),
                        );
                    }}
                  >
                    Concluir venda
                  </Button>
                </>
              )}
            </div>
            {!aceitas.length && !fechamentoAberto ? (
              <p className="text-xs text-muted-foreground">
                Aceite uma proposta na aba Propostas para iniciar o fechamento.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "documentacao" ? (
        <div className="space-y-4">
          {!fechamentoAberto ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Inicie o fechamento para controlar o checklist de documentos.
                Os arquivos ficam fora do CRM.
              </CardContent>
            </Card>
          ) : (
            <>
              {categorias.map((cat) => {
                const items = (fechamento?.documentos ?? []).filter(
                  (d) => d.categoria === cat,
                );
                if (!items.length) return null;
                return (
                  <Card key={cat}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {DOCUMENTO_CATEGORIA_LABEL[cat]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {items.map((d) => (
                        <DocumentoItem
                          key={d.id}
                          doc={d}
                          obs={docObs[d.id] ?? d.observacao}
                          onObs={(value) =>
                            setDocObs((prev) => ({ ...prev, [d.id]: value }))
                          }
                          mark={docMark(d.status)}
                          onStatus={(status) => void markDoc(d.id, status)}
                          onSaveObs={() =>
                            void updateDocumentoUsado(id, d.id, {
                              observacao: docObs[d.id] ?? d.observacao,
                            })
                              .then(() => {
                                toast.success("Observação salva.");
                                return refreshFechamento();
                              })
                              .catch((err) =>
                                toast.error(
                                  err instanceof ApiError
                                    ? err.message
                                    : "Não foi possível salvar.",
                                ),
                              )
                          }
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Adicionar item</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
                  <select
                    className="h-9 rounded-md border bg-background px-3"
                    value={novoDoc.categoria}
                    onChange={(e) =>
                      setNovoDoc({
                        ...novoDoc,
                        categoria: e.target.value as DocumentoUsadoCategoria,
                      })
                    }
                  >
                    {categorias.map((c) => (
                      <option key={c} value={c}>
                        {DOCUMENTO_CATEGORIA_LABEL[c]}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border bg-background px-3"
                    value={novoDoc.fornecedor}
                    onChange={(e) =>
                      setNovoDoc({
                        ...novoDoc,
                        fornecedor: e.target.value as DocumentoUsadoFornecedor,
                      })
                    }
                  >
                    {(
                      Object.keys(
                        DOCUMENTO_FORNECEDOR_LABEL,
                      ) as DocumentoUsadoFornecedor[]
                    ).map((k) => (
                      <option key={k} value={k}>
                        {DOCUMENTO_FORNECEDOR_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Nome do documento"
                    value={novoDoc.nome}
                    onChange={(e) =>
                      setNovoDoc({ ...novoDoc, nome: e.target.value })
                    }
                  />
                  <Button
                    size="sm"
                    disabled={!novoDoc.nome.trim()}
                    onClick={() => {
                      void createDocumentoUsado(id, {
                        categoria: novoDoc.categoria,
                        tipo: "complementar",
                        nome: novoDoc.nome,
                        fornecedor: novoDoc.fornecedor,
                        obrigatorio: false,
                      })
                        .then(() => {
                          toast.success("Item adicionado.");
                          setNovoDoc({ ...novoDoc, nome: "" });
                          return refreshFechamento();
                        })
                        .catch((err) =>
                          toast.error(
                            err instanceof ApiError
                              ? err.message
                              : "Não foi possível adicionar.",
                          ),
                        );
                    }}
                  >
                    Adicionar
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : null}

      {tab === "contrato" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!fechamentoAberto ? (
              <p className="text-muted-foreground">
                Inicie o fechamento para controlar o contrato. O arquivo do
                contrato não é armazenado no CRM.
              </p>
            ) : !fechamento?.contrato ? (
              <>
                <p className="text-muted-foreground">
                  Nenhum contrato criado. O CRM controla apenas número, datas e
                  status.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    void createContratoUsado(id)
                      .then(() => {
                        toast.success("Contrato criado.");
                        return refreshFechamento();
                      })
                      .catch((err) =>
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível criar.",
                        ),
                      );
                  }}
                >
                  Criar contrato
                </Button>
              </>
            ) : (
              <>
                <p>
                  Contrato Nº:{" "}
                  <span className="font-medium">{fechamento.contrato.numero}</span>
                </p>
                <p>
                  Status: {CONTRATO_STATUS_LABEL[fechamento.contrato.status]}
                </p>
                <p>
                  Criado em:{" "}
                  {new Date(fechamento.contrato.dataCriacao).toLocaleString(
                    "pt-BR",
                  )}
                </p>
                <p>
                  Data de envio:{" "}
                  {fechamento.contrato.dataEnvio
                    ? new Date(fechamento.contrato.dataEnvio).toLocaleString(
                        "pt-BR",
                      )
                    : "—"}
                </p>
                <p>
                  Assinatura:{" "}
                  {fechamento.contrato.dataAssinatura
                    ? `${new Date(fechamento.contrato.dataAssinatura).toLocaleString("pt-BR")}${
                        fechamento.contrato.assinadoPor
                          ? ` · ${fechamento.contrato.assinadoPor.name}`
                          : ""
                      }`
                    : "—"}
                </p>
                <div>
                  <Label>Observações</Label>
                  <Input
                    className="mt-1"
                    value={contratoObs}
                    onChange={(e) => setContratoObs(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {fechamento.contrato.status === "rascunho" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        void updateContratoUsado(id, {
                          status: "em_elaboracao",
                          observacoes: contratoObs,
                        })
                          .then(() => {
                            toast.success("Contrato em elaboração.");
                            return refreshFechamento();
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível atualizar.",
                            ),
                          )
                      }
                    >
                      Em elaboração
                    </Button>
                  ) : null}
                  {fechamento.contrato.status === "em_elaboracao" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        void updateContratoUsado(id, {
                          status: "enviado",
                          observacoes: contratoObs,
                        })
                          .then(() => {
                            toast.success("Contrato enviado.");
                            return refreshFechamento();
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível enviar.",
                            ),
                          )
                      }
                    >
                      Enviar
                    </Button>
                  ) : null}
                  {fechamento.contrato.status === "enviado" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        void updateContratoUsado(id, {
                          status: "aguardando_assinatura",
                        })
                          .then(() => {
                            toast.success("Aguardando assinatura.");
                            return refreshFechamento();
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível atualizar.",
                            ),
                          )
                      }
                    >
                      Aguardando assinatura
                    </Button>
                  ) : null}
                  {fechamento.contrato.status === "aguardando_assinatura" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        void updateContratoUsado(id, { status: "assinado" })
                          .then(() => {
                            toast.success("Assinatura registrada.");
                            return refreshFechamento();
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível registrar.",
                            ),
                          )
                      }
                    >
                      Marcar como assinado
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void updateContratoUsado(id, { observacoes: contratoObs })
                        .then(() => {
                          toast.success("Contrato atualizado.");
                          return refreshFechamento();
                        })
                        .catch((err) =>
                          toast.error(
                            err instanceof ApiError
                              ? err.message
                              : "Não foi possível salvar.",
                          ),
                        )
                    }
                  >
                    Salvar observações
                  </Button>
                  {fechamento.contrato.status !== "assinado" &&
                  fechamento.contrato.status !== "cancelado" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void updateContratoUsado(id, { status: "cancelado" })
                          .then(() => {
                            toast.success("Contrato cancelado.");
                            return refreshFechamento();
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível cancelar.",
                            ),
                          )
                      }
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "chaves" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadastrar chave</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm">
              <Input
                className="max-w-xs"
                value={chaveForm.identificacao}
                onChange={(e) =>
                  setChaveForm({ ...chaveForm, identificacao: e.target.value })
                }
                placeholder="Identificação"
              />
              <Input
                className="w-24"
                type="number"
                min={1}
                value={chaveForm.quantidade}
                onChange={(e) =>
                  setChaveForm({ ...chaveForm, quantidade: e.target.value })
                }
              />
              <Button
                size="sm"
                onClick={() => {
                  void createChaveUsado(id, {
                    identificacao: chaveForm.identificacao,
                    quantidade: Number(chaveForm.quantidade) || 1,
                  })
                    .then(() => {
                      toast.success("Chave cadastrada.");
                      return load();
                    })
                    .catch((err) =>
                      toast.error(
                        err instanceof ApiError
                          ? err.message
                          : "Não foi possível cadastrar.",
                      ),
                    );
                }}
              >
                Cadastrar
              </Button>
            </CardContent>
          </Card>
          {chaves.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma chave cadastrada.</p>
          ) : (
            chaves.map((c) => (
              <Card key={c.id}>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <p className="font-medium">{c.identificacao}</p>
                  <p>
                    Quantidade: {c.quantidade} · Status: {CHAVE_STATUS_LABEL[c.status]}
                  </p>
                  <p>
                    Localização: {CHAVE_LOCALIZACAO_LABEL[c.localizacaoAtual]}
                    {c.responsavelAtual ? ` · Com: ${c.responsavelAtual.name}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {c.status !== "perdida" && c.status !== "inativa" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void retirarChaveUsado(id, c.id, {
                              quantidade: 1,
                              motivo: "Visita ao imóvel",
                            })
                              .then(() => {
                                toast.success("Chave retirada.");
                                return load();
                              })
                              .catch((err) =>
                                toast.error(
                                  err instanceof ApiError
                                    ? err.message
                                    : "Não foi possível retirar.",
                                ),
                              )
                          }
                        >
                          Retirar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void devolverChaveUsado(id, c.id, { quantidade: 1 })
                              .then(() => {
                                toast.success("Chave devolvida.");
                                return load();
                              })
                              .catch((err) =>
                                toast.error(
                                  err instanceof ApiError
                                    ? err.message
                                    : "Não foi possível devolver.",
                                ),
                              )
                          }
                        >
                          Devolver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void entregarChaveComprador(id, c.id, { quantidade: 1 })
                              .then(() => {
                                toast.success("Entrega ao comprador registrada.");
                                return load();
                              })
                              .catch((err) =>
                                toast.error(
                                  err instanceof ApiError
                                    ? err.message
                                    : "Não foi possível registrar.",
                                ),
                              )
                          }
                        >
                          Entregar ao comprador
                        </Button>
                      </>
                    ) : null}
                    {c.status !== "perdida" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void perderChaveUsado(id, c.id)
                            .then(() => {
                              toast.success("Chave marcada como perdida.");
                              return load();
                            })
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Não foi possível marcar.",
                              ),
                            )
                        }
                      >
                        Marcar como perdida
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void fetchChaveHistorico(id, c.id)
                          .then(setChaveHist)
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível carregar o histórico.",
                            ),
                          )
                      }
                    >
                      Histórico
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {chaveHist ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico das chaves</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {chaveHist.map((m) => (
                    <li key={m.id}>
                      {new Date(m.createdAt).toLocaleString("pt-BR")} ·{" "}
                      {m.responsavel?.name ?? "—"} · {m.tipo} {m.quantidade}x
                      {m.motivo ? ` · ${m.motivo}` : ""}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "pos-venda" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pós-venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!posVenda ? (
              <>
                <p className="text-muted-foreground">
                  O pós-venda só pode ser iniciado depois da venda concluída.
                </p>
                <Button
                  size="sm"
                  disabled={item.status !== "vendido"}
                  onClick={() =>
                    void iniciarPosVendaUsado(id)
                      .then(() => {
                        toast.success("Pós-venda iniciado.");
                        return load();
                      })
                      .catch((err) =>
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível iniciar.",
                        ),
                      )
                  }
                >
                  Iniciar pós-venda
                </Button>
              </>
            ) : (
              <>
                <p>
                  Status:{" "}
                  <span className="font-medium">
                    {POS_VENDA_STATUS_LABEL[posVenda.status]}
                  </span>
                </p>
                <p>Responsável: {posVenda.responsavel.name}</p>
                <p>
                  Comprador: {posVenda.interessado.nome} · Proprietário:{" "}
                  {posVenda.proprietario.nome}
                </p>
                <p>
                  Pendências: {posVenda.resumo.concluidas} de {posVenda.resumo.total}{" "}
                  concluídas
                </p>
                <div className="space-y-2">
                  {posVenda.pendencias.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-3 ${p.atrasada ? "border-destructive" : ""}`}
                    >
                      <p>
                        {p.status === "concluida"
                          ? "✓"
                          : p.status === "cancelada"
                            ? "○"
                            : "⚠"}{" "}
                        {p.titulo}
                        {p.obrigatoria ? " (obrigatória)" : ""}
                        {p.atrasada ? " — atrasada" : ""}
                      </p>
                      {p.prazo ? (
                        <p className="text-xs text-muted-foreground">
                          Prazo: {new Date(p.prazo).toLocaleDateString("pt-BR")}
                        </p>
                      ) : null}
                      {p.status !== "concluida" &&
                      p.status !== "cancelada" &&
                      posVenda.status !== "concluido" &&
                      posVenda.status !== "cancelado" ? (
                        <div className="mt-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void updatePosVendaPendencia(id, p.id, {
                                status: "concluida",
                              })
                                .then(() => load())
                                .catch((err) =>
                                  toast.error(
                                    err instanceof ApiError
                                      ? err.message
                                      : "Não foi possível concluir.",
                                  ),
                                )
                            }
                          >
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void updatePosVendaPendencia(id, p.id, {
                                status: "cancelada",
                              })
                                .then(() => load())
                                .catch((err) =>
                                  toast.error(
                                    err instanceof ApiError
                                      ? err.message
                                      : "Não foi possível cancelar.",
                                  ),
                                )
                            }
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                {posVenda.status !== "concluido" && posVenda.status !== "cancelado" ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      placeholder="Nova pendência"
                      value={novaPendencia}
                      onChange={(e) => setNovaPendencia(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={!novaPendencia.trim()}
                      onClick={() =>
                        void createPosVendaPendencia(id, {
                          titulo: novaPendencia,
                          obrigatoria: false,
                        })
                          .then(() => {
                            setNovaPendencia("");
                            toast.success("Pendência adicionada.");
                            return load();
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível adicionar.",
                            ),
                          )
                      }
                    >
                      Adicionar pendência
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        void concluirPosVendaUsado(id)
                          .then(() => {
                            toast.success("Pós-venda concluído.");
                            return load();
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível concluir.",
                            ),
                          )
                      }
                    >
                      Concluir pós-venda
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "historico" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {(item.historicos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos ainda.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {item.historicos!.map((h) => (
                  <li key={h.id} className="border-b pb-2 last:border-0">
                    <p className="whitespace-pre-line">{h.texto}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.autor?.name ?? "Sistema"} ·{" "}
                      {new Date(h.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={iniciarOpen} onOpenChange={setIniciarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar fechamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Selecione a proposta aceita. O imóvel não será marcado como
              vendido nesta etapa.
            </p>
            <select
              className="h-9 rounded-md border bg-background px-3"
              value={iniciarPropostaId}
              onChange={(e) => setIniciarPropostaId(e.target.value)}
            >
              {aceitas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.interessado.nome} · {formatBrl(p.valorAtual ?? p.valor)}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              disabled={!iniciarPropostaId}
              onClick={() => {
                void iniciarFechamentoUsado(id, {
                  propostaId: iniciarPropostaId,
                  responsavelId: item.responsavel.id,
                })
                  .then(() => {
                    toast.success("Fechamento iniciado.");
                    setIniciarOpen(false);
                    return load();
                  })
                  .catch((err) =>
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Não foi possível iniciar.",
                    ),
                  );
              }}
            >
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={visitaOpen} onOpenChange={setVisitaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar visita</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Interessado</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={visitaForm.interessadoId}
                onChange={(e) =>
                  setVisitaForm({ ...visitaForm, interessadoId: e.target.value })
                }
              >
                <option value="">Selecione</option>
                {vinculados.map((v) => (
                  <option key={v.interessado.id} value={v.interessado.id}>
                    {v.interessado.nome}
                  </option>
                ))}
                {todos
                  .filter((i) => !linkedIds.has(i.id))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome} (vincular)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label>Responsável</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={visitaForm.responsavelId}
                onChange={(e) =>
                  setVisitaForm({ ...visitaForm, responsavelId: e.target.value })
                }
              >
                {responsaveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Data e horário</Label>
              <Input
                type="datetime-local"
                value={visitaForm.dataHora}
                onChange={(e) =>
                  setVisitaForm({ ...visitaForm, dataHora: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={visitaForm.observacoes}
                onChange={(e) =>
                  setVisitaForm({ ...visitaForm, observacoes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={saving || !visitaForm.interessadoId}
              onClick={() => {
                setSaving(true);
                void createVisitaUsado(id, {
                  interessadoId: visitaForm.interessadoId,
                  responsavelId: visitaForm.responsavelId,
                  dataHora: new Date(visitaForm.dataHora).toISOString(),
                  observacoes: visitaForm.observacoes,
                })
                  .then(() => {
                    toast.success("Visita agendada.");
                    setVisitaOpen(false);
                    return load();
                  })
                  .catch((err) =>
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Não foi possível agendar.",
                    ),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(feedbackId)} onOpenChange={() => setFeedbackId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback da visita</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Avaliação</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={feedbackForm.avaliacao}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, avaliacao: e.target.value })
                }
              >
                <option value="1">1 — Muito ruim</option>
                <option value="2">2 — Ruim</option>
                <option value="3">3 — Regular</option>
                <option value="4">4 — Boa</option>
                <option value="5">5 — Excelente</option>
              </select>
            </div>
            <div>
              <Label>Interesse</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={feedbackForm.interesse}
                onChange={(e) =>
                  setFeedbackForm({
                    ...feedbackForm,
                    interesse: e.target.value as VisitaUsadoInteresse,
                  })
                }
              >
                {(Object.keys(VISITA_INTERESSE_LABEL) as VisitaUsadoInteresse[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {VISITA_INTERESSE_LABEL[k]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label>Comentários</Label>
              <Input
                value={feedbackForm.comentarios}
                onChange={(e) =>
                  setFeedbackForm({
                    ...feedbackForm,
                    comentarios: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={feedbackForm.observacoes}
                onChange={(e) =>
                  setFeedbackForm({
                    ...feedbackForm,
                    observacoes: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!feedbackId}
              onClick={() => {
                if (!feedbackId) return;
                void feedbackVisitaUsado(id, feedbackId, {
                  avaliacao: Number(feedbackForm.avaliacao),
                  interesse: feedbackForm.interesse,
                  comentarios: feedbackForm.comentarios,
                  observacoes: feedbackForm.observacoes,
                })
                  .then((updated) => {
                    setVisitas((prev) =>
                      prev.map((v) => (v.id === updated.id ? updated : v)),
                    );
                    toast.success("Feedback registrado.");
                    setFeedbackId(null);
                    return fetchVendaUsado(id).then(setItem);
                  })
                  .catch((err) =>
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Não foi possível registrar o feedback.",
                    ),
                  );
              }}
            >
              Salvar feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={propostaOpen} onOpenChange={setPropostaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova proposta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Interessado</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={propostaForm.interessadoId}
                onChange={(e) =>
                  setPropostaForm({
                    ...propostaForm,
                    interessadoId: e.target.value,
                  })
                }
              >
                <option value="">Selecione</option>
                {vinculados.map((v) => (
                  <option key={v.interessado.id} value={v.interessado.id}>
                    {v.interessado.nome}
                  </option>
                ))}
                {todos
                  .filter((i) => !linkedIds.has(i.id))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome} (vincular)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label>Responsável</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={propostaForm.responsavelId}
                onChange={(e) =>
                  setPropostaForm({
                    ...propostaForm,
                    responsavelId: e.target.value,
                  })
                }
              >
                {responsaveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                inputMode="numeric"
                value={propostaForm.valor}
                onChange={(e) =>
                  setPropostaForm({
                    ...propostaForm,
                    valor: maskMoneyInput(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Entrada</Label>
                <Input
                  inputMode="numeric"
                  value={propostaForm.entrada}
                  onChange={(e) =>
                    setPropostaForm({
                      ...propostaForm,
                      entrada: maskMoneyInput(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Financiamento</Label>
                <Input
                  inputMode="numeric"
                  value={propostaForm.valorFinanciamento}
                  onChange={(e) =>
                    setPropostaForm({
                      ...propostaForm,
                      valorFinanciamento: maskMoneyInput(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={propostaForm.observacoes}
                onChange={(e) =>
                  setPropostaForm({
                    ...propostaForm,
                    observacoes: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!propostaForm.interessadoId}
              onClick={() => {
                const valor = parseOptionalMoneyInput(propostaForm.valor);
                if (valor == null || valor <= 0) {
                  toast.error("Informe um valor maior que zero.");
                  return;
                }
                void createPropostaUsado(id, {
                  interessadoId: propostaForm.interessadoId,
                  responsavelId: propostaForm.responsavelId,
                  valor,
                  entrada: parseOptionalMoneyInput(propostaForm.entrada) ?? undefined,
                  valorFinanciamento:
                    parseOptionalMoneyInput(propostaForm.valorFinanciamento) ??
                    undefined,
                  observacoes: propostaForm.observacoes,
                })
                  .then(() => {
                    toast.success("Proposta criada.");
                    setPropostaOpen(false);
                    return load();
                  })
                  .catch((err) =>
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Não foi possível criar a proposta.",
                    ),
                  );
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(propostaAberta)}
        onOpenChange={() => setPropostaAberta(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Negociação</DialogTitle>
          </DialogHeader>
          {propostaAberta ? (
            <div className="space-y-3 text-sm">
              <p>Interessado: {propostaAberta.interessado.nome}</p>
              <p>Responsável: {propostaAberta.responsavel.name}</p>
              <p>Valor original: {formatBrl(propostaAberta.valor)}</p>
              <p>Atual: {formatBrl(propostaAberta.valorAtual)}</p>
              <p>
                Entrada: {formatBrl(propostaAberta.entrada)} · Financiamento:{" "}
                {formatBrl(propostaAberta.valorFinanciamento)}
              </p>
              <p>Status: {PROPOSTA_STATUS_LABEL[propostaAberta.status]}</p>
              <p>Observações: {propostaAberta.observacoes || "—"}</p>
              <div>
                <p className="mb-2 font-medium">Histórico da negociação</p>
                <ul className="space-y-2">
                  {(propostaAberta.negociacao?.movimentos ?? []).map((m, idx) => (
                    <li key={m.id}>
                      {idx > 0 ? <p className="text-muted-foreground">↓</p> : null}
                      <p>
                        {formatBrl(m.valor)} · {NEGOCIACAO_ORIGEM_LABEL[m.origem]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.responsavel?.name ?? "—"} ·{" "}
                        {new Date(m.createdAt).toLocaleString("pt-BR")}
                        {m.observacoes ? ` · ${m.observacoes}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2 border-t pt-3">
                <Label>Contraproposta</Label>
                <Input
                  inputMode="numeric"
                  value={contraForm.valor}
                  onChange={(e) =>
                    setContraForm({
                      ...contraForm,
                      valor: maskMoneyInput(e.target.value),
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Entrada"
                    inputMode="numeric"
                    value={contraForm.entrada}
                    onChange={(e) =>
                      setContraForm({
                        ...contraForm,
                        entrada: maskMoneyInput(e.target.value),
                      })
                    }
                  />
                  <Input
                    placeholder="Financiamento"
                    inputMode="numeric"
                    value={contraForm.valorFinanciamento}
                    onChange={(e) =>
                      setContraForm({
                        ...contraForm,
                        valorFinanciamento: maskMoneyInput(e.target.value),
                      })
                    }
                  />
                </div>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={contraForm.origem}
                  onChange={(e) =>
                    setContraForm({
                      ...contraForm,
                      origem: e.target.value as NegociacaoOrigem,
                    })
                  }
                >
                  {(Object.keys(NEGOCIACAO_ORIGEM_LABEL) as NegociacaoOrigem[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {NEGOCIACAO_ORIGEM_LABEL[k]}
                      </option>
                    ),
                  )}
                </select>
                <Input
                  placeholder="Motivo"
                  value={contraForm.observacoes}
                  onChange={(e) =>
                    setContraForm({
                      ...contraForm,
                      observacoes: e.target.value,
                    })
                  }
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const valor = parseOptionalMoneyInput(contraForm.valor);
                    if (valor == null || valor <= 0) {
                      toast.error("Informe um valor maior que zero.");
                      return;
                    }
                    void addNegociacaoMovimento(id, propostaAberta.id, {
                      valor,
                      entrada:
                        parseOptionalMoneyInput(contraForm.entrada) ?? undefined,
                      valorFinanciamento:
                        parseOptionalMoneyInput(contraForm.valorFinanciamento) ??
                        undefined,
                      origem: contraForm.origem,
                      observacoes: contraForm.observacoes,
                    })
                      .then((updated) => {
                        setPropostaAberta(updated);
                        setPropostas((prev) =>
                          prev.map((x) => (x.id === updated.id ? updated : x)),
                        );
                        toast.success("Contraproposta registrada.");
                        return fetchVendaUsado(id).then(setItem);
                      })
                      .catch((err) =>
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível registrar.",
                        ),
                      );
                  }}
                >
                  Registrar contraproposta
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <FormDialogShell
        open={fichaOpen}
        onOpenChange={setFichaOpen}
        className="max-w-3xl"
        icon={<Building2 className="h-5 w-5" />}
        title="Ficha do imóvel"
        description="Mesma ficha da captação. Vale para novas visualizações, sem reescrever o histórico."
      >
        <FormDialogBody>
          <ImovelFichaFields
            resetKey={`${fichaOpen}-${id}`}
            value={ficha}
            onChange={setFicha}
            foto={{
              items: imovelFotoItens(item.imovel),
              busy: fotoBusy,
              onAdd: (file) => {
                setFotoBusy(true);
                void uploadCaptacaoImovelFoto(item.imovel.id, file)
                  .then((next) => {
                    setItem({
                      ...item,
                      imovel: { ...item.imovel, ...next },
                    });
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
                void deleteCaptacaoImovelFoto(item.imovel.id, fotoId)
                  .then((next) => {
                    setItem({
                      ...item,
                      imovel: { ...item.imovel, ...next },
                    });
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setFichaOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={fichaSaving}
            onClick={() => {
              setFichaSaving(true);
              void updateVendaUsadoImovel(id, fichaToPayload(ficha))
                .then((next) => {
                  setItem(next);
                  setFichaOpen(false);
                  toast.success("Ficha atualizada.");
                })
                .catch((err) => {
                  toast.error(
                    err instanceof ApiError
                      ? err.message
                      : "Não foi possível salvar a ficha.",
                  );
                })
                .finally(() => setFichaSaving(false));
            }}
          >
            {fichaSaving ? "Salvando…" : "Salvar"}
          </Button>
        </FormDialogActions>
      </FormDialogShell>
    </>
  );
}

function DocumentoItem({
  doc,
  obs,
  onObs,
  mark,
  onStatus,
  onSaveObs,
}: {
  doc: DocumentoUsado;
  obs: string;
  onObs: (value: string) => void;
  mark: string;
  onStatus: (status: DocumentoUsadoStatus) => void;
  onSaveObs: () => void;
}) {
  const data =
    doc.dataAnalise ?? doc.dataRecebimento ?? doc.dataSolicitacao;
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="font-medium">
        {mark} {doc.nome}
        {doc.obrigatorio ? "" : " (opcional)"}
      </p>
      <p className="text-muted-foreground">
        Responsável: {DOCUMENTO_FORNECEDOR_LABEL[doc.fornecedor]} ·{" "}
        {DOCUMENTO_STATUS_LABEL[doc.status]}
        {doc.analista ? ` · Análise: ${doc.analista.name}` : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(data).toLocaleString("pt-BR")}
      </p>
      <Input
        className="mt-2"
        placeholder="Observação"
        value={obs}
        onChange={(e) => onObs(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {doc.status === "pendente" ? (
          <Button size="sm" variant="outline" onClick={() => onStatus("recebido")}>
            Marcar como recebido
          </Button>
        ) : null}
        {doc.status === "recebido" || doc.status === "recusado" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatus(doc.status === "recusado" ? "recebido" : "em_analise")}
          >
            {doc.status === "recusado" ? "Recebido novamente" : "Enviar para análise"}
          </Button>
        ) : null}
        {doc.status === "em_analise" ? (
          <>
            <Button size="sm" variant="outline" onClick={() => onStatus("aprovado")}>
              Aprovar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus("recusado")}>
              Recusar
            </Button>
          </>
        ) : null}
        {doc.status === "aprovado" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatus("em_analise")}
          >
            Reanalisar
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onSaveObs}>
          Salvar observação
        </Button>
      </div>
    </div>
  );
}

function VisitaCard({
  visita,
  onStatus,
  onFeedback,
}: {
  visita: VisitaUsado;
  onStatus: (status: VisitaUsadoStatus) => void;
  onFeedback: () => void;
}) {
  const when = new Date(visita.dataHora);
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="font-medium">
        {when.toLocaleDateString("pt-BR")} {when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p>{visita.interessado.nome}</p>
      <p className="text-muted-foreground">
        Corretor: {visita.responsavel.name} · {VISITA_STATUS_LABEL[visita.status]}
      </p>
      {visita.feedbackAvaliacao != null ? (
        <p className="mt-1 text-muted-foreground">
          Feedback: {visita.feedbackAvaliacao}/5
          {visita.feedbackInteresse
            ? ` · ${VISITA_INTERESSE_LABEL[visita.feedbackInteresse]}`
            : ""}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        {visita.status === "agendada" ? (
          <Button size="sm" variant="outline" onClick={() => onStatus("confirmada")}>
            Confirmar
          </Button>
        ) : null}
        {visita.status === "agendada" || visita.status === "confirmada" ? (
          <>
            <Button size="sm" variant="outline" onClick={() => onStatus("realizada")}>
              Realizada
            </Button>
            <Button size="sm" variant="outline" onClick={() => onStatus("nao_compareceu")}>
              Não compareceu
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus("cancelada")}>
              Cancelar
            </Button>
          </>
        ) : null}
        {visita.status === "realizada" ? (
          <Button size="sm" variant="outline" onClick={onFeedback}>
            Feedback
          </Button>
        ) : null}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
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
import { ApiError } from "@/lib/api";
import { getSession, type AuthUser, type Role } from "@/lib/auth";
import { canUserAction } from "@/lib/user-permissions";
import {
  createMuralChave,
  devolverMuralChave,
  fetchMuralChaveHistorico,
  fetchMuralChaveOpcoes,
  fetchMuralChaves,
  formatChaveQuando,
  MURAL_LOCAIS_CADASTRO,
  retiradaManualMuralChave,
  retirarMuralChave,
  updateMuralChave,
  type MuralChave,
  type MuralChaveHistoricoItem,
  type MuralChaveLocal,
  type MuralChaveOpcoes,
  type MuralChaveStatus,
} from "@/lib/mural-chaves-api";
import { cn } from "@/lib/utils";

const PODE_RETIRAR = new Set<Role>([
  "admin",
  "gerente",
  "corretor",
  "treinee",
  "super_admin",
]);

type Acao =
  | { tipo: "criar" }
  | { tipo: "editar"; chave: MuralChave }
  | { tipo: "retirar"; chave: MuralChave }
  | { tipo: "manual"; chave: MuralChave }
  | { tipo: "devolver"; chave: MuralChave }
  | { tipo: "historico"; chave: MuralChave };

function toIso(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function fieldClass() {
  return "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
}

const EXEMPLO_RETIRADA = "2026-09-24T17:30:00.000Z";
const EXEMPLO_PREVISAO = "2026-09-24T21:00:00.000Z";

function exemploChave(
  parcial: Pick<MuralChave, "id" | "identificador" | "status" | "imovelLabel" | "comQuem"> &
    Partial<MuralChave>,
): MuralChave {
  return {
    local: parcial.status === "em_uso" ? "corretor" : "imobiliaria",
    localDescricao: "",
    statusLabel: parcial.status === "em_uso" ? "Em uso" : "Disponível",
    unidade: parcial.imovelLabel,
    empreendimento: null,
    imovel: null,
    responsavelAtual: null,
    retiradoPor: null,
    retiradaRegistradaPor: null,
    retiradaEm: null,
    previsaoDevolucao: null,
    observacoes: "",
    createdAt: EXEMPLO_RETIRADA,
    updatedAt: EXEMPLO_RETIRADA,
    ...parcial,
  };
}

/** Cartões de exemplo. Não existem no cadastro e não aceitam movimentação. */
const CHAVES_EXEMPLO: MuralChave[] = [
  exemploChave({
    id: "exemplo-torre-a-304",
    identificador: "TORRE-A-304",
    status: "em_uso",
    imovelLabel: "Apartamento 304",
    empreendimento: { id: "exemplo-res-x", nome: "Residencial X" },
    comQuem: "Corretor João",
    retiradaEm: EXEMPLO_RETIRADA,
    previsaoDevolucao: EXEMPLO_PREVISAO,
    retiradaRegistradaPor: { id: "exemplo-marina", name: "Marina" },
  }),
  exemploChave({
    id: "exemplo-chv-09",
    identificador: "CHV 09",
    status: "disponivel",
    imovelLabel: "Apartamento 109",
    empreendimento: { id: "exemplo-res-x", nome: "Residencial X" },
    comQuem: "Imobiliária",
    local: "imobiliaria",
  }),
  exemploChave({
    id: "exemplo-ch-009",
    identificador: "CH-009",
    status: "disponivel",
    imovelLabel: "Sala 09",
    empreendimento: { id: "exemplo-aurora", nome: "Edifício Aurora" },
    comQuem: "Proprietário",
    local: "proprietario",
  }),
  exemploChave({
    id: "exemplo-apt-304",
    identificador: "APT-304",
    status: "em_uso",
    imovelLabel: "Apartamento 304",
    empreendimento: { id: "exemplo-aguas", nome: "Parque das Águas" },
    comQuem: "Corretor Ana",
    retiradaEm: "2026-09-25T12:15:00.000Z",
    previsaoDevolucao: "2026-09-25T16:00:00.000Z",
    retiradaRegistradaPor: { id: "exemplo-ana", name: "Ana" },
  }),
  exemploChave({
    id: "exemplo-res-x-09",
    identificador: "RES-X-09",
    status: "disponivel",
    imovelLabel: "Casa 09",
    empreendimento: { id: "exemplo-res-x", nome: "Residencial X" },
    comQuem: "Portaria do bloco B",
    local: "outro",
    localDescricao: "Portaria do bloco B",
  }),
  exemploChave({
    id: "exemplo-torre-b-102",
    identificador: "TORRE-B-102",
    status: "em_uso",
    imovelLabel: "Apartamento 102",
    empreendimento: { id: "exemplo-res-y", nome: "Residencial Y" },
    comQuem: "Corretor Pedro",
    retiradaEm: "2026-09-26T14:00:00.000Z",
    previsaoDevolucao: null,
    retiradaRegistradaPor: { id: "exemplo-marina", name: "Marina" },
  }),
];

const HISTORICO_EXEMPLO: Record<
  string,
  { identificadoresAnteriores: string[]; itens: MuralChaveHistoricoItem[] }
> = {
  "exemplo-torre-a-304": {
    identificadoresAnteriores: ["CHV 304"],
    itens: [
      {
        id: "ex-h1",
        tipo: "retirada",
        tipoLabel: "Retirada",
        manual: false,
        identificador: "TORRE-A-304",
        identificadorAnterior: null,
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 304",
        quemRetirouNome: "João",
        quemRegistrouRetiradaNome: "João",
        retiradaEm: EXEMPLO_RETIRADA,
        previsaoDevolucao: EXEMPLO_PREVISAO,
        quemDevolveuNome: null,
        quemRecebeuDevolucaoNome: null,
        devolucaoEm: null,
        confirmacaoPendente: false,
        confirmadoEm: null,
        confirmadoParaNome: null,
        autorId: "exemplo-joao",
        autorNome: "João",
        observacao: "Visita com o cliente.",
        createdAt: EXEMPLO_RETIRADA,
      },
      {
        id: "ex-h2",
        tipo: "identificador",
        tipoLabel: "Identificador alterado",
        manual: false,
        identificador: "TORRE-A-304",
        identificadorAnterior: "CHV 304",
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 304",
        quemRetirouNome: null,
        quemRegistrouRetiradaNome: null,
        retiradaEm: null,
        previsaoDevolucao: null,
        quemDevolveuNome: null,
        quemRecebeuDevolucaoNome: null,
        devolucaoEm: null,
        confirmacaoPendente: false,
        confirmadoEm: null,
        confirmadoParaNome: null,
        autorId: "exemplo-admin",
        autorNome: "Administrador",
        observacao: 'De "CHV 304" para "TORRE-A-304".',
        createdAt: "2026-09-20T15:00:00.000Z",
      },
    ],
  },
};

function historicoDoExemplo(chave: MuralChave) {
  const pronto = HISTORICO_EXEMPLO[chave.id];
  if (pronto) return pronto;
  const emUso = chave.status === "em_uso";
  return {
    identificadoresAnteriores: [] as string[],
    itens: [
      {
        id: `${chave.id}-h`,
        tipo: emUso ? "retirada" : "cadastro",
        tipoLabel: emUso ? "Retirada" : "Cadastro",
        manual: false,
        identificador: chave.identificador,
        identificadorAnterior: null,
        empreendimentoNome: chave.empreendimento?.nome ?? null,
        imovelLabel: chave.imovelLabel,
        quemRetirouNome: emUso ? chave.comQuem.replace(/^Corretor /, "") : null,
        quemRegistrouRetiradaNome: chave.retiradaRegistradaPor?.name ?? null,
        retiradaEm: chave.retiradaEm,
        previsaoDevolucao: chave.previsaoDevolucao,
        quemDevolveuNome: null,
        quemRecebeuDevolucaoNome: null,
        devolucaoEm: null,
        confirmacaoPendente: false,
        confirmadoEm: null,
        confirmadoParaNome: null,
        autorId: "exemplo",
        autorNome: chave.retiradaRegistradaPor?.name ?? "Imobiliária",
        observacao: "",
        createdAt: chave.retiradaEm ?? chave.createdAt,
      },
    ],
  };
}

function filtrarExemplos(
  q: string,
  status: MuralChaveStatus | "",
  empreendimentoId: string,
) {
  if (empreendimentoId) return [];
  const texto = q.trim().toLocaleLowerCase("pt-BR");
  return CHAVES_EXEMPLO.filter((chave) => {
    if (status && chave.status !== status) return false;
    if (!texto) return true;
    const alvo = [
      chave.identificador,
      chave.imovelLabel,
      chave.empreendimento?.nome,
      chave.comQuem,
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    return alvo.includes(texto);
  });
}

export function MuralChavesPage() {
  const [session, setSession] = useState<AuthUser | null>(null);
  useEffect(() => {
    setSession(getSession());
  }, []);
  const podeGerenciar = session
    ? canUserAction(session.role, session.permissions, "muralChaves.gerenciar")
    : false;
  const podeIdentificador = session
    ? canUserAction(session.role, session.permissions, "muralChaves.identificador")
    : false;
  const podeRetirar =
    !!session && (PODE_RETIRAR.has(session.role) || podeGerenciar);

  const [q, setQ] = useState("");
  const [qAplicada, setQAplicada] = useState("");
  const [status, setStatus] = useState<MuralChaveStatus | "">("");
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [chaves, setChaves] = useState<MuralChave[]>([]);
  const [opcoes, setOpcoes] = useState<MuralChaveOpcoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [acao, setAcao] = useState<Acao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState<{
    identificadoresAnteriores: string[];
    itens: MuralChaveHistoricoItem[];
  } | null>(null);

  const [identificador, setIdentificador] = useState("");
  const [formEmpreendimento, setFormEmpreendimento] = useState("");
  const [formImovel, setFormImovel] = useState("");
  const [unidade, setUnidade] = useState("");
  const [local, setLocal] = useState<MuralChaveLocal>("imobiliaria");
  const [localDescricao, setLocalDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [corretorId, setCorretorId] = useState("");
  const [quando, setQuando] = useState("");
  const [previsao, setPrevisao] = useState("");

  const carregar = useCallback(async () => {
    try {
      const rows = await fetchMuralChaves({
        q: qAplicada,
        status,
        empreendimentoId,
      });
      setChaves(rows);
      setErro("");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível carregar o mural.");
    } finally {
      setCarregando(false);
    }
  }, [empreendimentoId, qAplicada, status]);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), 15_000);
    return () => window.clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    void fetchMuralChaveOpcoes()
      .then(setOpcoes)
      .catch(() => setOpcoes(null));
  }, []);

  useEffect(() => {
    if (acao?.tipo !== "historico") {
      setHistorico(null);
      return;
    }
    if (acao.chave.id.startsWith("exemplo-")) {
      setHistorico(historicoDoExemplo(acao.chave));
      return;
    }
    void fetchMuralChaveHistorico(acao.chave.id)
      .then(setHistorico)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível abrir o histórico.");
        setAcao(null);
      });
  }, [acao]);

  function abrirCriar() {
    setIdentificador("");
    setFormEmpreendimento("");
    setFormImovel("");
    setUnidade("");
    setLocal("imobiliaria");
    setLocalDescricao("");
    setObservacoes("");
    setAcao({ tipo: "criar" });
  }

  function abrirEditar(chave: MuralChave) {
    setIdentificador(chave.identificador);
    setFormEmpreendimento(chave.empreendimento?.id ?? "");
    setFormImovel(chave.imovel?.id ?? "");
    setUnidade(chave.unidade);
    setLocal(chave.local === "corretor" ? "imobiliaria" : chave.local);
    setLocalDescricao(chave.localDescricao);
    setObservacoes(chave.observacoes);
    setAcao({ tipo: "editar", chave });
  }

  function abrirMovimento(tipo: "retirar" | "manual" | "devolver", chave: MuralChave) {
    setCorretorId("");
    setQuando("");
    setPrevisao("");
    setObservacoes("");
    setLocal("imobiliaria");
    setLocalDescricao("");
    setAcao({ tipo, chave });
  }

  async function salvarCadastro() {
    if (!identificador.trim()) {
      toast.error("Informe o identificador da chave.");
      return;
    }
    if (!formEmpreendimento && !formImovel) {
      toast.error("Vincule a chave a um imóvel, a um empreendimento, ou aos dois.");
      return;
    }
    if (!formImovel && !unidade.trim()) {
      toast.error("Informe a unidade do imóvel, por exemplo Apartamento 304.");
      return;
    }
    setSalvando(true);
    try {
      const emUso = acao?.tipo === "editar" && acao.chave.status === "em_uso";
      const body = {
        identificador: identificador.trim(),
        empreendimentoId: formEmpreendimento || null,
        imovelId: formImovel || null,
        unidade: unidade.trim(),
        ...(emUso
          ? {}
          : {
              local,
              localDescricao: local === "outro" ? localDescricao.trim() : "",
            }),
        observacoes: observacoes.trim(),
      };
      if (acao?.tipo === "editar") {
        await updateMuralChave(acao.chave.id, {
          ...body,
          identificador: podeIdentificador ? body.identificador : undefined,
        });
        toast.success("Chave atualizada. O histórico foi preservado.");
      } else {
        await createMuralChave(body);
        toast.success("Chave cadastrada no mural.");
      }
      setAcao(null);
      await carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar a chave.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarRetirada() {
    if (acao?.tipo !== "retirar" && acao?.tipo !== "manual") return;
    setSalvando(true);
    try {
      if (acao.tipo === "retirar") {
        await retirarMuralChave(acao.chave.id, {
          previsaoDevolucao: toIso(previsao),
          observacao: observacoes.trim(),
        });
        toast.success("Retirada registrada. A chave está em uso.");
      } else {
        if (!corretorId) {
          toast.error("Selecione o corretor que está com a chave.");
          setSalvando(false);
          return;
        }
        await retiradaManualMuralChave(acao.chave.id, {
          corretorId,
          retiradaEm: toIso(quando),
          previsaoDevolucao: toIso(previsao),
          observacao: observacoes.trim(),
        });
        toast.success("Retirada manual registrada no mural e no histórico.");
      }
      setAcao(null);
      await carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível registrar a retirada.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarDevolucao() {
    if (acao?.tipo !== "devolver") return;
    if (local === "outro" && !localDescricao.trim()) {
      toast.error("Informe o local ou o responsável.");
      return;
    }
    setSalvando(true);
    try {
      await devolverMuralChave(acao.chave.id, {
        local,
        localDescricao: local === "outro" ? localDescricao.trim() : "",
        devolucaoEm: toIso(quando),
        observacao: observacoes.trim(),
      });
      toast.success("Devolução registrada. O corretor precisa confirmar o recebimento.");
      setAcao(null);
      await carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível registrar a devolução.");
    } finally {
      setSalvando(false);
    }
  }

  const exemplos =
    !carregando && chaves.length === 0
      ? filtrarExemplos(qAplicada, status, empreendimentoId)
      : [];
  const lista = chaves.length > 0 ? chaves : exemplos;
  const soExemplo = chaves.length === 0 && lista.length > 0;
  const emUso = lista.filter((chave) => chave.status === "em_uso").length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <KeyRound className="h-5 w-5" />
            Mural de Chaves
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Onde está cada chave, quem está com ela e se está disponível. O identificador segue o
            padrão da imobiliária e pode ser alterado sem perder o histórico.
          </p>
        </div>
        {podeGerenciar ? (
          <Button onClick={abrirCriar}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova chave
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full border px-3 py-1">{lista.length} chaves</span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
          {lista.length - emUso} disponíveis
        </span>
        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800">
          {emUso} em uso
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-[220px] flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQAplicada(q.trim());
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Identificador, imóvel, empreendimento ou corretor"
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        <select
          className={cn(fieldClass(), "w-auto")}
          value={status}
          onChange={(event) => setStatus(event.target.value as MuralChaveStatus | "")}
        >
          <option value="">Todos os status</option>
          <option value="disponivel">Disponíveis</option>
          <option value="em_uso">Em uso</option>
        </select>
        <select
          className={cn(fieldClass(), "w-auto max-w-[240px]")}
          value={empreendimentoId}
          onChange={(event) => setEmpreendimentoId(event.target.value)}
        >
          <option value="">Todos os empreendimentos</option>
          {opcoes?.empreendimentos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
      </div>

      {erro && !soExemplo ? <p className="text-sm text-destructive">{erro}</p> : null}
      {soExemplo ? (
        <p className="text-sm text-muted-foreground">
          Exemplos visuais para mostrar o mural. Essas chaves não estão cadastradas e não podem ser
          retiradas.
        </p>
      ) : null}
      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando mural…
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma chave encontrada.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((chave) => {
            const usada = chave.status === "em_uso";
            const exemplo = chave.id.startsWith("exemplo-");
            return (
              <article key={chave.id} className="flex flex-col rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold">{chave.identificador}</h2>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      usada
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800",
                    )}
                  >
                    {usada ? "Em uso" : "Disponível"}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div>
                    <dt className="inline text-muted-foreground">Empreendimento: </dt>
                    <dd className="inline">{chave.empreendimento?.nome || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">Imóvel: </dt>
                    <dd className="inline">{chave.imovelLabel}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">Com: </dt>
                    <dd className="inline">{chave.comQuem}</dd>
                  </div>
                  {usada ? (
                    <>
                      <div>
                        <dt className="inline text-muted-foreground">Retirada: </dt>
                        <dd className="inline">{formatChaveQuando(chave.retiradaEm)}</dd>
                      </div>
                      <div>
                        <dt className="inline text-muted-foreground">Previsão: </dt>
                        <dd className="inline">{formatChaveQuando(chave.previsaoDevolucao)}</dd>
                      </div>
                      <div>
                        <dt className="inline text-muted-foreground">Responsável pela retirada: </dt>
                        <dd className="inline">{chave.retiradaRegistradaPor?.name || "—"}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {exemplo ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      Exemplo
                    </span>
                  ) : null}
                  {!exemplo && podeRetirar && !usada ? (
                    <Button size="sm" onClick={() => abrirMovimento("retirar", chave)}>
                      Retirar
                    </Button>
                  ) : null}
                  {!exemplo && podeGerenciar && !usada ? (
                    <Button size="sm" variant="outline" onClick={() => abrirMovimento("manual", chave)}>
                      Registrar retirada
                    </Button>
                  ) : null}
                  {!exemplo && podeGerenciar && usada ? (
                    <Button size="sm" onClick={() => abrirMovimento("devolver", chave)}>
                      Registrar devolução
                    </Button>
                  ) : null}
                  {!exemplo && podeGerenciar ? (
                    <Button size="sm" variant="outline" onClick={() => abrirEditar(chave)}>
                      Editar
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => setAcao({ tipo: "historico", chave })}>
                    Histórico
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={acao?.tipo === "criar" || acao?.tipo === "editar"} onOpenChange={(open) => !open && setAcao(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{acao?.tipo === "editar" ? "Editar chave" : "Nova chave"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="chave-id">Identificador</Label>
              <Input
                id="chave-id"
                value={identificador}
                disabled={acao?.tipo === "editar" && !podeIdentificador}
                onChange={(event) => setIdentificador(event.target.value)}
                placeholder="TORRE-A-304"
                maxLength={40}
              />
              <p className="text-xs text-muted-foreground">
                Use o padrão da imobiliária, como CHV 09, APT-304 ou TORRE-A-304.
                {acao?.tipo === "editar" && !podeIdentificador
                  ? " Só o administrador altera o identificador depois do cadastro."
                  : " Alterar o código não apaga o vínculo nem o histórico."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chave-emp">Empreendimento</Label>
              <select
                id="chave-emp"
                className={fieldClass()}
                value={formEmpreendimento}
                onChange={(event) => setFormEmpreendimento(event.target.value)}
              >
                <option value="">Nenhum</option>
                {opcoes?.empreendimentos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chave-imovel">Imóvel cadastrado</Label>
              <select
                id="chave-imovel"
                className={fieldClass()}
                value={formImovel}
                onChange={(event) => setFormImovel(event.target.value)}
              >
                <option value="">Nenhum</option>
                {opcoes?.imoveis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chave-unidade">Unidade / nome do imóvel</Label>
              <Input
                id="chave-unidade"
                value={unidade}
                onChange={(event) => setUnidade(event.target.value)}
                placeholder="Apartamento 304"
              />
            </div>
            {acao?.tipo !== "editar" || acao.chave.status !== "em_uso" ? (
              <div className="space-y-1.5">
                <Label htmlFor="chave-local">Onde está agora</Label>
                <select
                  id="chave-local"
                  className={fieldClass()}
                  value={local}
                  onChange={(event) => setLocal(event.target.value as MuralChaveLocal)}
                >
                  {MURAL_LOCAIS_CADASTRO.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                A chave está em uso. O local muda quando a devolução for registrada.
              </p>
            )}
            {local === "outro" && (acao?.tipo !== "editar" || acao.chave.status !== "em_uso") ? (
              <div className="space-y-1.5">
                <Label htmlFor="chave-local-desc">Qual local ou responsável</Label>
                <Input
                  id="chave-local-desc"
                  value={localDescricao}
                  onChange={(event) => setLocalDescricao(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="chave-obs">Observações</Label>
              <Input
                id="chave-obs"
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcao(null)}>
              Cancelar
            </Button>
            <Button disabled={salvando} onClick={() => void salvarCadastro()}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={acao?.tipo === "retirar" || acao?.tipo === "manual"}
        onOpenChange={(open) => !open && setAcao(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {acao?.tipo === "manual" ? "Registrar retirada" : "Retirar chave"}
              {acao && acao.tipo !== "criar" && acao.tipo !== "editar" && acao.tipo !== "historico" && acao.tipo !== "devolver"
                ? ` — ${acao.chave.identificador}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {acao?.tipo === "manual" ? (
              <div className="space-y-1.5">
                <Label htmlFor="chave-corretor">Corretor que está com a chave</Label>
                <select
                  id="chave-corretor"
                  className={fieldClass()}
                  value={corretorId}
                  onChange={(event) => setCorretorId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {opcoes?.usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                A retirada fica no seu nome e a chave deixa de aparecer como disponível.
              </p>
            )}
            {acao?.tipo === "manual" ? (
              <div className="space-y-1.5">
                <Label htmlFor="chave-quando">Data e horário da retirada</Label>
                <Input
                  id="chave-quando"
                  type="datetime-local"
                  value={quando}
                  onChange={(event) => setQuando(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="chave-previsao">Previsão de devolução</Label>
              <Input
                id="chave-previsao"
                type="datetime-local"
                value={previsao}
                onChange={(event) => setPrevisao(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chave-obs-ret">Observação</Label>
              <Input
                id="chave-obs-ret"
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcao(null)}>
              Cancelar
            </Button>
            <Button disabled={salvando} onClick={() => void salvarRetirada()}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar retirada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acao?.tipo === "devolver"} onOpenChange={(open) => !open && setAcao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar devolução
              {acao?.tipo === "devolver" ? ` — ${acao.chave.identificador}` : ""}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Você fica registrado como quem recebeu a chave. Na próxima vez que o corretor entrar,
            ele confirma para quem entregou.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="chave-destino">Onde a chave ficou</Label>
              <select
                id="chave-destino"
                className={fieldClass()}
                value={local}
                onChange={(event) => setLocal(event.target.value as MuralChaveLocal)}
              >
                {MURAL_LOCAIS_CADASTRO.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {local === "outro" ? (
              <div className="space-y-1.5">
                <Label htmlFor="chave-destino-desc">Local ou responsável</Label>
                <Input
                  id="chave-destino-desc"
                  value={localDescricao}
                  onChange={(event) => setLocalDescricao(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="chave-dev-quando">Data e horário da devolução</Label>
              <Input
                id="chave-dev-quando"
                type="datetime-local"
                value={quando}
                onChange={(event) => setQuando(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chave-dev-obs">Observação</Label>
              <Input
                id="chave-dev-obs"
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcao(null)}>
              Cancelar
            </Button>
            <Button disabled={salvando} onClick={() => void salvarDevolucao()}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registrar recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acao?.tipo === "historico"} onOpenChange={(open) => !open && setAcao(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Histórico
              {acao?.tipo === "historico" ? ` — ${acao.chave.identificador}` : ""}
            </DialogTitle>
          </DialogHeader>
          {historico?.identificadoresAnteriores.length ? (
            <p className="text-sm text-muted-foreground">
              Identificadores anteriores: {historico.identificadoresAnteriores.join(", ")}
            </p>
          ) : null}
          {!historico ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando histórico…
            </div>
          ) : historico.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação.</p>
          ) : (
            <ol className="space-y-3">
              {historico.itens.map((item) => (
                <li key={item.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.tipoLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatChaveQuando(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">Por {item.autorNome}</p>
                  <p>Identificador: {item.identificador}</p>
                  {item.identificadorAnterior ? (
                    <p>Identificador anterior: {item.identificadorAnterior}</p>
                  ) : null}
                  <p>Empreendimento: {item.empreendimentoNome || "—"}</p>
                  <p>Imóvel: {item.imovelLabel}</p>
                  {item.quemRetirouNome ? <p>Quem retirou: {item.quemRetirouNome}</p> : null}
                  {item.quemRegistrouRetiradaNome ? (
                    <p>Quem registrou a retirada: {item.quemRegistrouRetiradaNome}</p>
                  ) : null}
                  {item.retiradaEm ? <p>Retirada: {formatChaveQuando(item.retiradaEm)}</p> : null}
                  {item.previsaoDevolucao ? (
                    <p>Previsão: {formatChaveQuando(item.previsaoDevolucao)}</p>
                  ) : null}
                  {item.quemDevolveuNome ? <p>Quem devolveu: {item.quemDevolveuNome}</p> : null}
                  {item.quemRecebeuDevolucaoNome ? (
                    <p>Quem recebeu: {item.quemRecebeuDevolucaoNome}</p>
                  ) : null}
                  {item.devolucaoEm ? <p>Devolução: {formatChaveQuando(item.devolucaoEm)}</p> : null}
                  {item.confirmadoParaNome ? (
                    <p>
                      Confirmação: {item.confirmadoParaNome}
                      {item.confirmadoEm ? ` em ${formatChaveQuando(item.confirmadoEm)}` : ""}
                    </p>
                  ) : null}
                  {item.confirmacaoPendente ? (
                    <p className="text-amber-700">Aguardando confirmação do corretor.</p>
                  ) : null}
                  {item.manual ? <p>Alteração manual do responsável pelas chaves.</p> : null}
                  {item.observacao ? <p>Obs.: {item.observacao}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

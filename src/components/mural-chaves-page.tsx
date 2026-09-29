import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  History,
  Home,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Search,
  Tag,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function eventoExemplo(
  parcial: Pick<
    MuralChaveHistoricoItem,
    "id" | "tipo" | "tipoLabel" | "identificador" | "autorNome" | "createdAt"
  > &
    Partial<MuralChaveHistoricoItem>,
): MuralChaveHistoricoItem {
  return {
    manual: false,
    identificadorAnterior: null,
    empreendimentoNome: null,
    imovelLabel: "",
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
    autorId: "exemplo",
    observacao: "",
    ...parcial,
  };
}

const HISTORICO_EXEMPLO: Record<
  string,
  { identificadoresAnteriores: string[]; itens: MuralChaveHistoricoItem[] }
> = {
  "exemplo-torre-a-304": {
    identificadoresAnteriores: ["CHV 304"],
    itens: [
      eventoExemplo({
        id: "ex-h1",
        tipo: "retirada",
        tipoLabel: "Retirada",
        identificador: "TORRE-A-304",
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 304",
        quemRetirouNome: "João",
        quemRegistrouRetiradaNome: "João",
        retiradaEm: EXEMPLO_RETIRADA,
        previsaoDevolucao: EXEMPLO_PREVISAO,
        autorNome: "João",
        observacao: "Visita com o cliente do Residencial X.",
        createdAt: EXEMPLO_RETIRADA,
      }),
      eventoExemplo({
        id: "ex-h2",
        tipo: "identificador",
        tipoLabel: "Identificador alterado",
        identificador: "TORRE-A-304",
        identificadorAnterior: "CHV 304",
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 304",
        autorNome: "Administrador",
        observacao: 'De "CHV 304" para "TORRE-A-304". O histórico anterior foi mantido.',
        createdAt: "2026-09-20T15:00:00.000Z",
      }),
      eventoExemplo({
        id: "ex-h3",
        tipo: "cadastro",
        tipoLabel: "Cadastro",
        identificador: "CHV 304",
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 304",
        autorNome: "Marina",
        observacao: "Chave recebida do proprietário e guardada na imobiliária.",
        createdAt: "2026-09-12T13:10:00.000Z",
      }),
    ],
  },
  "exemplo-chv-09": {
    identificadoresAnteriores: [],
    itens: [
      eventoExemplo({
        id: "ex-chv-4",
        tipo: "confirmacao",
        tipoLabel: "Confirmação do corretor",
        identificador: "CHV 09",
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 109",
        quemDevolveuNome: "João",
        quemRecebeuDevolucaoNome: "Marina",
        devolucaoEm: "2026-09-18T20:40:00.000Z",
        confirmadoParaNome: "Marina",
        confirmadoEm: "2026-09-18T21:05:00.000Z",
        autorNome: "João",
        observacao: "João confirmou que entregou a chave para Marina, na imobiliária.",
        createdAt: "2026-09-18T21:05:00.000Z",
      }),
      eventoExemplo({
        id: "ex-chv-3",
        tipo: "devolucao",
        tipoLabel: "Devolução",
        identificador: "CHV 09",
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 109",
        quemDevolveuNome: "João",
        quemRecebeuDevolucaoNome: "Marina",
        devolucaoEm: "2026-09-18T20:40:00.000Z",
        autorNome: "Marina",
        observacao: "Chave conferida e guardada no claviculário da imobiliária.",
        createdAt: "2026-09-18T20:40:00.000Z",
      }),
      eventoExemplo({
        id: "ex-chv-2",
        tipo: "retirada",
        tipoLabel: "Retirada",
        identificador: "CHV 09",
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 109",
        quemRetirouNome: "João",
        quemRegistrouRetiradaNome: "João",
        retiradaEm: "2026-09-18T14:00:00.000Z",
        previsaoDevolucao: "2026-09-18T21:00:00.000Z",
        autorNome: "João",
        observacao: "Visita agendada com o comprador.",
        createdAt: "2026-09-18T14:00:00.000Z",
      }),
      eventoExemplo({
        id: "ex-chv-1",
        tipo: "cadastro",
        tipoLabel: "Cadastro",
        identificador: "CHV 09",
        empreendimentoNome: "Residencial X",
        imovelLabel: "Apartamento 109",
        autorNome: "Imobiliária",
        observacao: "Chave cadastrada no mural, disponível na imobiliária.",
        createdAt: "2026-09-10T12:00:00.000Z",
      }),
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

const ICONE_MOVIMENTO: Record<string, { icon: LucideIcon; classe: string }> = {
  cadastro: { icon: KeyRound, classe: "bg-sky-100 text-sky-700" },
  edicao: { icon: Pencil, classe: "bg-slate-100 text-slate-700" },
  identificador: { icon: Tag, classe: "bg-violet-100 text-violet-700" },
  retirada: { icon: LogOut, classe: "bg-rose-100 text-rose-700" },
  retirada_manual: { icon: LogOut, classe: "bg-rose-100 text-rose-700" },
  devolucao: { icon: LogIn, classe: "bg-emerald-100 text-emerald-700" },
  confirmacao: { icon: CheckCircle2, classe: "bg-amber-100 text-amber-800" },
};

function iconeDoMovimento(tipo: string) {
  return ICONE_MOVIMENTO[tipo] ?? { icon: History, classe: "bg-muted text-muted-foreground" };
}

function fatosDoMovimento(item: MuralChaveHistoricoItem) {
  const fatos: { rotulo: string; valor: string }[] = [
    { rotulo: "Identificador", valor: item.identificador },
  ];
  if (item.identificadorAnterior) {
    fatos.push({ rotulo: "Identificador anterior", valor: item.identificadorAnterior });
  }
  fatos.push(
    { rotulo: "Empreendimento", valor: item.empreendimentoNome || "—" },
    { rotulo: "Imóvel", valor: item.imovelLabel || "—" },
  );
  if (item.quemRetirouNome) fatos.push({ rotulo: "Quem retirou", valor: item.quemRetirouNome });
  if (item.quemRegistrouRetiradaNome) {
    fatos.push({ rotulo: "Quem registrou a retirada", valor: item.quemRegistrouRetiradaNome });
  }
  if (item.retiradaEm) fatos.push({ rotulo: "Retirada", valor: formatChaveQuando(item.retiradaEm) });
  if (item.previsaoDevolucao) {
    fatos.push({ rotulo: "Previsão de devolução", valor: formatChaveQuando(item.previsaoDevolucao) });
  }
  if (item.quemDevolveuNome) fatos.push({ rotulo: "Quem devolveu", valor: item.quemDevolveuNome });
  if (item.quemRecebeuDevolucaoNome) {
    fatos.push({ rotulo: "Quem recebeu", valor: item.quemRecebeuDevolucaoNome });
  }
  if (item.devolucaoEm) fatos.push({ rotulo: "Devolução", valor: formatChaveQuando(item.devolucaoEm) });
  if (item.confirmadoParaNome) {
    fatos.push({
      rotulo: "Confirmou a entrega para",
      valor: item.confirmadoEm
        ? `${item.confirmadoParaNome} · ${formatChaveQuando(item.confirmadoEm)}`
        : item.confirmadoParaNome,
    });
  }
  return fatos;
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

  const disponiveis = lista.length - emUso;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Operação
          </p>
          <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" />
            </span>
            Mural de Chaves
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Onde está cada chave, quem está com ela e se está disponível. O identificador segue o
            padrão da imobiliária e pode ser alterado sem perder o histórico.
          </p>
        </div>
        {podeGerenciar ? (
          <Button onClick={abrirCriar} className="rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Nova chave
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">No mural</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{lista.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3">
          <p className="text-xs text-emerald-800/80">Disponíveis</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-emerald-900">
            {disponiveis}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3">
          <p className="text-xs text-rose-800/80">Em uso</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-rose-900">
            {emUso}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
        <form
          className="flex min-w-[240px] flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQAplicada(q.trim());
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Identificador, imóvel, empreendimento ou corretor"
              className="pl-9"
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
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
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
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma chave encontrada.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((chave) => {
            const usada = chave.status === "em_uso";
            const exemplo = chave.id.startsWith("exemplo-");
            return (
              <article
                key={chave.id}
                className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <div
                  className={cn(
                    "flex items-start justify-between gap-3 border-b px-4 py-3.5",
                    usada ? "bg-rose-50/80" : "bg-emerald-50/70",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        usada ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-tight">
                        {chave.identificador}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        {chave.empreendimento?.nome || "Sem empreendimento"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                      usada ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800",
                    )}
                  >
                    {usada ? "Em uso" : "Disponível"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Home className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Imóvel</p>
                      <p className="font-medium">{chave.imovelLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Com quem está
                      </p>
                      <p className="font-medium">{chave.comQuem}</p>
                    </div>
                  </div>
                  {usada ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl border px-3 py-2">
                        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          Retirada
                        </p>
                        <p className="mt-0.5 font-medium">{formatChaveQuando(chave.retiradaEm)}</p>
                      </div>
                      <div className="rounded-xl border px-3 py-2">
                        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          Previsão
                        </p>
                        <p className="mt-0.5 font-medium">
                          {formatChaveQuando(chave.previsaoDevolucao)}
                        </p>
                      </div>
                      <div className="col-span-2 text-xs text-muted-foreground">
                        Registrada por {chave.retiradaRegistradaPor?.name || "—"}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap gap-2 border-t bg-muted/20 px-4 py-3">
                  {exemplo ? (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => setAcao({ tipo: "historico", chave })}
                  >
                    <History className="mr-1.5 h-3.5 w-3.5" />
                    Histórico
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={acao?.tipo === "criar" || acao?.tipo === "editar"} onOpenChange={(open) => !open && setAcao(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{acao?.tipo === "editar" ? "Editar chave" : "Nova chave"}</DialogTitle>
            <DialogDescription>
              O identificador fica livre para o padrão da imobiliária. O vínculo e o histórico
              permanecem se o código mudar.
            </DialogDescription>
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
            <div className="grid gap-3 sm:grid-cols-2">
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
              <Textarea
                id="chave-obs"
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                className="min-h-20"
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
        <DialogContent className="flex h-[min(90vh,880px)] w-[min(1080px,calc(100vw-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          {acao?.tipo === "historico" ? (
            <div className="border-b bg-muted/30 px-6 py-5 pr-14">
              <DialogHeader className="space-y-3 text-left">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Histórico da chave
                    </p>
                    <DialogTitle className="mt-1 text-2xl">{acao.chave.identificador}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {acao.chave.empreendimento?.nome || "Sem empreendimento"}
                      {" · "}
                      {acao.chave.imovelLabel}
                    </DialogDescription>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                      acao.chave.status === "em_uso"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800",
                    )}
                  >
                    {acao.chave.status === "em_uso" ? "Em uso" : "Disponível"}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border bg-background px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Agora com</p>
                    <p className="mt-0.5 text-sm font-medium">{acao.chave.comQuem}</p>
                  </div>
                  <div className="rounded-xl border bg-background px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Última retirada
                    </p>
                    <p className="mt-0.5 text-sm font-medium">
                      {formatChaveQuando(acao.chave.retiradaEm)}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-background px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Previsão
                    </p>
                    <p className="mt-0.5 text-sm font-medium">
                      {formatChaveQuando(acao.chave.previsaoDevolucao)}
                    </p>
                  </div>
                </div>
                {historico?.identificadoresAnteriores.length ? (
                  <p className="text-sm text-muted-foreground">
                    Identificadores anteriores:{" "}
                    <span className="font-medium text-foreground">
                      {historico.identificadoresAnteriores.join(", ")}
                    </span>
                  </p>
                ) : null}
              </DialogHeader>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {!historico ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando histórico…
              </div>
            ) : historico.itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-6 sm:pl-8">
                {historico.itens.map((item) => {
                  const visual = iconeDoMovimento(item.tipo);
                  const Icone = visual.icon;
                  const fatos = fatosDoMovimento(item);
                  return (
                    <li key={item.id} className="relative">
                      <span
                        className={cn(
                          "absolute -left-10 top-4 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-background sm:-left-12",
                          visual.classe,
                        )}
                      >
                        <Icone className="h-3.5 w-3.5" />
                      </span>
                      <article className="rounded-2xl border bg-card p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold">{item.tipoLabel}</h3>
                            <p className="text-sm text-muted-foreground">Por {item.autorNome}</p>
                          </div>
                          <time className="text-sm text-muted-foreground">
                            {formatChaveQuando(item.createdAt)}
                          </time>
                        </div>
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {fatos.map((fato) => (
                            <div key={fato.rotulo} className="min-w-0">
                              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {fato.rotulo}
                              </dt>
                              <dd className="mt-0.5 text-sm font-medium">{fato.valor}</dd>
                            </div>
                          ))}
                        </dl>
                        {item.confirmacaoPendente ? (
                          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            Aguardando confirmação do corretor.
                          </p>
                        ) : null}
                        {item.manual ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Alteração manual do responsável pelas chaves.
                          </p>
                        ) : null}
                        {item.observacao ? (
                          <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-sm leading-relaxed">
                            {item.observacao}
                          </p>
                        ) : null}
                      </article>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

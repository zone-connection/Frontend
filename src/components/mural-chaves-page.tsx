import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  History,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tag,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  FILTER_BAR_SURFACE,
  FILTER_CLEAR_BTN,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import { FinanceKpiCard, type FinanceKpiTone } from "@/components/finance-kpi-card";
import { FiltroSelectNativo } from "@/components/filtros-painel";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api";
import { getSession, type AuthUser, type Role } from "@/lib/auth";
import { fetchNotificacoes, type Notificacao } from "@/lib/notificacoes-api";
import { canUserAction } from "@/lib/user-permissions";
import {
  createMuralChave,
  devolverMuralChave,
  fetchMuralChaveHistorico,
  fetchMuralChaveOpcoes,
  fetchMuralChaves,
  formatChaveQuando,
  MURAL_LOCAIS_CADASTRO,
  MURAL_ORIGEM_LABEL,
  retiradaManualMuralChave,
  retirarMuralChave,
  updateMuralChave,
  type MuralChave,
  type MuralChaveHistoricoItem,
  type MuralChaveLocal,
  type MuralChaveOpcoes,
  type MuralImovelOrigem,
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

function rotuloOrigem(origem: MuralImovelOrigem | null | undefined) {
  if (!origem) return "";
  return MURAL_ORIGEM_LABEL[origem];
}

function rotuloImovelOpcao(item: { label: string; origem: MuralImovelOrigem | null }) {
  const origem = rotuloOrigem(item.origem);
  return origem ? `${origem} · ${item.label}` : item.label;
}

function chaveNaOrigem(chave: MuralChave, origem: "" | "captacao" | "usado") {
  if (!origem) return true;
  if (chave.origem === "ambos") return true;
  return chave.origem === origem;
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

type FaixaChave = "disponivel" | "em_uso" | "proprietario" | "outro";

const FAIXA_VISUAL: Record<FaixaChave, { label: string; pill: string }> = {
  disponivel: {
    label: "Disponível",
    pill: "bg-emerald-100 text-emerald-800",
  },
  em_uso: {
    label: "Em uso",
    pill: "bg-rose-100 text-rose-800",
  },
  proprietario: {
    label: "Com proprietário",
    pill: "bg-sky-100 text-sky-800",
  },
  outro: {
    label: "Outro local",
    pill: "bg-violet-100 text-violet-800",
  },
};

const TONS_PESSOA = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-indigo-500",
];

function iniciaisNome(nome: string) {
  const limpo = nome.replace(/^(corretor|propriet[aá]rio|imobili[aá]ria)\s+/i, "").trim();
  const partes = limpo.split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "?";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return `${primeira}${ultima}`.toUpperCase();
}

function tomNome(nome: string) {
  let n = 0;
  for (let i = 0; i < nome.length; i += 1) n = (n * 31 + nome.charCodeAt(i)) >>> 0;
  return TONS_PESSOA[n % TONS_PESSOA.length]!;
}

function papelCurto(chave: MuralChave) {
  const faixa = faixaDaChave(chave);
  if (faixa === "proprietario") return "Proprietário";
  if (faixa === "outro") return chave.localDescricao || "Outro local";
  if (faixa === "em_uso") return "Corretor";
  return "Imobiliária";
}

function PessoaMarca({ nome, detalhe }: { nome: string; detalhe?: string }) {
  if (!nome || nome === "—") return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm",
          tomNome(nome),
        )}
      >
        {iniciaisNome(nome)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium leading-tight text-foreground">{nome}</span>
        {detalhe ? (
          <span className="block truncate text-[11px] text-muted-foreground">{detalhe}</span>
        ) : null}
      </span>
    </span>
  );
}

function faixaDaChave(chave: MuralChave): FaixaChave {
  if (chave.status === "em_uso") return "em_uso";
  if (chave.local === "proprietario") return "proprietario";
  if (chave.local === "outro") return "outro";
  return "disponivel";
}

const POR_PAGINA = 10;

function formatChaveQuandoComAno(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const data = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${data} às ${hora}`;
}

function PainelChave({
  chave,
  historico,
  podeGerenciar,
  podeIdentificador,
  podeRetirar,
  onClose,
  onEditar,
  onRetirar,
  onManual,
  onDevolver,
  onHistorico,
}: {
  chave: MuralChave;
  historico: { identificadoresAnteriores: string[]; itens: MuralChaveHistoricoItem[] } | null;
  podeGerenciar: boolean;
  podeIdentificador: boolean;
  podeRetirar: boolean;
  onClose: () => void;
  onEditar: () => void;
  onRetirar: () => void;
  onManual: () => void;
  onDevolver: () => void;
  onHistorico: () => void;
}) {
  const faixa = faixaDaChave(chave);
  const visual = FAIXA_VISUAL[faixa];
  const retirada = historico?.itens.find((item) => item.tipo === "retirada");
  const devolucao = historico?.itens.find((item) => item.tipo === "devolucao");
  const recente =
    retirada || devolucao
      ? [retirada, devolucao].filter((item): item is MuralChaveHistoricoItem => !!item)
      : (historico?.itens.filter((item) => item.tipo !== "confirmacao").slice(0, 2) ?? []);
  const pendente = historico?.itens.find((item) => item.confirmacaoPendente);
  const statusSolido = {
    disponivel: "bg-emerald-500",
    em_uso: "bg-rose-500",
    proprietario: "bg-sky-500",
    outro: "bg-violet-500",
  }[faixa];
  return (
    <aside className="flex max-h-[70vh] w-full shrink-0 flex-col overflow-y-auto overscroll-contain rounded-2xl border bg-card shadow-sm xl:h-full xl:max-h-full xl:w-[340px]">
      <div className="sticky top-0 z-10 bg-card px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
            <KeyRound className="h-4 w-4" />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
            {chave.identificador}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
            onClick={onClose}
            aria-label="Fechar detalhe"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex min-w-0 gap-2">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Empreendimento</p>
              <p className="truncate text-sm font-medium">{chave.empreendimento?.nome || "—"}</p>
            </div>
          </div>
          <div className="flex min-w-0 gap-2">
            <Home className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Imóvel</p>
              <p className="truncate text-sm font-medium">{chave.imovelLabel || "—"}</p>
              {rotuloOrigem(chave.origem) ? (
                <p className="truncate text-[11px] text-muted-foreground">{rotuloOrigem(chave.origem)}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white",
            statusSolido,
          )}
        >
          <KeyRound className="h-3.5 w-3.5" />
          {visual.label}
        </span>
        {podeGerenciar ? (
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg px-4" onClick={onEditar}>
            Editar
          </Button>
        ) : null}
      </div>

      <dl className="space-y-3 px-4 py-3 text-sm">
        <div className="flex gap-2.5">
          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[11px] text-muted-foreground">Tipo</dt>
            <dd className="font-medium">{chave.tipo || "—"}</dd>
          </div>
        </div>
        <div className="flex gap-2.5">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[11px] text-muted-foreground">Com</dt>
            <dd className="font-medium">{chave.comQuem}</dd>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[11px] text-muted-foreground">Retirada</dt>
            <dd className="font-medium">{formatChaveQuando(chave.retiradaEm)}</dd>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[11px] text-muted-foreground">Previsão de devolução</dt>
            <dd className="font-medium">{formatChaveQuando(chave.previsaoDevolucao)}</dd>
          </div>
        </div>
        <div className="flex gap-2.5">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[11px] text-muted-foreground">Responsável pela retirada</dt>
            <dd className="font-medium">{chave.retiradaRegistradaPor?.name || "—"}</dd>
          </div>
        </div>
      </dl>

      <div className="border-t px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Histórico rápido</h3>
          <button type="button" className="text-xs font-medium text-sky-600" onClick={onHistorico}>
            Ver histórico completo
          </button>
        </div>
        {!historico ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Carregando…
          </p>
        ) : recente.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhuma movimentação.</p>
        ) : (
          <ol className="relative mt-4 space-y-4 border-l border-border pl-4">
            {recente.map((item) => {
              const ehDevolucao = item.tipo === "devolucao" || item.tipo === "confirmacao";
              const detalhe = item.quemRetirouNome
                ? item.quemRegistrouRetiradaNome
                  ? `${item.quemRetirouNome} (retirada por ${item.quemRegistrouRetiradaNome})`
                  : item.quemRetirouNome
                : ehDevolucao
                  ? `Recebido por: ${item.quemRecebeuDevolucaoNome || "—"}`
                  : item.autorNome;
              const quando = ehDevolucao
                ? formatChaveQuandoComAno(item.devolucaoEm)
                : formatChaveQuandoComAno(item.retiradaEm || item.createdAt);
              return (
                <li key={item.id} className="relative text-sm">
                  <span
                    className={cn(
                      "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card",
                      ehDevolucao ? "bg-rose-500" : "bg-emerald-500",
                    )}
                  />
                  <p className={cn("font-semibold", ehDevolucao ? "text-rose-600" : "text-emerald-600")}>
                    {item.tipo === "devolucao" ? "Devolução (recebida)" : item.tipoLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">{quando}</p>
                  <p className="text-xs text-muted-foreground">{detalhe}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="border-t px-4 py-4">
        <h3 className="text-sm font-semibold">Confirmação do corretor</h3>
        <p className="mt-2 text-sm font-medium">
          {pendente ? "Pendente" : chave.status === "em_uso" ? "Ainda não registrada" : "Em dia"}
        </p>
        <p className="text-xs text-muted-foreground">
          {pendente
            ? "Aguardando confirmação de devolução"
            : chave.status === "em_uso"
              ? "A confirmação aparece depois que a devolução for registrada."
              : "Nenhuma confirmação pendente."}
        </p>
        {pendente ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 border-sky-300 text-sky-700 hover:bg-sky-50"
            onClick={() =>
              toast.message("O corretor vê o pedido de confirmação ao entrar no sistema.")
            }
          >
            Notificar corretor
          </Button>
        ) : null}
      </div>

      <div className="mt-auto space-y-2 border-t px-4 py-4">
        <p className="text-sm font-semibold">Ações</p>
        {chave.status === "em_uso" && podeGerenciar ? (
          <Button type="button" className="w-full" onClick={onDevolver}>
            Registrar devolução
          </Button>
        ) : null}
        {chave.status !== "em_uso" && podeRetirar ? (
          <Button type="button" className="w-full" onClick={onRetirar}>
            Retirar chave
          </Button>
        ) : null}
        {chave.status !== "em_uso" && podeGerenciar ? (
          <Button type="button" variant="outline" className="w-full" onClick={onManual}>
            Registrar retirada
          </Button>
        ) : null}
        {podeGerenciar ? (
          <Button type="button" variant="outline" className="w-full" onClick={onEditar}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar chave
          </Button>
        ) : null}
        {podeIdentificador ? (
          <Button
            type="button"
            variant="outline"
            className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={onEditar}
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" />
            Alterar identificador
          </Button>
        ) : null}
      </div>
    </aside>
  );
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
  const [faixa, setFaixa] = useState<FaixaChave | "">("");
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState<"" | "captacao" | "usado">("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [pagina, setPagina] = useState(1);
  const [selecionada, setSelecionada] = useState<MuralChave | null>(null);
  const [painelHistorico, setPainelHistorico] = useState<{
    identificadoresAnteriores: string[];
    itens: MuralChaveHistoricoItem[];
  } | null>(null);
  const [avisos, setAvisos] = useState<Notificacao[]>([]);
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
  const [tipo, setTipo] = useState("");
  const [tipoPersonalizado, setTipoPersonalizado] = useState(false);
  const [local, setLocal] = useState<MuralChaveLocal>("imobiliaria");
  const [localDescricao, setLocalDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [corretorId, setCorretorId] = useState("");
  const [quando, setQuando] = useState("");
  const [previsao, setPrevisao] = useState("");

  const carregar = useCallback(async () => {
    try {
      const rows = await fetchMuralChaves();
      setChaves(rows);
      setSelecionada((atual) => {
        if (!atual) return atual;
        return rows.find((item) => item.id === atual.id) ?? null;
      });
      setErro("");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível carregar o mural.");
    } finally {
      setCarregando(false);
    }
  }, []);

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
    setPagina(1);
  }, [q, faixa, empreendimentoId, origemFiltro, tipoFiltro, responsavel]);

  useEffect(() => {
    void fetchNotificacoes()
      .then((rows) =>
        setAvisos(rows.filter((item) => item.tipo.startsWith("chave_")).slice(0, 3)),
      )
      .catch(() => setAvisos([]));
  }, [chaves]);

  useEffect(() => {
    if (!selecionada) {
      setPainelHistorico(null);
      return;
    }
    let ativo = true;
    setPainelHistorico(null);
    void fetchMuralChaveHistorico(selecionada.id)
      .then((data) => {
        if (ativo) setPainelHistorico(data);
      })
      .catch(() => {
        if (ativo) setPainelHistorico({ identificadoresAnteriores: [], itens: [] });
      });
    return () => {
      ativo = false;
    };
  }, [selecionada?.id, selecionada?.updatedAt]);

  useEffect(() => {
    if (acao?.tipo !== "historico") {
      setHistorico(null);
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
    setTipo("");
    setTipoPersonalizado(false);
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
    setTipo(chave.tipo);
    setTipoPersonalizado(false);
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
    if (!tipo.trim()) {
      toast.error("Informe o tipo da chave.");
      return;
    }
    if (!formImovel) {
      toast.error("Vincule a chave a um imóvel de captação ou de usados.");
      return;
    }
    setSalvando(true);
    try {
      const emUso = acao?.tipo === "editar" && acao.chave.status === "em_uso";
      const body = {
        identificador: identificador.trim(),
        tipo: tipo.trim(),
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
      void fetchMuralChaveOpcoes().then(setOpcoes).catch(() => undefined);
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

  const texto = q.trim().toLocaleLowerCase("pt-BR");
  const lista = useMemo(() => {
    return chaves.filter((chave) => {
      if (faixa && faixaDaChave(chave) !== faixa) return false;
      if (empreendimentoId && chave.empreendimento?.id !== empreendimentoId) return false;
      if (!chaveNaOrigem(chave, origemFiltro)) return false;
      if (tipoFiltro && chave.tipo !== tipoFiltro) return false;
      if (responsavel && chave.comQuem !== responsavel) return false;
      if (!texto) return true;
      const alvo = [
        chave.identificador,
        chave.tipo,
        chave.imovelLabel,
        rotuloOrigem(chave.origem),
        chave.empreendimento?.nome,
        chave.comQuem,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return alvo.includes(texto);
    });
  }, [chaves, empreendimentoId, origemFiltro, faixa, tipoFiltro, responsavel, texto]);
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = lista.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const contagem = {
    disponivel: chaves.filter((chave) => faixaDaChave(chave) === "disponivel").length,
    em_uso: chaves.filter((chave) => faixaDaChave(chave) === "em_uso").length,
    proprietario: chaves.filter((chave) => faixaDaChave(chave) === "proprietario").length,
    outro: chaves.filter((chave) => faixaDaChave(chave) === "outro").length,
  };
  const responsaveis = [...new Set(chaves.map((chave) => chave.comQuem).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const tiposFiltro = [
    ...new Set(
      ["Aluguel", "Usado", ...(opcoes?.tipos ?? []), ...chaves.map((chave) => chave.tipo ?? "")]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  const empreendimentosFiltro =
    opcoes?.empreendimentos.length
      ? opcoes.empreendimentos
      : [...new Map(chaves.filter((c) => c.empreendimento).map((c) => [c.empreendimento!.id, c.empreendimento!])).values()];

  function limparFiltros() {
    setQ("");
    setFaixa("");
    setEmpreendimentoId("");
    setOrigemFiltro("");
    setTipoFiltro("");
    setResponsavel("");
    setPagina(1);
  }

  function escolher(chave: MuralChave) {
    setSelecionada(chave);
  }

  const tiposCadastro = tiposFiltro;
  const tipoEhNovo = tipoPersonalizado || (tipo.trim() !== "" && !tiposCadastro.includes(tipo));
  const imoveisCadastro = useMemo(() => {
    const lista = opcoes?.imoveis ?? [];
    if (!formImovel || lista.some((item) => item.id === formImovel)) return lista;
    if (acao?.tipo !== "editar" || acao.chave.imovel?.id !== formImovel) return lista;
    return [
      ...lista,
      {
        id: acao.chave.imovel.id,
        label: acao.chave.imovel.label,
        origem: acao.chave.origem,
      },
    ];
  }, [acao, formImovel, opcoes?.imoveis]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Mural de Chaves</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Controle das chaves dos imóveis de captação e de usados. Saiba em tempo real onde
                  está cada chave, quem está com ela e seu status.
                </p>
              </div>
            </div>
            {podeGerenciar ? (
              <Button onClick={abrirCriar} className="rounded-xl">
                <Plus className="mr-1.5 h-4 w-4" />
                Cadastrar Chave
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {(
              [
                ["disponivel", "Disponíveis", contagem.disponivel, KeyRound, "emerald"],
                ["em_uso", "Em uso", contagem.em_uso, LogOut, "rose"],
                ["proprietario", "Com proprietário", contagem.proprietario, UserRound, "blue"],
                ["outro", "Outro local", contagem.outro, MapPin, "violet"],
              ] as const
            ).map(([id, label, total, Icone, tone]) => (
              <FinanceKpiCard
                key={id}
                label={label}
                value={total}
                icon={Icone}
                tone={tone as FinanceKpiTone}
                format="number"
                variant="dash"
                detail={`de ${chaves.length} chaves`}
                active={faixa === id}
                onClick={() => setFaixa(faixa === id ? "" : id)}
              />
            ))}
          </div>

          <div className={cn(FILTER_BAR_SURFACE, "flex flex-wrap items-center gap-2")}>
            <div className="relative min-w-[220px] flex-1">
              <Search className={FILTER_SEARCH_ICON} />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Buscar chave, imóvel, captação ou usado..."
                className={cn("pl-9", FILTER_CONTROL)}
              />
            </div>
            <FiltroSelectNativo
              className="max-w-[180px]"
              value={tipoFiltro}
              onChange={(event) => setTipoFiltro(event.target.value)}
            >
              <option value="">Tipo</option>
              {tiposFiltro.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </FiltroSelectNativo>
            <FiltroSelectNativo
              className="max-w-[180px]"
              value={origemFiltro}
              onChange={(event) =>
                setOrigemFiltro(event.target.value as "" | "captacao" | "usado")
              }
            >
              <option value="">Origem</option>
              <option value="captacao">Captação</option>
              <option value="usado">Usado</option>
            </FiltroSelectNativo>
            <FiltroSelectNativo
              className="max-w-[200px]"
              value={empreendimentoId}
              onChange={(event) => setEmpreendimentoId(event.target.value)}
            >
              <option value="">Empreendimento</option>
              {empreendimentosFiltro.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </FiltroSelectNativo>
            <FiltroSelectNativo
              value={faixa}
              onChange={(event) => setFaixa(event.target.value as FaixaChave | "")}
            >
              <option value="">Status</option>
              <option value="disponivel">Disponível</option>
              <option value="em_uso">Em uso</option>
              <option value="proprietario">Com proprietário</option>
              <option value="outro">Outro local</option>
            </FiltroSelectNativo>
            <FiltroSelectNativo
              className="max-w-[180px]"
              value={responsavel}
              onChange={(event) => setResponsavel(event.target.value)}
            >
              <option value="">Responsável</option>
              {responsaveis.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </FiltroSelectNativo>
            <Button type="button" variant="ghost" className={FILTER_CLEAR_BTN} onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </div>

          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando mural…
            </div>
          ) : lista.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {chaves.length === 0
                ? "Nenhuma chave cadastrada."
                : "Nenhuma chave encontrada."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Chave / identificador</th>
                      <th className="px-3 py-3 font-medium">Empreendimento</th>
                      <th className="px-3 py-3 font-medium">Imóvel</th>
                      <th className="px-3 py-3 font-medium">Tipo</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Com</th>
                      <th className="px-3 py-3 font-medium">Retirada</th>
                      <th className="px-3 py-3 font-medium">Prev. devolução</th>
                      <th className="px-3 py-3 font-medium">Resp. retirada</th>
                      <th className="px-3 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((chave) => {
                      const visual = FAIXA_VISUAL[faixaDaChave(chave)];
                      const usada = chave.status === "em_uso";
                      const ativa = selecionada?.id === chave.id;
                      return (
                        <tr
                          key={chave.id}
                          className={cn(
                            "cursor-pointer border-b last:border-0 transition hover:bg-orange-50/50",
                            ativa && "bg-sky-50 shadow-[inset_3px_0_0_0_#0284c7]",
                          )}
                          onClick={() => escolher(chave)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                                <KeyRound className="h-4 w-4" />
                              </span>
                              <span className="font-semibold">{chave.identificador}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {chave.empreendimento?.nome || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <p>{chave.imovelLabel || "—"}</p>
                            {rotuloOrigem(chave.origem) ? (
                              <p className="text-[11px] text-muted-foreground">
                                {rotuloOrigem(chave.origem)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">{chave.tipo || "—"}</td>
                          <td className="px-3 py-3">
                            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", visual.pill)}>
                              {visual.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <PessoaMarca nome={chave.comQuem} detalhe={papelCurto(chave)} />
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {formatChaveQuando(chave.retiradaEm)}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {formatChaveQuando(chave.previsaoDevolucao)}
                          </td>
                          <td className="px-3 py-3">
                            <PessoaMarca nome={chave.retiradaRegistradaPor?.name || "—"} />
                          </td>
                          <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => escolher(chave)}>Ver detalhe</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAcao({ tipo: "historico", chave })}>
                                  Histórico
                                </DropdownMenuItem>
                                {podeRetirar && !usada ? (
                                  <DropdownMenuItem onClick={() => abrirMovimento("retirar", chave)}>
                                    Retirar
                                  </DropdownMenuItem>
                                ) : null}
                                {podeGerenciar && !usada ? (
                                  <DropdownMenuItem onClick={() => abrirMovimento("manual", chave)}>
                                    Registrar retirada
                                  </DropdownMenuItem>
                                ) : null}
                                {podeGerenciar && usada ? (
                                  <DropdownMenuItem onClick={() => abrirMovimento("devolver", chave)}>
                                    Registrar devolução
                                  </DropdownMenuItem>
                                ) : null}
                                {podeGerenciar ? (
                                  <DropdownMenuItem onClick={() => abrirEditar(chave)}>Editar</DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Mostrando {visiveis.length} de {lista.length} chaves
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={paginaAtual <= 1}
                    onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPaginas }, (_, index) => index + 1)
                    .slice(0, 6)
                    .map((numero) => (
                      <Button
                        key={numero}
                        type="button"
                        size="icon"
                        variant={numero === paginaAtual ? "default" : "outline"}
                        className="h-8 w-8"
                        onClick={() => setPagina(numero)}
                      >
                        {numero}
                      </Button>
                    ))}
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={paginaAtual >= totalPaginas}
                    onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-card p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white">
                  <LogOut className="h-4 w-4" />
                </span>
                Retirada de chave pelo corretor
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                O corretor seleciona a chave que vai retirar e o sistema registra automaticamente a
                movimentação.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={!selecionada || selecionada.status === "em_uso" || !podeRetirar}
                onClick={() => {
                  if (!selecionada) return;
                  abrirMovimento("retirar", selecionada);
                }}
              >
                Registrar retirada
              </Button>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-card p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500 text-white">
                  <KeyRound className="h-4 w-4" />
                </span>
                Gerenciamento de chaves
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Usuários autorizados podem cadastrar, editar e gerenciar as chaves do sistema.
              </p>
              {podeGerenciar ? (
                <Button type="button" size="sm" variant="outline" className="mt-3" onClick={abrirCriar}>
                  Gerenciar chaves
                </Button>
              ) : null}
            </div>
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white">
                    <Bell className="h-4 w-4" />
                  </span>
                  Notificações recentes
                </h3>
              </div>
              {avisos.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">Nenhuma movimentação recente.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {avisos.map((aviso) => (
                    <li key={aviso.id} className="text-xs leading-relaxed">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                      {aviso.titulo}
                      <span className="mt-0.5 block text-muted-foreground">
                        {formatChaveQuando(aviso.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          </div>
        </div>

        {selecionada ? (
          <PainelChave
            chave={selecionada}
            historico={painelHistorico}
            podeGerenciar={podeGerenciar}
            podeIdentificador={podeIdentificador}
            podeRetirar={podeRetirar}
            onClose={() => setSelecionada(null)}
            onEditar={() => {
              abrirEditar(selecionada);
            }}
            onRetirar={() => {
              abrirMovimento("retirar", selecionada);
            }}
            onManual={() => {
              abrirMovimento("manual", selecionada);
            }}
            onDevolver={() => {
              abrirMovimento("devolver", selecionada);
            }}
            onHistorico={() => setAcao({ tipo: "historico", chave: selecionada })}
          />
        ) : null}
      </div>

      <Dialog open={acao?.tipo === "criar" || acao?.tipo === "editar"} onOpenChange={(open) => !open && setAcao(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{acao?.tipo === "editar" ? "Editar chave" : "Nova chave"}</DialogTitle>
            <DialogDescription>
              O identificador fica livre para o padrão da imobiliária. A chave fica vinculada a um
              imóvel de captação ou de usados, e o histórico permanece se o código mudar.
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
                <Label htmlFor="chave-imovel">Imóvel de captação ou usados</Label>
                <select
                  id="chave-imovel"
                  className={fieldClass()}
                  value={formImovel}
                  onChange={(event) => setFormImovel(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {imoveisCadastro.map((item) => (
                    <option key={item.id} value={item.id}>
                      {rotuloImovelOpcao(item)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Só entram imóveis que estão na captação, na venda de usados, ou nos dois.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chave-tipo">Tipo</Label>
              <select
                id="chave-tipo"
                className={fieldClass()}
                value={tipoEhNovo ? "__novo__" : tipo}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__novo__") {
                    setTipoPersonalizado(true);
                    setTipo("");
                    return;
                  }
                  setTipoPersonalizado(false);
                  setTipo(value);
                }}
              >
                <option value="">Selecione</option>
                {tiposCadastro.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="__novo__">Outro tipo…</option>
              </select>
              {tipoEhNovo ? (
                <Input
                  value={tipo}
                  onChange={(event) => setTipo(event.target.value)}
                  placeholder="Nome do tipo, como temporada ou planta"
                  maxLength={40}
                />
              ) : null}
              <p className="text-xs text-muted-foreground">
                Aluguel e Usado já vêm prontos. Outro tipo fica disponível para as próximas chaves.
              </p>
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
                      {rotuloOrigem(acao.chave.origem) || "Sem origem"}
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

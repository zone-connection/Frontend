import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api";
import {
  distribuirLeadsCorretores,
  distribuirLeadsEquipes,
  fetchDistribuirResumo,
  type DistribuirResumo,
} from "@/lib/leads-api";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Loader2,
  Pause,
  Play,
  Search,
  Settings,
  Shield,
  Trash2,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  addFilaMembro,
  fetchFilaElegiveis,
  fetchFilaPainel,
  removeFilaMembro,
  reordenarFila,
  setFilaAtiva,
  setFilaMembroAtivo,
  setFilaPrazo,
  type FilaElegivel,
  type FilaPainel,
} from "@/lib/lead-fila-api";

const CARGO: Record<string, string> = {
  corretor: "Corretor",
  gerente: "Gerente",
  treinee: "Trainee",
};

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function FilaDistribuicaoPainel({
  onlineIds,
}: {
  onlineIds: Set<string>;
}) {
  const [painel, setPainel] = useState<FilaPainel | null>(null);
  const [elegiveis, setElegiveis] = useState<FilaElegivel[]>([]);
  const [userId, setUserId] = useState("");
  const [busca, setBusca] = useState("");
  const [minutos, setMinutos] = useState("0");
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    const [next, livres] = await Promise.all([
      fetchFilaPainel(),
      fetchFilaElegiveis(),
    ]);
    setPainel(next);
    setMinutos(String(next.redistribuirMinutos ?? 0));
    setElegiveis(livres);
  }, []);

  useEffect(() => {
    void load()
      .catch((err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível carregar a fila.",
        ),
      )
      .finally(() => setBusy(false));
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível atualizar a fila.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!painel) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando fila…
      </p>
    );
  }

  const termo = busca.trim().toLowerCase();
  const membros = painel.membros.filter((m) =>
    termo ? m.nome.toLowerCase().includes(termo) : true,
  );
  const ativos = painel.membros.filter((m) => m.ativoNaFila).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#079ed4]/20 bg-[#079ed4]/8 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#079ed4]/15 text-[#079ed4]">
            <Zap className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Distribuição automática</p>
            <p className="text-xs text-muted-foreground">
              {painel.ativa
                ? "Leads novos seguem a ordem. Quem recebe vai para o fim."
                : "Pausada. Novos leads não entram na fila."}
            </p>
          </div>
        </div>
        <Switch
          checked={painel.ativa}
          disabled={busy}
          onCheckedChange={(ativa) => void run(() => setFilaAtiva(ativa))}
          aria-label="Ativar fila automática"
        />
      </div>

      <div className="flex items-center gap-3 rounded-2xl border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-[#079ed4]">
          <Clock className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Redistribuir após (min)</p>
          <p className="text-xs text-muted-foreground">
            Parado na primeira etapa, sem atividade, vai ao próximo. 0 desliga.
          </p>
        </div>
        <Input
          type="number"
          min={0}
          max={1440}
          className="h-9 w-20"
          value={minutos}
          onChange={(e) => setMinutos(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(() =>
              setFilaPrazo(Math.max(0, Math.min(1440, Math.trunc(Number(minutos) || 0)))),
            )
          }
        >
          Salvar
        </Button>
      </div>

      <div className="rounded-2xl border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#079ed4]" />
            <div>
              <p className="text-sm font-semibold">Corretores</p>
              <p className="text-xs text-muted-foreground">
                {ativos} ativo{ativos === 1 ? "" : "s"} na fila
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar corretor..."
              className="h-9 w-48 pl-8"
            />
          </div>
        </div>
        <ul className="space-y-2 p-3">
          {membros.length === 0 ? (
            <li className="px-2 py-4 text-sm text-muted-foreground">
              {painel.membros.length === 0
                ? "Nenhum integrante na fila."
                : "Nenhum corretor com esse nome."}
            </li>
          ) : (
            membros.map((membro) => {
              const index = painel.membros.findIndex((m) => m.id === membro.id);
              const online = onlineIds.has(membro.userId);
              return (
                <li
                  key={membro.id}
                  className="flex items-center gap-2 rounded-xl border px-2 py-2"
                >
                  <span className="w-5 text-center text-xs font-semibold text-[#079ed4]">
                    {membro.ordem}
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#079ed4]/15 text-xs font-semibold text-[#075a82]">
                    {iniciais(membro.nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {membro.nome}
                      {online ? (
                        <span className="ml-1.5 text-xs font-normal text-emerald-600">● Online</span>
                      ) : null}
                      {membro.proximo ? (
                        <span className="ml-1.5 text-xs font-normal text-[#079ed4]">· próximo</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {CARGO[membro.role] ?? membro.role}
                      {membro.ativoNaFila ? "" : " · pausado"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-full"
                    disabled={busy || index <= 0}
                    onClick={() => {
                      const ids = painel.membros.map((m) => m.id);
                      const [item] = ids.splice(index, 1);
                      ids.splice(index - 1, 0, item);
                      void run(() => reordenarFila(ids));
                    }}
                    aria-label="Subir"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-full"
                    disabled={busy || index === painel.membros.length - 1}
                    onClick={() => {
                      const ids = painel.membros.map((m) => m.id);
                      const [item] = ids.splice(index, 1);
                      ids.splice(index + 1, 0, item);
                      void run(() => reordenarFila(ids));
                    }}
                    aria-label="Descer"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={busy}
                    onClick={() =>
                      void run(() => setFilaMembroAtivo(membro.id, !membro.ativoNaFila))
                    }
                  >
                    {membro.ativoNaFila ? (
                      <Pause className="size-3.5" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    {membro.ativoNaFila ? "Pausar" : "Ativar"}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-full"
                    disabled={busy}
                    onClick={() => void run(() => removeFilaMembro(membro.id))}
                    aria-label="Tirar da fila"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              );
            })
          )}
        </ul>
        <div className="border-t p-3">
          <div className="flex gap-2">
            <select
              className="h-10 min-w-0 flex-1 rounded-xl border border-dashed bg-background px-3 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Adicionar corretor</option>
              {elegiveis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {CARGO[u.role] ?? u.role}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={!userId || busy}
              onClick={() =>
                void run(async () => {
                  await addFilaMembro(userId);
                  setUserId("");
                })
              }
            >
              <UserPlus className="size-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const rem = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

type Destino = "equipes" | "corretores" | "fila";

export function LeadsDistribuirDialog({
  open,
  onOpenChange,
  onDone,
  selectedLeadIds = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  selectedLeadIds?: string[];
}) {
  const selecionados = useMemo(
    () => [...new Set(selectedLeadIds)],
    [selectedLeadIds],
  );
  const usarSelecao = selecionados.length > 0;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumo, setResumo] = useState<DistribuirResumo | null>(null);
  const [destino, setDestino] = useState<Destino>("equipes");
  const [qtdEquipes, setQtdEquipes] = useState<Record<string, number>>({});
  const [qtdCorretores, setQtdCorretores] = useState<Record<string, number>>(
    {},
  );
  const [corretorPreferido, setCorretorPreferido] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDistribuirResumo();
      setResumo(data);
      const defaultDestino: Destino =
        usarSelecao || data.equipes.length === 0 ? "corretores" : "equipes";
      setDestino(defaultDestino);
      setCorretorPreferido("");
      setQtdEquipes(
        Object.fromEntries(data.equipes.map((eq) => [eq.equipeId, 0])),
      );
      setQtdCorretores(
        Object.fromEntries(data.corretores.map((c) => [c.id, 0])),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a distribuição.",
      );
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange, selecionados.length, usarSelecao]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const somaEquipes = useMemo(
    () => Object.values(qtdEquipes).reduce((s, n) => s + (Number(n) || 0), 0),
    [qtdEquipes],
  );
  const somaCorretores = useMemo(
    () =>
      Object.values(qtdCorretores).reduce((s, n) => s + (Number(n) || 0), 0),
    [qtdCorretores],
  );
  const disponiveis = usarSelecao
    ? selecionados.length
    : (resumo?.disponiveis ?? 0);

  async function autoDividir() {
    if (!resumo) return;
    if (disponiveis <= 0) {
      toast.error(
        usarSelecao
          ? "Selecione leads na lista para distribuir."
          : "Não há leads no pool do admin para distribuir.",
      );
      return;
    }
    if (destino === "equipes") {
      if (resumo.equipes.length === 0) {
        toast.error("Nenhuma equipe cadastrada.");
        return;
      }
      const split = splitEvenly(disponiveis, resumo.equipes.length);
      const next: Record<string, number> = {};
      resumo.equipes.forEach((eq, i) => {
        next[eq.equipeId] = split[i] ?? 0;
      });
      setQtdEquipes(next);
      toast.success("Quantidades divididas entre as equipes. Confirme para enviar.");
      return;
    }
    const online = resumo.corretores.filter((c) => c.online);
    if (online.length === 0) {
      toast.error(
        "Nenhum corretor online agora. Quem estiver no CRM com sessão ativa recebe a divisão.",
      );
      return;
    }
    if (online.length === 1) {
      toast.error(
        "Só um corretor está online. Informe a quantidade no campo dele em vez de enviar o pool inteiro.",
      );
      return;
    }
    const split = splitEvenly(disponiveis, online.length);
    const next: Record<string, number> = {};
    resumo.corretores.forEach((c) => {
      next[c.id] = 0;
    });
    online.forEach((c, i) => {
      next[c.id] = split[i] ?? 0;
    });
    setQtdCorretores(next);
    setSaving(true);
    try {
      const result = await distribuirLeadsCorretores({
        ...(usarSelecao ? { leadIds: selecionados } : {}),
        alocacoes: resumo.corretores.map((c) => ({
          corretorId: c.id,
          quantidade: Number(next[c.id]) || 0,
        })),
      });
      const detalhe = result.distribuicao
        .filter((d) => d.quantidade > 0)
        .map((d) => `${d.nome}: ${d.quantidade}`)
        .join(" · ");
      toast.success(
        `${result.total} lead(s) enviados aos corretores online.${detalhe ? ` ${detalhe}` : ""}`,
      );
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível distribuir os leads.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!resumo) return;
    if (usarSelecao) {
      if (!corretorPreferido) {
        toast.error("Escolha o corretor que vai receber os leads.");
        return;
      }
      setSaving(true);
      try {
        const result = await distribuirLeadsCorretores({
          leadIds: selecionados,
          alocacoes: [
            {
              corretorId: corretorPreferido,
              quantidade: selecionados.length,
            },
          ],
        });
        const nome =
          resumo.corretores.find((c) => c.id === corretorPreferido)?.nome ??
          "o corretor";
        toast.success(`${result.total} lead(s) enviados para ${nome}.`);
        onOpenChange(false);
        onDone();
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível distribuir os leads.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const soma = destino === "equipes" ? somaEquipes : somaCorretores;
    if (soma <= 0) {
      toast.error("Informe quantidades maiores que zero.");
      return;
    }
    if (soma > resumo.disponiveis) {
      toast.error(
        `A soma (${soma}) ultrapassa os ${resumo.disponiveis} leads disponíveis.`,
      );
      return;
    }

    setSaving(true);
    try {
      if (destino === "equipes") {
        const result = await distribuirLeadsEquipes(
          resumo.equipes.map((eq) => ({
            equipeId: eq.equipeId,
            quantidade: Number(qtdEquipes[eq.equipeId]) || 0,
          })),
        );
        toast.success(
          `${result.total} lead(s) enviados às equipes (ainda sem corretor individual).`,
        );
      } else {
        const result = await distribuirLeadsCorretores({
          alocacoes: resumo.corretores.map((c) => ({
            corretorId: c.id,
            quantidade: Number(qtdCorretores[c.id]) || 0,
          })),
        });
        const detalhe = result.distribuicao
          .filter((d) => d.quantidade > 0)
          .map((d) => `${d.nome}: ${d.quantidade}`)
          .join(" · ");
        toast.success(
          `${result.total} lead(s) enviados aos corretores.${detalhe ? ` ${detalhe}` : ""}`,
        );
      }
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível distribuir os leads.",
      );
    } finally {
      setSaving(false);
    }
  }

  const podeConfirmar = usarSelecao
    ? !!resumo &&
      selecionados.length > 0 &&
      !!corretorPreferido &&
      resumo.corretores.length > 0
    : !!resumo &&
      resumo.disponiveis > 0 &&
      (destino === "equipes"
        ? resumo.equipes.length > 0 && somaEquipes > 0
        : resumo.corretores.length > 0 && somaCorretores > 0);

  const onlineIds = new Set(
    (resumo?.corretores ?? []).filter((c) => c.online).map((c) => c.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-row items-start gap-3 space-y-0 border-b px-6 py-5 text-left">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#079ed4] text-white">
            <Users className="size-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>
              {usarSelecao
                ? `Distribuir ${selecionados.length} lead(s) selecionado(s)`
                : "Distribuir leads"}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {usarSelecao
                ? "Só os leads marcados na lista vão para o corretor que você escolher."
                : "Envie leads do pool do admin (sem equipe e sem corretor), incluindo os de retrabalho. Por equipes: o lead vai para o pool da equipe; por corretores: já fica com um corretor."}
            </DialogDescription>
          </div>
        </DialogHeader>

        {loading || !resumo ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando…
          </div>
        ) : usarSelecao ? (
          <div className="space-y-4 overflow-auto flex-1 min-h-0">
            <p className="text-sm">
              Selecionados:{" "}
              <span className="font-semibold tabular-nums">
                {selecionados.length}
              </span>
            </p>
            {resumo.corretores.length === 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Cadastre corretores ativos em Usuários para poder distribuir.
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Corretor
                </Label>
                <Select
                  value={corretorPreferido || undefined}
                  onValueChange={setCorretorPreferido}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Escolha o corretor" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumo.corretores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                        {c.equipeNome ? ` · ${c.equipeNome}` : ""}
                        {c.online ? " · Online" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-0 overflow-auto lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 rounded-2xl border px-3 py-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#079ed4]/10 text-[#079ed4]">
                  <Users className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Disponíveis</p>
                  <p className="text-lg font-semibold tabular-nums text-[#079ed4]">
                    {resumo.disponiveis}
                  </p>
                </div>
              </div>
              <Tabs value={destino} onValueChange={(v) => setDestino(v as Destino)}>
                <TabsList>
                  <TabsTrigger value="equipes" disabled={resumo.equipes.length === 0}>
                    Por equipes
                  </TabsTrigger>
                  <TabsTrigger value="corretores" disabled={resumo.corretores.length === 0}>
                    Por corretores
                  </TabsTrigger>
                  <TabsTrigger value="fila">Fila</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Tabs value={destino} onValueChange={(v) => setDestino(v as Destino)}>

              {destino === "fila" ? null : (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving || loading}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void autoDividir();
                  }}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Dividir automaticamente
                </Button>
              </div>
              )}

              <TabsContent value="equipes" className="mt-3 space-y-2">
                {resumo.equipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma equipe cadastrada. Use a aba Corretores.
                  </p>
                ) : (
                  resumo.equipes.map((eq) => (
                    <div
                      key={eq.equipeId}
                      className="flex items-center gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {eq.nome}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Gerente: {eq.gerente} · {eq.corretores} corretor
                          {eq.corretores === 1 ? "" : "es"}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        className="w-24 h-9"
                        value={qtdEquipes[eq.equipeId] ?? 0}
                        onChange={(e) =>
                          setQtdEquipes((prev) => ({
                            ...prev,
                            [eq.equipeId]: Math.max(
                              0,
                              Number(e.target.value) || 0,
                            ),
                          }))
                        }
                      />
                    </div>
                  ))
                )}
                <p className="text-xs text-muted-foreground">
                  Soma: {somaEquipes} / {resumo.disponiveis}
                </p>
              </TabsContent>

              <TabsContent value="corretores" className="mt-3 space-y-2">
                {resumo.corretores.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Cadastre corretores ativos em Usuários para poder distribuir.
                  </p>
                ) : (
                  resumo.corretores.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {c.nome}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.equipeNome
                            ? `Equipe: ${c.equipeNome}`
                            : "Sem equipe"}
                          {c.online ? " · Online" : ""}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        className="w-24 h-9"
                        value={qtdCorretores[c.id] ?? 0}
                        onChange={(e) =>
                          setQtdCorretores((prev) => ({
                            ...prev,
                            [c.id]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </div>
                  ))
                )}
                <p className="text-xs text-muted-foreground">
                  Soma: {somaCorretores} / {resumo.disponiveis}
                </p>
              </TabsContent>

              <TabsContent value="fila" className="mt-3">
                <FilaDistribuicaoPainel onlineIds={onlineIds} />
              </TabsContent>
            </Tabs>
            </div>
            <aside className="space-y-5 border-t bg-muted/40 p-5 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Settings className="size-4 text-[#079ed4]" />
                Configurações da distribuição
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Tipo de distribuição</p>
                <div className="grid grid-cols-1 gap-2">
                  {(
                    [
                      ["corretores", "Por corretores"],
                      ["equipes", "Por equipes"],
                      ["fila", "Fila"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDestino(id)}
                      className={
                        destino === id
                          ? "rounded-xl bg-[#079ed4] px-3 py-2 text-left text-sm font-medium text-white"
                          : "rounded-xl border bg-background px-3 py-2 text-left text-sm"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {destino === "equipes"
                    ? "O lead vai para o pool da equipe, ainda sem corretor."
                    : destino === "fila"
                      ? "A fila entrega um lead por vez e quem recebe vai para o fim."
                      : "O lead fica direto com os corretores escolhidos."}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Ordem de prioridade</p>
                <p className="text-xs text-muted-foreground">
                  Na fila, a ordem de cima para baixo define quem recebe o próximo lead.
                </p>
              </div>
              <div className="flex gap-2 rounded-xl border bg-background px-3 py-2">
                <Shield className="mt-0.5 size-4 shrink-0 text-[#079ed4]" />
                <div>
                  <p className="text-sm font-medium">Incluir leads de retrabalho</p>
                  <p className="text-xs text-muted-foreground">
                    Leads que já passaram por atendimento também entram neste envio.
                  </p>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border bg-background px-3 py-3 text-sm">
                <p className="font-semibold">Resumo</p>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Disponíveis</span>
                  <span className="font-medium text-foreground">{resumo.disponiveis}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Destino</span>
                  <span className="font-medium text-foreground">
                    {destino === "equipes" ? "Equipes" : destino === "fila" ? "Fila" : "Corretores"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Soma informada</span>
                  <span className="font-medium text-foreground">
                    {destino === "equipes" ? somaEquipes : destino === "corretores" ? somaCorretores : "—"}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || loading || !podeConfirmar || destino === "fila"}
            className={destino === "fila" ? "hidden" : undefined}
            onClick={() => void handleConfirm()}
          >
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Confirmar distribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

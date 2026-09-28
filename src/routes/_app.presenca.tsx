import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardCheck,
  FileDown,
  Filter,
  Loader2,
  Plus,
  Settings2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { SemConexao } from "@/components/sem-conexao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canViewModule } from "@/lib/permissions";
import {
  createPresencaTipo,
  deletePresencaTipo,
  fetchPresencaMes,
  updatePresencaTipo,
  upsertPresencaLancamento,
  type PresencaCelula,
  type PresencaMes,
  type PresencaNatureza,
  type PresencaTipo,
} from "@/lib/presenca-api";
import {
  applyPresencaFiltros,
  labelPresencaFiltros,
  PRESENCA_FILTRO_NATUREZA,
  type PresencaFiltroNatureza,
} from "@/lib/presenca-filter";
import { downloadPresencaPdf } from "@/lib/presenca-pdf";
import { useTenantTheme } from "@/lib/tenant-theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/presenca")({
  head: () => ({ meta: [{ title: "Presença — Zone Connection" }] }),
  component: Page,
});

const NATUREZAS: { id: PresencaNatureza; label: string }[] = [
  { id: "presente", label: "Presença" },
  { id: "meio_periodo", label: "Meio período" },
  { id: "falta", label: "Falta" },
  { id: "falta_justificada", label: "Falta justificada" },
];

const ROLE_OPTS = [
  { id: "corretor", label: "Corretor" },
  { id: "treinee", label: "Trainee" },
  { id: "gerente", label: "Gerente" },
  { id: "admin", label: "Admin" },
  { id: "assistente", label: "Assistente" },
  { id: "analista", label: "Analista" },
  { id: "financeiro", label: "Financeiro" },
];

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function weekday(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return ["D", "S", "T", "Q", "Q", "S", "S"][d.getDay()]!;
}

function tiposParaRole(tipos: PresencaTipo[], role: string) {
  return tipos.filter(
    (t) => t.ativo && (t.roles.length === 0 || t.roles.includes(role)),
  );
}

function pctChange(atual: number, anterior: number) {
  if (!anterior) return atual ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

function signedDelta(n: number) {
  if (Math.abs(n) < 0.005) return "0";
  return `${n > 0 ? "+" : ""}${n.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}`;
}

function deltaClass(n: number, invert = false) {
  if (Math.abs(n) < 0.005) return "text-muted-foreground";
  const good = invert ? n < 0 : n > 0;
  return good ? "text-emerald-600" : "text-rose-600";
}

function Page() {
  const user = getSession();
  const { tenant, logoUrl, brandName } = useTenantTheme();
  const canView = canViewModule(user, "presenca");
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [data, setData] = useState<PresencaMes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [tiposOpen, setTiposOpen] = useState(false);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [naturezaFiltro, setNaturezaFiltro] =
    useState<PresencaFiltroNatureza>("todos");
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const mesData = await fetchPresencaMes(ano, mes);
      setData({
        ...mesData,
        comparativoUsuarios: mesData.comparativoUsuarios ?? [],
      });
      setOffline(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) setOffline(true);
      else toast.error(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, [ano, mes, canView]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const valid = new Set(data.usuarios.map((u) => u.userId));
    setUserIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [data]);

  const shift = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };

  const onPickTipo = async (
    userId: string,
    day: string,
    tipoId: string | null,
  ) => {
    if (!data?.podeEditar) return;
    const key = `${userId}|${day}`;
    setSaving(key);
    try {
      await upsertPresencaLancamento({ userId, data: day, tipoId });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSaving(null);
    }
  };

  const view = useMemo(
    () => (data ? applyPresencaFiltros(data, userIds, naturezaFiltro) : null),
    [data, userIds, naturezaFiltro],
  );

  const filtroLabel = data
    ? labelPresencaFiltros(data, userIds, naturezaFiltro)
    : "Equipe completa";

  const toggleUser = (id: string) => {
    setUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const exportPdf = () => {
    if (!view) return;
    void downloadPresencaPdf(view, {
      logoUrl,
      companyName: brandName || tenant?.name,
      primaryColor: tenant?.primaryColor,
      filtroLabel,
    }).catch((err) =>
      toast.error(
        err instanceof Error ? err.message : "Não foi possível gerar o PDF.",
      ),
    );
  };

  const totalFaltas = (view?.comparativoUsuarios ?? []).reduce(
    (s, c) => s + c.atual.faltas,
    0,
  );
  const totalFaltasAnt = (view?.comparativoUsuarios ?? []).reduce(
    (s, c) => s + c.anterior.faltas,
    0,
  );
  const totalJust = (view?.comparativoUsuarios ?? []).reduce(
    (s, c) => s + c.atual.justificadas,
    0,
  );
  const totalJustAnt = (view?.comparativoUsuarios ?? []).reduce(
    (s, c) => s + c.anterior.justificadas,
    0,
  );

  if (!canView) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Você não tem acesso a Presença.
      </div>
    );
  }

  if (offline) return <SemConexao onRetry={() => void load()} />;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="Presença"
        description="Filtre pessoas e tipos de presença, gere o relatório e compare com o mês anterior."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[160px] text-center font-medium">
          {MESES[mes - 1]} {ano}
        </div>
        <Button variant="outline" size="icon" onClick={() => shift(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className={cn(
                "min-w-[180px] justify-between font-medium",
                userIds.length > 0 && "border-primary/40 bg-primary/5",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <UserRound className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  {userIds.length === 0
                    ? "Todas as pessoas"
                    : userIds.length === 1
                      ? (data?.usuarios.find((u) => u.userId === userIds[0])
                          ?.nome ?? "1 pessoa")
                      : `${userIds.length} pessoas`}
                </span>
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Pesquisar pessoa…" />
              <CommandList className="max-h-72">
                <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="todas as pessoas"
                    onSelect={() => setUserIds([])}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        userIds.length === 0 ? "opacity-100" : "opacity-0",
                      )}
                    />
                    Todas as pessoas
                  </CommandItem>
                  {(data?.usuarios ?? []).map((u) => (
                    <CommandItem
                      key={u.userId}
                      value={`${u.nome} ${u.userId}`}
                      onSelect={() => toggleUser(u.userId)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          userIds.includes(u.userId)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 truncate">{u.nome}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {u.equipe ?? u.role}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          onClick={exportPdf}
          disabled={!view}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Gerar relatório
        </Button>
        {data?.podeTipos ? (
          <Button variant="outline" onClick={() => setTiposOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Tipos
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
        {PRESENCA_FILTRO_NATUREZA.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant={naturezaFiltro === opt.id ? "default" : "outline"}
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => setNaturezaFiltro(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
        {userIds.length > 0 || naturezaFiltro !== "todos" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => {
              setUserIds([]);
              setNaturezaFiltro("todos");
            }}
          >
            <X className="mr-1 h-3 w-3" />
            Limpar filtros
          </Button>
        ) : null}
      </div>
      {userIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {userIds.map((id) => {
            const u = data?.usuarios.find((x) => x.userId === id);
            if (!u) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer gap-1 font-normal"
                onClick={() => toggleUser(id)}
              >
                {u.nome}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : view ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceKpiCard
              label="Média de pessoas presentes / dia"
              value={view.resumo.mediaVieram}
              format="number"
              icon={Users}
              tone="emerald"
              evolucaoPct={pctChange(
                view.resumo.mediaVieram,
                view.resumoAnterior.mediaVieram,
              )}
              valorMesAnterior={view.resumoAnterior.mediaVieram}
              detail={`${filtroLabel} · vs ${MESES[view.resumoAnterior.mes - 1]}`}
            />
            <FinanceKpiCard
              label="Média equivalente (dias)"
              value={view.resumo.mediaEquivalente}
              format="number"
              icon={ClipboardCheck}
              tone="blue"
              evolucaoPct={pctChange(
                view.resumo.mediaEquivalente,
                view.resumoAnterior.mediaEquivalente,
              )}
              valorMesAnterior={view.resumoAnterior.mediaEquivalente}
              detail="Presença = 1 · meio período = 0,5"
            />
            <FinanceKpiCard
              label="Faltas no recorte"
              value={totalFaltas}
              format="number"
              icon={CalendarOff}
              tone="rose"
              invertEvolucao
              evolucaoPct={pctChange(totalFaltas, totalFaltasAnt)}
              valorMesAnterior={totalFaltasAnt}
              detail={`vs ${MESES[view.resumoAnterior.mes - 1]} ${view.resumoAnterior.ano}`}
            />
            <FinanceKpiCard
              label="Faltas justificadas"
              value={totalJust}
              format="number"
              icon={ClipboardCheck}
              tone="orange"
              invertEvolucao
              evolucaoPct={pctChange(totalJust, totalJustAnt)}
              valorMesAnterior={totalJustAnt}
              detail={`vs ${MESES[view.resumoAnterior.mes - 1]} ${view.resumoAnterior.ano}`}
            />
          </div>

          <Card className="overflow-auto p-0">
            <table className="min-w-max text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2 text-left min-w-[180px]">
                    Pessoa
                  </th>
                  {view.dias.map((d) => (
                    <th key={d} className="px-1 py-2 text-center w-9">
                      <div className="text-[10px] text-muted-foreground">
                        {weekday(d)}
                      </div>
                      <div>{Number(d.slice(8))}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.usuarios.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-8 text-center text-muted-foreground"
                      colSpan={view.dias.length + 1}
                    >
                      Nenhuma pessoa neste recorte. Ajuste os filtros.
                    </td>
                  </tr>
                ) : (
                  view.usuarios.map((u) => (
                    <tr key={u.userId} className="border-b">
                      <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
                        <div className="font-medium">{u.nome}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {u.equipe ?? u.role}
                        </div>
                      </td>
                      {view.dias.map((d) => {
                        const cell = u.dias[d];
                        const busy = saving === `${u.userId}|${d}`;
                        return (
                          <td key={d} className="p-0.5">
                            <PresencaDiaBotao
                              cell={cell}
                              tipos={tiposParaRole(view.tipos, u.role)}
                              podeEditar={view.podeEditar}
                              busy={busy}
                              onPick={(tipoId) =>
                                void onPickTipo(u.userId, d, tipoId)
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-auto p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <div className="text-sm font-medium">
                  Comparativo com {MESES[view.resumoAnterior.mes - 1]}{" "}
                  {view.resumoAnterior.ano}
                </div>
                <p className="text-xs text-muted-foreground">
                  {filtroLabel}. Os totais usam o mesmo grupo de pessoas nos dois
                  meses.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={exportPdf}>
                <FileDown className="mr-2 h-4 w-4" />
                Relatório PDF
              </Button>
            </div>
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="px-3 py-2 text-left">Pessoa</th>
                  <th className="px-2 py-2 text-right">Vieram</th>
                  <th className="px-2 py-2 text-right">Mês ant.</th>
                  <th className="px-2 py-2 text-right">Δ</th>
                  <th className="px-2 py-2 text-right">Equiv.</th>
                  <th className="px-2 py-2 text-right">Mês ant.</th>
                  <th className="px-2 py-2 text-right">Δ</th>
                  <th className="px-2 py-2 text-right">Faltas</th>
                  <th className="px-2 py-2 text-right">Mês ant.</th>
                  <th className="px-2 py-2 text-right">Δ</th>
                  <th className="px-2 py-2 text-right">Just.</th>
                  <th className="px-2 py-2 text-right">Mês ant.</th>
                </tr>
              </thead>
              <tbody>
                {view.comparativoUsuarios.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      Sem dados para comparar neste recorte.
                    </td>
                  </tr>
                ) : (
                  view.comparativoUsuarios.map((c) => {
                    const dPres = c.atual.presentes - c.anterior.presentes;
                    const dEq = c.atual.equivalente - c.anterior.equivalente;
                    const dFalta = c.atual.faltas - c.anterior.faltas;
                    return (
                      <tr key={c.userId} className="border-b">
                        <td className="px-3 py-2">
                          <div className="font-medium">{c.nome}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.equipe ?? c.role}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {c.atual.presentes}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {c.anterior.presentes}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-medium",
                            deltaClass(dPres),
                          )}
                        >
                          {signedDelta(dPres)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {c.atual.equivalente}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {c.anterior.equivalente}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-medium",
                            deltaClass(dEq),
                          )}
                        >
                          {signedDelta(dEq)}
                        </td>
                        <td className="px-2 py-2 text-right">{c.atual.faltas}</td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {c.anterior.faltas}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-medium",
                            deltaClass(dFalta, true),
                          )}
                        >
                          {signedDelta(dFalta)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {c.atual.justificadas}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {c.anterior.justificadas}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <div className="mb-2 text-sm font-medium">Pessoas que vieram (por dia)</div>
            <div className="flex flex-wrap gap-1">
              {view.resumo.porDia.map((d) => (
                <div
                  key={d.data}
                  className="rounded border px-2 py-1 text-center text-[11px]"
                >
                  <div className="text-muted-foreground">{Number(d.data.slice(8))}</div>
                  <div className="font-semibold">{d.vieram}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Recorte: {filtroLabel}. Comparação com{" "}
              {MESES[view.resumoAnterior.mes - 1]} {view.resumoAnterior.ano}:
              média {view.resumoAnterior.mediaVieram} presentes/dia.
              {view.podeEditar
                ? " Clique na célula e escolha o tipo. Use Limpar para apagar o lançamento."
                : ""}
            </p>
          </Card>
        </>
      ) : null}

      <TiposDialog
        open={tiposOpen}
        onOpenChange={setTiposOpen}
        tipos={data?.tipos ?? []}
        onSaved={() => void load()}
      />
    </div>
  );
}

function PresencaDiaBotao({
  cell,
  tipos,
  podeEditar,
  busy,
  onPick,
}: {
  cell: PresencaCelula | null | undefined;
  tipos: PresencaTipo[];
  podeEditar: boolean;
  busy: boolean;
  onPick: (tipoId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const marca = (
    <button
      type="button"
      disabled={!podeEditar || busy}
      title={
        podeEditar
          ? "Clique para escolher o tipo"
          : cell?.nome ?? "Sem lançamento"
      }
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded text-[10px] font-semibold",
        podeEditar && "hover:ring-2 hover:ring-primary/40",
        !cell && "bg-muted/40 text-muted-foreground",
      )}
      style={
        cell ? { backgroundColor: `${cell.cor}22`, color: cell.cor } : undefined
      }
    >
      {busy ? "…" : cell?.sigla ?? "·"}
    </button>
  );

  if (!podeEditar) return marca;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{marca}</PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="center" side="bottom">
        {tipos.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Nenhum tipo para esta função.
          </p>
        ) : (
          tipos.map((tipo) => (
            <button
              key={tipo.id}
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                onPick(tipo.id);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted",
                cell?.tipoId === tipo.id && "bg-muted",
              )}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold"
                style={{ backgroundColor: `${tipo.cor}22`, color: tipo.cor }}
              >
                {tipo.sigla}
              </span>
              <span className="min-w-0 truncate">{tipo.nome}</span>
            </button>
          ))
        )}
        <button
          type="button"
          disabled={busy || !cell}
          onClick={() => {
            setOpen(false);
            onPick(null);
          }}
          className="mt-0.5 w-full rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          Limpar
        </button>
      </PopoverContent>
    </Popover>
  );
}

function TiposDialog({
  open,
  onOpenChange,
  tipos,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipos: PresencaTipo[];
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [natureza, setNatureza] = useState<PresencaNatureza>("presente");
  const [cor, setCor] = useState("#059669");
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!nome.trim() || !sigla.trim()) {
      toast.error("Informe nome e sigla.");
      return;
    }
    setSaving(true);
    try {
      await createPresencaTipo({
        nome: nome.trim(),
        sigla: sigla.trim(),
        natureza,
        cor,
        roles,
      });
      setNome("");
      setSigla("");
      setRoles([]);
      toast.success("Tipo criado. Vale para as funções marcadas (vazio = todas).");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tipos de presença e falta</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          O administrador define os tipos para todas as funções do tenant. Deixe as
          funções em branco para aplicar a todos.
        </p>
        <div className="space-y-3">
          {tipos.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded border px-3 py-2"
            >
              <div>
                <span className="font-medium" style={{ color: t.cor }}>
                  {t.sigla}
                </span>{" "}
                {t.nome}{" "}
                <span className="text-xs text-muted-foreground">
                  ({NATUREZAS.find((n) => n.id === t.natureza)?.label}
                  {t.roles.length ? ` · ${t.roles.join(", ")}` : " · todas as funções"})
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void updatePresencaTipo(t.id, { ativo: !t.ativo }).then(onSaved)
                  }
                >
                  {t.ativo ? "Desativar" : "Ativar"}
                </Button>
                {!t.padrao ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void deletePresencaTipo(t.id)
                        .then(onSaved)
                        .catch((e) =>
                          toast.error(e instanceof Error ? e.message : "Erro"),
                        )
                    }
                  >
                    Excluir
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-2 border-t pt-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4" /> Novo tipo
          </div>
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input
            placeholder="Sigla (ex.: P)"
            value={sigla}
            maxLength={8}
            onChange={(e) => setSigla(e.target.value)}
          />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={natureza}
            onChange={(e) => setNatureza(e.target.value as PresencaNatureza)}
          >
            {NATUREZAS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
          <Label className="text-xs">Cor</Label>
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTS.map((r) => (
              <label key={r.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={roles.includes(r.id)}
                  onChange={(e) =>
                    setRoles((prev) =>
                      e.target.checked
                        ? [...prev, r.id]
                        : prev.filter((x) => x !== r.id),
                    )
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Salvando…" : "Adicionar tipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

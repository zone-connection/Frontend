import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FileDown,
  Filter,
  Info,
  Loader2,
  Plus,
  Settings2,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
  avatarTone,
  labelPresencaFiltros,
  monthRangeLabel,
  PRESENCA_FILTRO_NATUREZA,
  PRESENCA_ROLE_LABEL,
  presencaInitials,
  weekdayLabel,
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
  return weekdayLabel(iso);
}

function tiposParaRole(tipos: PresencaTipo[], role: string) {
  return tipos.filter(
    (t) => t.ativo && (t.roles.length === 0 || t.roles.includes(role)),
  );
}

function fmt2(n: number) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

  if (!canView) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Você não tem acesso a Presença.
      </div>
    );
  }

  if (offline) return <SemConexao onRetry={() => void load()} />;

  return (
    <div className="-m-3 flex flex-col gap-5 bg-sky-50/80 p-4 sm:-m-4 md:-m-6 md:p-6 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Relatório de frequência
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {MESES[mes - 1]} {ano}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe a frequência da sua equipe de forma prática e organizada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl bg-white" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Período analisado
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {view ? monthRangeLabel(view.dias) : "—"}
              </div>
            </div>
          </div>
          <Button variant="outline" size="icon" className="rounded-xl bg-white" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="rounded-xl bg-white"
            onClick={exportPdf}
            disabled={!view}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Gerar relatório
          </Button>
          {data?.podeTipos ? (
            <Button variant="outline" className="rounded-xl bg-white" onClick={() => setTiposOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Tipos
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className={cn(
                "min-w-[180px] justify-between rounded-xl bg-white font-medium",
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
        <Filter className="ml-1 h-3.5 w-3.5 text-slate-400" />
        {PRESENCA_FILTRO_NATUREZA.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant={naturezaFiltro === opt.id ? "default" : "outline"}
            className="h-8 rounded-full bg-white px-3 text-xs"
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
            className="h-8 px-2 text-xs text-muted-foreground"
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
          <Card className="overflow-hidden rounded-3xl border-0 bg-white p-0 shadow-[0_10px_40px_rgba(15,40,90,0.06)]">
            <div className="overflow-auto">
              <table className="min-w-max text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-[11px] font-semibold text-slate-400 min-w-[220px]">
                      Colaborador
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-400 min-w-[88px]">
                      Função
                    </th>
                    {view.dias.map((d) => (
                      <th key={d} className="px-1 py-3 text-center w-8">
                        <div className="text-[9px] font-medium text-slate-400">
                          {weekday(d)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          {String(Number(d.slice(8))).padStart(2, "0")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.usuarios.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-400"
                        colSpan={view.dias.length + 2}
                      >
                        Nenhuma pessoa neste recorte. Ajuste os filtros.
                      </td>
                    </tr>
                  ) : (
                    view.usuarios.map((u) => (
                      <tr key={u.userId} className="border-t border-slate-100">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: avatarTone(u.userId) }}
                            >
                              {presencaInitials(u.nome) || "?"}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-800">
                                {u.nome}
                              </div>
                              {u.equipe ? (
                                <div className="truncate text-[10px] text-primary">
                                  {u.equipe}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">
                          {PRESENCA_ROLE_LABEL[u.role] ?? u.role}
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
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                {(view.tipos.filter((t) => t.ativo).length
                  ? view.tipos.filter((t) => t.ativo)
                  : []
                ).map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1.5">
                    {t.natureza === "presente" ? (
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: t.cor }}
                      />
                    ) : (
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: t.cor }}
                      >
                        {t.sigla}
                      </span>
                    )}
                    {t.nome}
                  </span>
                ))}
              </div>
              <div className="text-[11px] text-slate-400">
                Média de presentes/dia:{" "}
                <span className="font-semibold text-slate-600">
                  {fmt2(view.resumo.mediaVieram)}
                </span>
                {"  ·  "}
                Equivalente:{" "}
                <span className="font-semibold text-slate-600">
                  {fmt2(view.resumo.mediaEquivalente)}
                </span>
                {"  ·  "}
                vs mês ant.:{" "}
                <span className="font-semibold text-slate-600">
                  {fmt2(view.resumoAnterior.mediaVieram)}
                </span>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportKpi
              icon={Users}
              label="Média de presentes/dia"
              value={fmt2(view.resumo.mediaVieram)}
              delta={view.resumo.mediaVieram - view.resumoAnterior.mediaVieram}
              tone="emerald"
            />
            <ReportKpi
              icon={CalendarDays}
              label="Equivalente (dias)"
              value={fmt2(view.resumo.mediaEquivalente)}
              delta={
                view.resumo.mediaEquivalente - view.resumoAnterior.mediaEquivalente
              }
              tone="blue"
            />
            <ReportKpi
              icon={CalendarOff}
              label="Mês anterior"
              value={fmt2(view.resumoAnterior.mediaVieram)}
              hint="média de presentes no recorte"
              tone="violet"
            />
            <ReportKpi
              icon={TriangleAlert}
              label="Faltas no mês"
              value={String(totalFaltas)}
              delta={totalFaltas - totalFaltasAnt}
              invert
              tone="rose"
            />
          </div>

          <Card className="overflow-hidden rounded-3xl border-0 bg-white p-0 shadow-[0_10px_40px_rgba(15,40,90,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Comparativo com {MESES[view.resumoAnterior.mes - 1]}{" "}
                  {view.resumoAnterior.ano}
                </div>
                <p className="text-xs text-slate-400">
                  {filtroLabel}. Os totais usam o mesmo grupo de pessoas nos dois
                  meses.
                </p>
              </div>
            </div>
            <div className="overflow-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="px-4 py-2 text-left">Pessoa</th>
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
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,40,90,0.05)]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Info className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-800">Observações</div>
                <p className="text-xs text-slate-500">
                  Os dados de frequência são atualizados diariamente e podem sofrer
                  pequenas variações conforme o fechamento do ponto.
                  {view.podeEditar
                    ? " Clique na célula e escolha o tipo. Use Limpar para apagar o lançamento."
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-px w-8 bg-primary" />
              Gestão eficiente, melhores resultados.
            </div>
          </div>
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

function ReportKpi({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  invert = false,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  invert?: boolean;
  tone: "emerald" | "blue" | "violet" | "rose";
}) {
  const wash = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-500",
  }[tone];
  const iconBg = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-600",
    violet: "bg-violet-500",
    rose: "bg-rose-500",
  }[tone];
  const good =
    delta == null || Math.abs(delta) < 0.005
      ? null
      : invert
        ? delta < 0
        : delta > 0;
  return (
    <div className={cn("flex items-center gap-3 rounded-3xl px-4 py-4", wash)}>
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
          iconBg,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="text-2xl font-bold tracking-tight text-slate-800">
          {value}
        </div>
        {hint ? (
          <div className="text-[11px] text-slate-400">{hint}</div>
        ) : delta != null ? (
          <div
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-medium",
              good == null
                ? "text-slate-400"
                : good
                  ? "text-emerald-600"
                  : "text-rose-500",
            )}
          >
            {delta > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : delta < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {signedDelta(delta)} vs. mês anterior
          </div>
        ) : null}
      </div>
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
        "flex h-8 w-8 items-center justify-center rounded-full",
        podeEditar && "hover:bg-slate-50",
      )}
    >
      {busy ? (
        <span className="text-[10px] text-slate-400">…</span>
      ) : !cell ? (
        <span className="size-2 rounded-full border border-slate-200" />
      ) : cell.natureza === "presente" ? (
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: cell.cor }}
        />
      ) : (
        <span
          className="rounded-md px-1 py-0.5 text-[9px] font-bold"
          style={{ backgroundColor: `${cell.cor}22`, color: cell.cor }}
        >
          {cell.sigla}
        </span>
      )}
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

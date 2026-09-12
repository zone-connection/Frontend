import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Crosshair, Loader2, Timer, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notifyAtrasoLiberacaoNav } from "@/lib/atraso-liberacao-nav";
import { getSession } from "@/lib/auth";
import {
  fetchFunis,
  FUNIL_TIPO_LABEL,
  FUNIL_TIPOS,
  funilTipoOf,
  updateFunil,
  updateFunilEtapa,
  type Funil,
  type FunilEtapa,
  type FunilTipo,
} from "@/lib/funis-api";
import {
  PRAZO_UNIDADE_OPTIONS,
  type PrazoUnidade,
} from "@/lib/lead-monitoramento";
import { isTenantOperationEnabled } from "@/lib/tenant-modules";
import { cn } from "@/lib/utils";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function funilTipoVisivel(
  tipo: FunilTipo,
  modules: Record<string, boolean> | null | undefined,
): boolean {
  if (tipo === "comercial") {
    return isTenantOperationEnabled(modules, "comercial");
  }
  if (tipo === "captacao") {
    return isTenantOperationEnabled(modules, "captacao");
  }
  if (tipo === "venda_usados") {
    return isTenantOperationEnabled(modules, "imoveisUsados");
  }
  return true;
}

function sortEtapas(etapas: FunilEtapa[]): FunilEtapa[] {
  return [...etapas].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "pt-BR"),
  );
}

function isEtapaTerminal(etapa: FunilEtapa): boolean {
  return etapa.papel === "venda" || etapa.papel === "perdido";
}

export function ConfigAutomacoesPanel() {
  const tenantModules = getSession()?.tenant?.modules;
  const tiposVisiveis = useMemo(
    () => FUNIL_TIPOS.filter((tipo) => funilTipoVisivel(tipo, tenantModules)),
    [tenantModules],
  );
  const [tipoFiltro, setTipoFiltro] = useState<FunilTipo>(
    tiposVisiveis[0] ?? "comercial",
  );
  const [funis, setFunis] = useState<Funil[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEtapaId, setSavingEtapaId] = useState<string | null>(null);

  const [inatividadeValor, setInatividadeValor] = useState("48");
  const [inatividadeUnidade, setInatividadeUnidade] =
    useState<PrazoUnidade>("horas");
  const [atrasoAtiva, setAtrasoAtiva] = useState(false);
  const [atrasoDestino, setAtrasoDestino] = useState<
    "caca_lead" | "retrabalho"
  >("retrabalho");
  const [atrasoValor, setAtrasoValor] = useState("24");
  const [atrasoUnidade, setAtrasoUnidade] = useState<PrazoUnidade>("horas");
  const [etapaDraft, setEtapaDraft] = useState<
    Record<
      string,
      { prazo: string; unidade: PrazoUnidade; alerta: string }
    >
  >({});

  const doTipo = useMemo(
    () => funis.filter((f) => funilTipoOf(f) === tipoFiltro),
    [funis, tipoFiltro],
  );
  const selected = doTipo.find((f) => f.id === selectedId) ?? null;
  const etapas = useMemo(
    () => sortEtapas(selected?.etapas.filter((e) => e.active) ?? []),
    [selected],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchFunis();
      setFunis(list);
      setSelectedId((prev) => {
        const ofTipo = list.filter((f) => funilTipoOf(f) === tipoFiltro);
        if (prev && ofTipo.some((f) => f.id === prev)) return prev;
        return ofTipo.find((f) => f.ativo)?.id ?? ofTipo[0]?.id ?? null;
      });
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível carregar as automações."));
    } finally {
      setLoading(false);
    }
  }, [tipoFiltro]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    setInatividadeValor(String(selected.inatividadeValor ?? 48));
    setInatividadeUnidade(selected.inatividadeUnidade ?? "horas");
    setAtrasoAtiva(selected.atrasoLiberacaoAtiva === true);
    setAtrasoDestino(selected.atrasoLiberacaoDestino ?? "retrabalho");
    setAtrasoValor(String(selected.atrasoLiberacaoValor ?? 24));
    setAtrasoUnidade(selected.atrasoLiberacaoUnidade ?? "horas");
    const next: Record<
      string,
      { prazo: string; unidade: PrazoUnidade; alerta: string }
    > = {};
    for (const etapa of selected.etapas) {
      next[etapa.id] = {
        prazo: etapa.prazoValor ? String(etapa.prazoValor) : "",
        unidade: etapa.prazoUnidade ?? "horas",
        alerta: String(etapa.alertaAntecedenciaPercent ?? 20),
      };
    }
    setEtapaDraft(next);
  }, [
    selected?.id,
    selected?.inatividadeValor,
    selected?.inatividadeUnidade,
    selected?.atrasoLiberacaoAtiva,
    selected?.atrasoLiberacaoDestino,
    selected?.atrasoLiberacaoValor,
    selected?.atrasoLiberacaoUnidade,
    selected?.updatedAt,
  ]);

  function applyFunil(updated: Funil) {
    setFunis((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  async function handleSaveInatividade() {
    if (!selected) return;
    const valor = Number(inatividadeValor);
    if (!Number.isInteger(valor) || valor < 1) {
      toast.error("Informe um período de inatividade válido.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateFunil(selected.id, {
        inatividadeValor: valor,
        inatividadeUnidade,
      });
      applyFunil(updated);
      toast.success("Alerta de inatividade atualizado.");
    } catch (err) {
      toast.error(
        errorMessage(err, "Não foi possível salvar o período de inatividade."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAtrasoLiberacao() {
    if (!selected) return;
    const valor = Number(atrasoValor);
    if (!Number.isInteger(valor) || valor < 0) {
      toast.error("Informe o tempo depois do atraso.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateFunil(selected.id, {
        atrasoLiberacaoAtiva: atrasoAtiva,
        atrasoLiberacaoDestino: atrasoDestino,
        atrasoLiberacaoValor: valor,
        atrasoLiberacaoUnidade: atrasoUnidade,
      });
      applyFunil(updated);
      notifyAtrasoLiberacaoNav(updated);
      toast.success("Automação de atraso atualizada.");
    } catch (err) {
      toast.error(
        errorMessage(err, "Não foi possível salvar a automação de atraso."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEtapa(etapa: FunilEtapa) {
    if (!selected) return;
    const draft = etapaDraft[etapa.id];
    if (!draft) return;
    const prazoRaw = draft.prazo.trim();
    const prazoValor = prazoRaw === "" ? null : Number(prazoRaw);
    if (prazoRaw !== "" && (!Number.isInteger(prazoValor) || (prazoValor ?? 0) < 1)) {
      toast.error("Informe um prazo válido ou deixe em branco.");
      return;
    }
    const alertaPercent = Number(draft.alerta);
    setSavingEtapaId(etapa.id);
    try {
      const updated = await updateFunilEtapa(selected.id, etapa.id, {
        prazoValor,
        prazoUnidade: draft.unidade,
        alertaAntecedenciaPercent:
          Number.isInteger(alertaPercent) && alertaPercent >= 1
            ? alertaPercent
            : 20,
      });
      applyFunil(updated);
      toast.success(`Prazo de ${etapa.label} atualizado.`);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar o prazo."));
    } finally {
      setSavingEtapaId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando automações…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Automações</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Regras que o sistema aplica sozinho: alertas, prazos e liberação de
          leads. Integrações (Meta, Órulo, WhatsApp) continuam em Conexões.
        </p>
      </div>

      <Tabs
        value={tipoFiltro}
        onValueChange={(v) => setTipoFiltro(v as FunilTipo)}
      >
        <TabsList className="h-auto flex-wrap justify-start">
          {tiposVisiveis.map((tipo) => (
            <TabsTrigger key={tipo} value={tipo} className="text-xs">
              {FUNIL_TIPO_LABEL[tipo]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {doTipo.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {doTipo.map((funil) => (
            <button
              key={funil.id}
              type="button"
              onClick={() => setSelectedId(funil.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                funil.id === selectedId
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {funil.name}
              {funil.ativo ? " · ativo" : ""}
            </button>
          ))}
        </div>
      ) : null}

      {!selected ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum funil {FUNIL_TIPO_LABEL[tipoFiltro].toLowerCase()} para
            configurar.{" "}
            <Link
              to="/configuracoes"
              search={{ secao: "operacao", item: "funil" }}
              className="text-primary underline-offset-2 hover:underline"
            >
              Criar funil
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <CardTitle className="text-base">
                    Alerta de inatividade
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sem movimento neste período, o card fica vermelho e gera
                    aviso no funil.
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Sempre ativa</Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={1}
                aria-label="Período de inatividade"
                className="h-9 w-20"
                value={inatividadeValor}
                onChange={(e) => setInatividadeValor(e.target.value)}
              />
              <select
                aria-label="Unidade do período"
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={inatividadeUnidade}
                onChange={(e) =>
                  setInatividadeUnidade(e.target.value as PrazoUnidade)
                }
              >
                {PRAZO_UNIDADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void handleSaveInatividade()}
              >
                Salvar
              </Button>
            </CardContent>
          </Card>

          {funilTipoOf(selected) === "comercial" ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-2">
                  <Crosshair className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <CardTitle className="text-base">
                      Liberação após atraso
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Retrabalho desvincula o corretor e deixa o lead no funil
                      e em Leads, destacado. O Caça-lead continua listando os
                      atrasados para pegar, sem tirar do kanban.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={atrasoAtiva ? "default" : "secondary"}>
                    {atrasoAtiva ? "Ligada" : "Desligada"}
                  </Badge>
                  <Switch
                    checked={atrasoAtiva}
                    onCheckedChange={setAtrasoAtiva}
                    aria-label="Ativar automação após atraso"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAtrasoDestino("caca_lead")}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                      atrasoDestino === "caca_lead"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Caça-lead
                    <span className="mt-0.5 block font-normal leading-snug">
                      Não tira do funil. A tela lista quem está atrasado.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAtrasoDestino("retrabalho")}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                      atrasoDestino === "retrabalho"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Retrabalho
                    <span className="mt-0.5 block font-normal leading-snug">
                      Fica no funil e em Leads, destacado. O Caça-lead lista para pegar.
                    </span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    aria-label="Tempo depois do atraso"
                    className="h-9 w-20"
                    value={atrasoValor}
                    onChange={(e) => setAtrasoValor(e.target.value)}
                  />
                  <select
                    aria-label="Unidade do tempo após atraso"
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={atrasoUnidade}
                    onChange={(e) =>
                      setAtrasoUnidade(e.target.value as PrazoUnidade)
                    }
                  >
                    {PRAZO_UNIDADE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void handleSaveAtrasoLiberacao()}
                  >
                    Salvar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tempo contado a partir do momento em que o lead fica atrasado.
                  Zero = desvincula na hora. O interruptor só vale depois de
                  salvar.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div className="flex items-start gap-2">
                <Timer className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <CardTitle className="text-base">Prazos por etapa</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    SLA de cada coluna do funil. O alerta laranja dispara quando
                    resta este % do prazo. Etapas finais não são monitoradas.
                  </p>
                </div>
              </div>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {etapas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este funil ainda não tem etapas ativas.
                </p>
              ) : (
                etapas.map((etapa) => {
                  const draft = etapaDraft[etapa.id];
                  const terminal = isEtapaTerminal(etapa);
                  return (
                    <div
                      key={etapa.id}
                      className="flex flex-col gap-2 rounded-xl border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {etapa.label}
                        </p>
                        {terminal ? (
                          <p className="text-[11px] text-muted-foreground">
                            Etapa final — sem monitoramento.
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            Em branco = sem prazo nesta etapa.
                          </p>
                        )}
                      </div>
                      {terminal ? null : (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            placeholder="—"
                            aria-label={`Prazo de ${etapa.label}`}
                            className="h-8 w-16"
                            value={draft?.prazo ?? ""}
                            onChange={(e) =>
                              setEtapaDraft((current) => ({
                                ...current,
                                [etapa.id]: {
                                  prazo: e.target.value,
                                  unidade: draft?.unidade ?? "horas",
                                  alerta: draft?.alerta ?? "20",
                                },
                              }))
                            }
                          />
                          <select
                            aria-label={`Unidade de ${etapa.label}`}
                            className="h-8 rounded-md border bg-background px-2 text-xs"
                            value={draft?.unidade ?? "horas"}
                            onChange={(e) =>
                              setEtapaDraft((current) => ({
                                ...current,
                                [etapa.id]: {
                                  prazo: draft?.prazo ?? "",
                                  unidade: e.target.value as PrazoUnidade,
                                  alerta: draft?.alerta ?? "20",
                                },
                              }))
                            }
                          >
                            {PRAZO_UNIDADE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            min={1}
                            max={90}
                            aria-label={`Alerta % de ${etapa.label}`}
                            className="h-8 w-16"
                            value={draft?.alerta ?? "20"}
                            onChange={(e) =>
                              setEtapaDraft((current) => ({
                                ...current,
                                [etapa.id]: {
                                  prazo: draft?.prazo ?? "",
                                  unidade: draft?.unidade ?? "horas",
                                  alerta: e.target.value,
                                },
                              }))
                            }
                          />
                          <span className="text-[11px] text-muted-foreground">
                            % alerta
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={savingEtapaId === etapa.id}
                            onClick={() => void handleSaveEtapa(etapa)}
                          >
                            {savingEtapaId === etapa.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Salvar"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <p className="pt-1 text-xs text-muted-foreground">
                Nomes e ordem das etapas ficam em{" "}
                <Link
                  to="/configuracoes"
                  search={{ secao: "operacao", item: "funil" }}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Funis
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

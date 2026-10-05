import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Home,
  MapPin,
  Pencil,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { IdSearchSelect } from "@/components/id-search-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  interessesAtivos,
  interessesHistorico,
  rotuloInteresseAlvo,
  type InteresseEmpreendimentoStatus,
  type Lead,
  type LeadEmpreendimentoInteresse,
} from "@/lib/crm-types";
import { fetchCaptacaoImoveis } from "@/lib/captacao-api";
import { fetchEmpreendimentos } from "@/lib/empreendimentos-api";
import {
  addLeadInteresseApi,
  mapApiLead,
  removeLeadInteresseApi,
  updateLeadInteresseApi,
} from "@/lib/leads-api";
import { cn, userFacingError } from "@/lib/utils";

const STATUS_LABEL: Record<InteresseEmpreendimentoStatus, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  convertido: "Convertido",
  descartado: "Descartado",
};

const STATUS_TONE: Record<InteresseEmpreendimentoStatus, string> = {
  ativo: "bg-emerald-500/12 text-emerald-800 ring-emerald-500/20",
  pausado: "bg-amber-500/12 text-amber-800 ring-amber-500/20",
  convertido: "bg-sky-500/12 text-sky-800 ring-sky-500/20",
  descartado: "bg-muted text-muted-foreground ring-border",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function FormSectionShell({
  count,
  children,
}: {
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-br from-primary/8 via-card to-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-primary/10 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">
              Interesses do contato
            </h3>
            <p className="text-xs text-muted-foreground">
              Lançamentos e captação acompanhados neste lead.
            </p>
          </div>
        </div>
        {typeof count === "number" ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            {count} {count === 1 ? "ativo" : "ativos"}
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

export function EmpreendimentosInteressePanel({
  leadId,
  interesses,
  pendingIds,
  onPendingChange,
  onLeadChange,
  compact,
}: {
  leadId?: string | null;
  interesses?: LeadEmpreendimentoInteresse[];
  pendingIds?: string[];
  onPendingChange?: (ids: string[]) => void;
  onLeadChange?: (lead: Lead) => void;
  compact?: boolean;
}) {
  const [catalog, setCatalog] = useState<
    Array<{
      key: string;
      id: string;
      kind: "emp" | "cap";
      nome: string;
      cidade: string | null;
    }>
  >([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<InteresseEmpreendimentoStatus>("ativo");

  useEffect(() => {
    void Promise.all([
      fetchEmpreendimentos({ ativo: true }).catch(() => []),
      fetchCaptacaoImoveis().catch(() => []),
    ]).then(([emps, imoveis]) => {
      const empRows = emps.map((item) => ({
        key: `e:${item.id}`,
        id: item.id,
        kind: "emp" as const,
        nome: item.nome,
        cidade: item.cidade,
      }));
      const empIds = new Set(emps.map((item) => item.id));
      const capRows = imoveis
        .filter((item) => !item.empreendimentoId || !empIds.has(item.empreendimentoId))
        .map((item) => {
          const endereco = [item.logradouro, item.numero].filter(Boolean).join(", ");
          const cidade = [item.bairro, item.cidade].filter(Boolean).join(" · ") || null;
          return {
            key: `i:${item.id}`,
            id: item.id,
            kind: "cap" as const,
            nome: endereco || item.titulo || "Imóvel de captação",
            cidade,
          };
        });
      setCatalog([...empRows, ...capRows]);
    });
  }, []);

  const ativos = interessesAtivos(interesses);
  const historico = interessesHistorico(interesses);
  const taken = new Set(
    leadId
      ? ativos.flatMap((item) => {
          const keys: string[] = [];
          if (item.empreendimentoId) keys.push(`e:${item.empreendimentoId}`);
          if (item.imovelId) keys.push(`i:${item.imovelId}`);
          return keys;
        })
      : (pendingIds ?? []),
  );
  const options = useMemo(
    () =>
      catalog
        .filter((item) => !taken.has(item.key))
        .map((item) => ({
          id: item.key,
          label: `${item.kind === "cap" ? "Captação · " : ""}${
            item.cidade ? `${item.nome} · ${item.cidade}` : item.nome
          }`,
          keywords: `${item.nome} ${item.cidade ?? ""} ${item.kind === "cap" ? "captacao captação imóvel" : "empreendimento lançamento"}`,
        })),
    [catalog, taken],
  );

  async function applyLead(api: Awaited<ReturnType<typeof addLeadInteresseApi>>) {
    onLeadChange?.(mapApiLead(api));
  }

  async function addSelected() {
    if (!pick) {
      toast.error("Pesquise e selecione um empreendimento ou imóvel.");
      return;
    }
    const escolhido = catalog.find((item) => item.key === pick);
    if (!leadId) {
      if (taken.has(pick)) return;
      onPendingChange?.([...(pendingIds ?? []), pick]);
      setPick("");
      return;
    }
    setBusy(true);
    try {
      const updated = await addLeadInteresseApi(
        leadId,
        escolhido?.kind === "cap"
          ? { imovelId: escolhido.id }
          : { empreendimentoId: escolhido?.id ?? pick.replace(/^e:/, "") },
      );
      await applyLead(updated);
      setPick("");
      toast.success("Adicionado aos interesses.");
    } catch (err) {
      toast.error(userFacingError(err, "Não foi possível adicionar o interesse."));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: LeadEmpreendimentoInteresse | { id: string }) {
    if (!leadId) {
      onPendingChange?.((pendingIds ?? []).filter((id) => id !== item.id && id !== (item as { key?: string }).key));
      return;
    }
    setBusy(true);
    try {
      const updated = await removeLeadInteresseApi(leadId, item.id);
      await applyLead(updated);
      toast.success("Removido da lista ativa. O histórico foi mantido.");
    } catch (err) {
      toast.error(userFacingError(err, "Não foi possível remover o interesse."));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(item: LeadEmpreendimentoInteresse) {
    if (!leadId) return;
    setBusy(true);
    try {
      const updated = await updateLeadInteresseApi(leadId, item.id, {
        observacoes: notes,
        status,
      });
      await applyLead(updated);
      setEditingId(null);
      toast.success("Interesse atualizado.");
    } catch (err) {
      toast.error(userFacingError(err, "Não foi possível atualizar o interesse."));
    } finally {
      setBusy(false);
    }
  }

  const pendingItems = (pendingIds ?? [])
    .map((key) => catalog.find((item) => item.key === key) ?? {
      key,
      id: key,
      kind: key.startsWith("i:") ? ("cap" as const) : ("emp" as const),
      nome: key,
      cidade: null,
    });

  return (
    <FormSectionShell count={leadId ? ativos.length : pendingItems.length}>
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-primary/25 bg-background/70 p-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <IdSearchSelect
            value={pick}
            options={options}
            onChange={setPick}
            placeholder="Buscar lançamento ou captação…"
            searchPlaceholder="Nome, rua ou cidade"
            emptyLabel="Nenhum imóvel cadastrado"
            noneLabel="Selecione"
            allowNone
            disabled={busy}
          />
        </div>
        <Button
          type="button"
          className="h-10 shrink-0 rounded-lg"
          disabled={busy || !pick}
          onClick={() => void addSelected()}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {!leadId ? (
        pendingItems.length ? (
          <ul className="grid gap-2">
            {pendingItems.map((item) => (
              <li
                key={item.key}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2.5",
                  item.kind === "cap"
                    ? "border-amber-200/80"
                    : "border-primary/15",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.kind === "cap" ? "Captação" : "Lançamento"}
                    {item.cidade ? ` · ${item.cidade}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  onClick={() =>
                    onPendingChange?.(
                      (pendingIds ?? []).filter((id) => id !== item.key),
                    )
                  }
                  aria-label={`Remover ${item.nome}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Nada selecionado ainda. Busque um lançamento ou um imóvel de captação.
          </p>
        )
      ) : (
        <div className="space-y-3">
          {ativos.length ? (
            <ul className="grid gap-2.5">
              {ativos.map((item) => {
                const isCap = Boolean(item.imovel);
                const cidade = isCap
                  ? [item.imovel?.bairro, item.imovel?.cidade]
                      .filter(Boolean)
                      .join(" · ")
                  : item.empreendimento?.cidade;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "overflow-hidden rounded-xl border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                      isCap ? "border-amber-200/70" : "border-primary/12",
                    )}
                  >
                    <div
                      className={cn(
                        "h-1 w-full",
                        isCap ? "bg-amber-400" : "bg-primary",
                      )}
                    />
                    <div className="flex items-start gap-3 p-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          isCap
                            ? "bg-amber-50 text-amber-700"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {isCap ? (
                          <Home className="h-4 w-4" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {rotuloInteresseAlvo(item)}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                                  isCap
                                    ? "bg-amber-50 text-amber-800 ring-amber-200"
                                    : "bg-primary/8 text-primary ring-primary/20",
                                )}
                              >
                                {isCap ? "Captação" : "Lançamento"}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                                  STATUS_TONE[item.status],
                                )}
                              >
                                {STATUS_LABEL[item.status]}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              disabled={busy}
                              onClick={() => {
                                setEditingId(
                                  editingId === item.id ? null : item.id,
                                );
                                setNotes(item.observacoes);
                                setStatus(item.status);
                              }}
                              aria-label="Alterar informações"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={busy}
                              onClick={() => void removeItem(item)}
                              aria-label="Remover da lista ativa"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          {cidade ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {cidade}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(item.dataInteresse)}
                          </span>
                          {item.corretor?.name ? (
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3 w-3" />
                              {item.corretor.name}
                            </span>
                          ) : null}
                        </div>
                        {item.observacoes ? (
                          <p className="mt-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                            {item.observacoes}
                          </p>
                        ) : null}
                        {editingId === item.id ? (
                          <div className="mt-3 space-y-2 rounded-lg border bg-muted/20 p-2.5">
                            <Label className="text-[11px] text-muted-foreground">
                              Status
                            </Label>
                            <Select
                              value={status}
                              onValueChange={(v) =>
                                setStatus(v as InteresseEmpreendimentoStatus)
                              }
                            >
                              <SelectTrigger className="h-9 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  [
                                    "ativo",
                                    "pausado",
                                    "convertido",
                                    "descartado",
                                  ] as const
                                ).map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {STATUS_LABEL[opt]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Observações do atendimento"
                              className="min-h-[64px] bg-background text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                onClick={() => void saveEdit(item)}
                              >
                                Salvar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
              Nenhum interesse ativo. Adicione um lançamento ou um imóvel de captação.
            </p>
          )}
          {historico.length ? (
            <details className="rounded-xl border bg-muted/25 px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Histórico ({historico.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {historico.map((item) => (
                  <li
                    key={item.id}
                    className="border-l-2 border-muted-foreground/20 pl-2.5 text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {rotuloInteresseAlvo(item)}
                    </span>
                    {" · "}
                    {STATUS_LABEL[item.status]} · {formatDate(item.dataInteresse)}
                    {item.removidoEm
                      ? ` · saiu em ${formatDate(item.removidoEm)}`
                      : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}
    </FormSectionShell>
  );
}

export function EmpreendimentosInteresseChips({
  interesses,
  className,
}: {
  interesses?: LeadEmpreendimentoInteresse[];
  className?: string;
}) {
  const ativos = interessesAtivos(interesses);
  if (!ativos.length) return null;
  const shown = ativos.slice(0, 2);
  const extra = ativos.length - shown.length;
  return (
    <div className={cn("mt-1 flex flex-wrap gap-1", className)}>
      {shown.map((item) => (
        <span
          key={item.id}
          className="max-w-[140px] truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
          title={rotuloInteresseAlvo(item)}
        >
          {rotuloInteresseAlvo(item)}
        </span>
      ))}
      {extra > 0 ? (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

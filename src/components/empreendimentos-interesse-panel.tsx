import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { IdSearchSelect } from "@/components/id-search-select";
import { Badge } from "@/components/ui/badge";
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

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function FormSectionShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-background/40 p-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-3.5 w-3.5 text-primary" />
        <div>
          <h3 className="text-sm font-medium">Empreendimentos de interesse</h3>
          <p className="text-xs text-muted-foreground">
            Lançamentos e imóveis de captação. Um contato pode ter vários ao mesmo tempo.
          </p>
        </div>
      </div>
      {children}
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
    <FormSectionShell>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <IdSearchSelect
            value={pick}
            options={options}
            onChange={setPick}
            placeholder="Pesquisar empreendimento ou captação…"
            searchPlaceholder="Nome, rua ou cidade"
            emptyLabel="Nenhum imóvel cadastrado"
            noneLabel="Selecione"
            allowNone
            disabled={busy}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          disabled={busy || !pick}
          onClick={() => void addSelected()}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {!leadId ? (
        <div className="flex flex-wrap gap-1.5">
          {pendingItems.length ? (
            pendingItems.map((item) => (
              <Badge
                key={item.key}
                variant="secondary"
                className="gap-1 rounded-full py-1 pl-2.5 pr-1"
              >
                {item.kind === "cap" ? "Captação · " : ""}
                {item.nome}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-background"
                  onClick={() =>
                    onPendingChange?.(
                      (pendingIds ?? []).filter((id) => id !== item.key),
                    )
                  }
                  aria-label={`Remover ${item.nome}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum empreendimento selecionado ainda.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {ativos.length ? (
            ativos.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border bg-background px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {rotuloInteresseAlvo(item)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.imovel
                        ? "Captação"
                        : item.empreendimento?.cidade || "—"}{" "}
                      · interesse em {formatDate(item.dataInteresse)}
                      {item.corretor?.name ? ` · ${item.corretor.name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="outline" className="h-5 text-[10px]">
                      {STATUS_LABEL[item.status]}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={busy}
                      onClick={() => void removeItem(item)}
                      aria-label="Remover da lista ativa"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {item.observacoes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.observacoes}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Última interação: {formatDate(item.ultimaInteracao)}
                </p>
                {editingId === item.id ? (
                  <div className="mt-2 space-y-2 border-t pt-2">
                    <Label className="text-[11px] text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={status}
                      onValueChange={(v) =>
                        setStatus(v as InteresseEmpreendimentoStatus)
                      }
                    >
                      <SelectTrigger className="h-9">
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
                      className="min-h-[64px] text-sm"
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
                ) : (
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-primary hover:underline"
                    onClick={() => {
                      setEditingId(item.id);
                      setNotes(item.observacoes);
                      setStatus(item.status);
                    }}
                  >
                    Alterar informações
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum interesse ativo.
            </p>
          )}
          {historico.length ? (
            <details className="rounded-lg border bg-muted/30 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Histórico ({historico.length})
              </summary>
              <ul className="mt-2 space-y-1.5">
                {historico.map((item) => (
                  <li key={item.id} className="text-xs text-muted-foreground">
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

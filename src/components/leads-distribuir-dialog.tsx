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
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
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
  type FilaElegivel,
  type FilaPainel,
} from "@/lib/lead-fila-api";

const CARGO: Record<string, string> = {
  corretor: "Corretor",
  gerente: "Gerente",
  treinee: "Trainee",
};

function FilaDistribuicaoPainel() {
  const [painel, setPainel] = useState<FilaPainel | null>(null);
  const [elegiveis, setElegiveis] = useState<FilaElegivel[]>([]);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    const [next, livres] = await Promise.all([
      fetchFilaPainel(),
      fetchFilaElegiveis(),
    ]);
    setPainel(next);
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Distribuição automática</p>
          <p className="text-xs text-muted-foreground">
            {painel.ativa
              ? "Leads novos seguem a ordem. Quem recebe vai para o fim."
              : "Pausada. Novos leads não entram na fila."}
          </p>
        </div>
        <Switch
          checked={painel.ativa}
          disabled={busy}
          onCheckedChange={(ativa) => void run(() => setFilaAtiva(ativa))}
          aria-label="Ativar fila automática"
        />
      </div>
      <div className="flex gap-2">
        <select
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">Adicionar integrante</option>
          {elegiveis.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {CARGO[u.role] ?? u.role}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          disabled={!userId || busy}
          onClick={() =>
            void run(async () => {
              await addFilaMembro(userId);
              setUserId("");
            })
          }
        >
          Adicionar
        </Button>
      </div>
      <ul className="space-y-2">
        {painel.membros.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nenhum integrante na fila.</li>
        ) : (
          painel.membros.map((membro, index) => (
            <li
              key={membro.id}
              className="flex items-center gap-2 rounded-md border px-2 py-2"
            >
              <span className="w-5 text-center text-xs font-semibold text-primary">
                {membro.ordem}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {membro.nome}
                  {membro.proximo ? " · próximo" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {CARGO[membro.role] ?? membro.role}
                  {membro.ativoNaFila ? "" : " · inativo"}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                disabled={busy || index === 0}
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
                className="size-8"
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
                disabled={busy}
                onClick={() =>
                  void run(() => setFilaMembroAtivo(membro.id, !membro.ativoNaFila))
                }
              >
                {membro.ativoNaFila ? "Pausar" : "Ativar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => removeFilaMembro(membro.id))}
              >
                Tirar
              </Button>
            </li>
          ))
        )}
      </ul>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {usarSelecao
              ? `Distribuir ${selecionados.length} lead(s) selecionado(s)`
              : "Distribuir leads"}
          </DialogTitle>
          <DialogDescription>
            {usarSelecao
              ? "Só os leads marcados na lista vão para o corretor que você escolher."
              : "Envie leads do pool do admin (sem equipe e sem corretor), incluindo os de retrabalho. Por equipes: o lead vai para o pool da equipe; por corretores: já fica com um corretor."}
          </DialogDescription>
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
          <div className="space-y-4 overflow-auto flex-1 min-h-0">
            <p className="text-sm">
              Disponíveis:{" "}
              <span className="font-semibold tabular-nums">
                {resumo.disponiveis}
              </span>
            </p>

            <Tabs
              value={destino}
              onValueChange={(v) => setDestino(v as Destino)}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="equipes"
                  disabled={resumo.equipes.length === 0}
                >
                  Por equipes
                </TabsTrigger>
                <TabsTrigger
                  value="corretores"
                  disabled={resumo.corretores.length === 0}
                >
                  Por corretores
                </TabsTrigger>
                <TabsTrigger value="fila">Fila</TabsTrigger>
              </TabsList>

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
                <FilaDistribuicaoPainel />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
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

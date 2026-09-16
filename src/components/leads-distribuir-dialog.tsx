import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api";
import {
  distribuirLeadsCorretores,
  distribuirLeadsEquipes,
  fetchDistribuirResumo,
  type DistribuirResumo,
} from "@/lib/leads-api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const rem = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

type Destino = "equipes" | "corretores";

export function LeadsDistribuirDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumo, setResumo] = useState<DistribuirResumo | null>(null);
  const [destino, setDestino] = useState<Destino>("equipes");
  const [qtdEquipes, setQtdEquipes] = useState<Record<string, number>>({});
  const [qtdCorretores, setQtdCorretores] = useState<Record<string, number>>(
    {},
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDistribuirResumo();
      setResumo(data);
      const defaultDestino: Destino =
        data.equipes.length > 0 ? "equipes" : "corretores";
      setDestino(defaultDestino);

      const splitEq = splitEvenly(data.disponiveis, data.equipes.length);
      const nextEq: Record<string, number> = {};
      data.equipes.forEach((eq, i) => {
        nextEq[eq.equipeId] = splitEq[i] ?? 0;
      });
      setQtdEquipes(nextEq);

      const online = data.corretores.filter((c) => c.online);
      const destinosCr = online.length > 0 ? online : data.corretores;
      const splitCr = splitEvenly(data.disponiveis, destinosCr.length);
      const nextCr: Record<string, number> = {};
      data.corretores.forEach((c) => {
        nextCr[c.id] = 0;
      });
      destinosCr.forEach((c, i) => {
        nextCr[c.id] = splitCr[i] ?? 0;
      });
      setQtdCorretores(nextCr);
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
  }, [onOpenChange]);

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

  async function autoDividir() {
    if (!resumo) return;
    if (resumo.disponiveis <= 0) {
      toast.error("Não há leads no pool do admin para distribuir.");
      return;
    }
    if (destino === "equipes") {
      if (resumo.equipes.length === 0) {
        toast.error("Nenhuma equipe cadastrada.");
        return;
      }
      const split = splitEvenly(resumo.disponiveis, resumo.equipes.length);
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
    const split = splitEvenly(resumo.disponiveis, online.length);
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

  const podeConfirmar =
    !!resumo &&
    resumo.disponiveis > 0 &&
    (destino === "equipes"
      ? resumo.equipes.length > 0 && somaEquipes > 0
      : resumo.corretores.length > 0 && somaCorretores > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Distribuir leads</DialogTitle>
          <DialogDescription>
            Envie leads do pool do admin (sem equipe e sem corretor). Por
            equipes: o lead vai para o pool da equipe; por corretores: já fica
            com um corretor.
          </DialogDescription>
        </DialogHeader>

        {loading || !resumo ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando…
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
              <TabsList className="grid w-full grid-cols-2">
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
              </TabsList>

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
            disabled={saving || loading || !podeConfirmar}
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

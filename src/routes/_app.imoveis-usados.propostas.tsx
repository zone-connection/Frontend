import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { DemoPreviewNote } from "@/components/demo-preview-note";
import { PillTabs, StatusChip } from "@/components/operacao-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBrl } from "@/lib/captacao-api";
import {
  PROPOSTA_FILA_LABEL,
  imovelById,
  patchProposta,
  perfilById,
  useDemoOperacao,
  type PropostaFila,
} from "@/lib/demo-operacao-usados";
import { maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { toast } from "sonner";

type Fila = PropostaFila | "todas";

export const Route = createFileRoute("/_app/imoveis-usados/propostas")({
  validateSearch: (search: Record<string, unknown>): { fila?: Fila } => {
    const fila = search.fila;
    if (
      fila === "todas" ||
      fila === "aguardando_proprietario" ||
      fila === "aguardando_comprador" ||
      fila === "em_analise" ||
      fila === "aceita" ||
      fila === "recusada"
    ) {
      return { fila };
    }
    return {};
  },
  component: PropostasDemoPage,
});

const FILAS: Fila[] = [
  "aguardando_proprietario",
  "aguardando_comprador",
  "em_analise",
  "aceita",
  "recusada",
  "todas",
];

function toneFila(fila: PropostaFila) {
  if (fila === "aceita") return "emerald" as const;
  if (fila === "recusada") return "orange" as const;
  if (fila === "em_analise") return "violet" as const;
  if (fila === "aguardando_comprador") return "teal" as const;
  return "blue" as const;
}

function PropostasDemoPage() {
  const { fila } = Route.useSearch();
  const navigate = useNavigate();
  const { propostas } = useDemoOperacao();
  const aba: Fila = fila ?? "aguardando_proprietario";
  const [contraId, setContraId] = useState<string | null>(null);
  const [valor, setValor] = useState("");

  const lista = propostas.filter((item) => aba === "todas" || item.fila === aba);

  return (
    <>
      <PageHeader
        title="Caixa de propostas"
        description="O que está parado na resposta do proprietário ou do comprador."
      />
      <DemoPreviewNote />
      <PillTabs
        value={aba}
        onChange={(id) => {
          void navigate({
            to: "/imoveis-usados/propostas",
            search: { fila: id as Fila },
          });
        }}
        items={FILAS.map((id) => ({
          id,
          label:
            id === "todas"
              ? `Todas (${propostas.length})`
              : `${PROPOSTA_FILA_LABEL[id]} (${propostas.filter((item) => item.fila === id).length})`,
        }))}
      />
      <ul className="space-y-3">
        {lista.length === 0 ? (
          <li className="rounded-2xl border px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma proposta nesta fila.
          </li>
        ) : (
          lista.map((proposta) => {
            const imovel = imovelById(proposta.imovelId);
            const pessoa = perfilById(proposta.interessadoId);
            return (
              <li key={proposta.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{imovel?.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {pessoa?.nome} · {proposta.corretor}
                    </p>
                  </div>
                  <StatusChip tone={toneFila(proposta.fila)}>
                    {PROPOSTA_FILA_LABEL[proposta.fila]}
                  </StatusChip>
                </div>
                <p className="mt-2 text-sm">
                  <span className="font-semibold tabular-nums">{formatBrl(proposta.valor)}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · pedido {formatBrl(proposta.pedido)}
                    {proposta.diasParada > 0 ? ` · parada há ${proposta.diasParada} dias` : ""}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{proposta.nota}</p>
                {proposta.fila === "aguardando_proprietario" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        patchProposta(proposta.id, {
                          fila: "aceita",
                          diasParada: 0,
                          nota: "Proprietário aceitou a proposta.",
                        });
                        toast.success("Aceite do proprietário registrado.");
                      }}
                    >
                      Proprietário aceitou
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setContraId(proposta.id);
                        setValor("");
                      }}
                    >
                      Contraproposta
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        patchProposta(proposta.id, {
                          fila: "recusada",
                          diasParada: 0,
                          nota: "Proprietário recusou.",
                        });
                        toast.success("Recusa do proprietário registrada.");
                      }}
                    >
                      Recusou
                    </Button>
                  </div>
                ) : null}
                {proposta.fila === "aguardando_comprador" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        patchProposta(proposta.id, {
                          fila: "aceita",
                          diasParada: 0,
                          nota: "Comprador aceitou a contraproposta.",
                        });
                        toast.success("Aceite do comprador registrado.");
                      }}
                    >
                      Comprador aceitou
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        patchProposta(proposta.id, {
                          fila: "recusada",
                          diasParada: 0,
                          nota: "Comprador recusou a contraproposta.",
                        });
                        toast.success("Recusa do comprador registrada.");
                      }}
                    >
                      Comprador recusou
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
      <Dialog open={Boolean(contraId)} onOpenChange={(open) => !open && setContraId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contraproposta do proprietário</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Valor</Label>
            <Input
              inputMode="numeric"
              value={valor}
              onChange={(e) => setValor(maskMoneyInput(e.target.value))}
              placeholder="0,00"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const numero = parseOptionalMoneyInput(valor);
                if (!contraId || numero == null) {
                  toast.error("Informe o valor da contraproposta.");
                  return;
                }
                patchProposta(contraId, {
                  fila: "aguardando_comprador",
                  valor: numero,
                  diasParada: 0,
                  nota: `Contraproposta enviada ao comprador: ${formatBrl(numero)}.`,
                });
                setContraId(null);
                toast.success("Contraproposta enviada ao comprador.");
              }}
            >
              Enviar ao comprador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

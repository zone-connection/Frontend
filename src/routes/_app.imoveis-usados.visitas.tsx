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
import { Textarea } from "@/components/ui/textarea";
import {
  INTERESSE_LABEL,
  VISITA_STATUS_LABEL,
  imovelById,
  patchVisita,
  perfilById,
  useDemoOperacao,
  type VisitaInteresse,
  type VisitaStatus,
} from "@/lib/demo-operacao-usados";
import { toast } from "sonner";

type Periodo = "hoje" | "semana" | "realizadas";

export const Route = createFileRoute("/_app/imoveis-usados/visitas")({
  validateSearch: (search: Record<string, unknown>): { periodo?: Periodo } => {
    const periodo = search.periodo;
    if (periodo === "hoje" || periodo === "semana" || periodo === "realizadas") {
      return { periodo };
    }
    return {};
  },
  component: VisitasDemoPage,
});

const INTERESSES: VisitaInteresse[] = [
  "muito_interessado",
  "interessado",
  "pouco_interessado",
  "sem_interesse",
];

function toneVisita(status: VisitaStatus) {
  if (status === "confirmada" || status === "realizada") return "emerald" as const;
  if (status === "nao_compareceu" || status === "cancelada") return "orange" as const;
  if (status === "agendada") return "teal" as const;
  return "muted" as const;
}

function VisitasDemoPage() {
  const { periodo } = Route.useSearch();
  const navigate = useNavigate();
  const { visitas } = useDemoOperacao();
  const aba: Periodo = periodo ?? "hoje";
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [interesse, setInteresse] = useState<VisitaInteresse>("interessado");
  const [texto, setTexto] = useState("");

  const abertas = visitas.filter(
    (item) => item.status === "agendada" || item.status === "confirmada",
  );
  const lista = visitas.filter((item) => {
    if (aba === "realizadas") return item.status === "realizada";
    if (aba === "hoje") return item.quando === "hoje" && item.status !== "realizada";
    return (
      (item.quando === "hoje" || item.quando === "semana") &&
      item.status !== "realizada"
    );
  });

  return (
    <>
      <PageHeader
        title="Agenda de visitas"
        description="Hoje e esta semana, com confirmação e retorno da visita."
      />
      <DemoPreviewNote />
      <PillTabs
        value={aba}
        onChange={(id) => {
          void navigate({
            to: "/imoveis-usados/visitas",
            search: { periodo: id as Periodo },
          });
        }}
        items={[
          { id: "hoje", label: `Hoje (${abertas.filter((item) => item.quando === "hoje").length})` },
          { id: "semana", label: `Esta semana (${abertas.length})` },
          {
            id: "realizadas",
            label: `Realizadas (${visitas.filter((item) => item.status === "realizada").length})`,
          },
        ]}
      />
      <ul className="space-y-3">
        {lista.length === 0 ? (
          <li className="rounded-2xl border px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma visita neste recorte.
          </li>
        ) : (
          lista.map((visita) => {
            const imovel = imovelById(visita.imovelId);
            const pessoa = perfilById(visita.interessadoId);
            return (
              <li key={visita.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {visita.diaLabel} · {visita.hora}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{imovel?.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {pessoa?.nome} · {visita.corretor}
                      {imovel ? ` · ${imovel.bairro}` : ""}
                    </p>
                  </div>
                  <StatusChip tone={toneVisita(visita.status)}>
                    {VISITA_STATUS_LABEL[visita.status]}
                  </StatusChip>
                </div>
                {visita.interesse ? (
                  <p className="mt-2 text-sm">
                    {INTERESSE_LABEL[visita.interesse]}
                    {visita.feedback ? ` — ${visita.feedback}` : ""}
                  </p>
                ) : null}
                {visita.status === "agendada" || visita.status === "confirmada" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visita.status === "agendada" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          patchVisita(visita.id, { status: "confirmada" });
                          toast.success("Visita confirmada.");
                        }}
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFeedbackId(visita.id);
                        setInteresse("interessado");
                        setTexto("");
                      }}
                    >
                      Marcar realizada
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        patchVisita(visita.id, { status: "nao_compareceu" });
                        toast.success("Registrado como não compareceu.");
                      }}
                    >
                      Não compareceu
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        patchVisita(visita.id, { status: "cancelada" });
                        toast.success("Visita cancelada.");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
      <Dialog open={Boolean(feedbackId)} onOpenChange={(open) => !open && setFeedbackId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retorno da visita</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              {INTERESSES.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={interesse === item ? "default" : "outline"}
                  onClick={() => setInteresse(item)}
                >
                  {INTERESSE_LABEL[item]}
                </Button>
              ))}
            </div>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que o interessado comentou"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!feedbackId) return;
                patchVisita(feedbackId, {
                  status: "realizada",
                  interesse,
                  feedback: texto.trim() || "Visita realizada.",
                });
                setFeedbackId(null);
                toast.success("Visita registrada com o retorno.");
              }}
            >
              Salvar retorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

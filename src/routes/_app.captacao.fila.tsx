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
import { formatBrl } from "@/lib/captacao-api";
import {
  patchExclusividade,
  patchParada,
  patchPortal,
  useDemoOperacao,
} from "@/lib/demo-operacao-usados";
import { toast } from "sonner";

type Aba = "paradas" | "portal" | "exclusividade";

export const Route = createFileRoute("/_app/captacao/fila")({
  validateSearch: (search: Record<string, unknown>): { aba?: Aba } => {
    const aba = search.aba;
    if (aba === "paradas" || aba === "portal" || aba === "exclusividade") {
      return { aba };
    }
    return {};
  },
  component: FilaCaptacaoPage,
});

function FilaCaptacaoPage() {
  const { aba: abaSearch } = Route.useSearch();
  const navigate = useNavigate();
  const { paradas, portal, exclusividades } = useDemoOperacao();
  const aba: Aba = abaSearch ?? "paradas";
  const [contatoId, setContatoId] = useState<string | null>(null);
  const [nota, setNota] = useState("");

  const paradasAbertas = paradas.filter((item) => item.diasSemMovimento >= 7);
  const portalAberto = portal.filter((item) => item.desfecho === "aberto");
  const exclusividadePerto = exclusividades.filter((item) => item.venceEmDias <= 30);

  return (
    <>
      <PageHeader
        title="Acompanhamento"
        description="Captações paradas, o que chegou pelo portal e exclusividade perto de vencer."
      />
      <DemoPreviewNote />
      <PillTabs
        value={aba}
        onChange={(id) => {
          void navigate({
            to: "/captacao/fila",
            search: { aba: id as Aba },
          });
        }}
        items={[
          { id: "paradas", label: `Paradas (${paradasAbertas.length})` },
          { id: "portal", label: `Portal (${portalAberto.length})` },
          { id: "exclusividade", label: `Exclusividade (${exclusividadePerto.length})` },
        ]}
      />
      {aba === "paradas" ? (
        <ul className="space-y-3">
          {paradasAbertas.length === 0 ? (
            <Vazio text="Nenhuma captação parada. As que receberam contato saíram da fila." />
          ) : (
            paradasAbertas.map((item) => (
              <li key={item.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{item.imovel}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.proprietario} · {item.responsavel}
                    </p>
                  </div>
                  <StatusChip tone="orange">{item.diasSemMovimento} dias parada</StatusChip>
                </div>
                <p className="mt-2 text-sm">
                  Etapa {item.etapa} · pretendido {formatBrl(item.pretendido)} · avaliação{" "}
                  {formatBrl(item.avaliacao)}
                </p>
                <p className="text-xs text-muted-foreground">Último contato: {item.ultimoContato}</p>
                {item.pretendido > item.avaliacao * 1.08 ? (
                  <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                    Pretendido acima da avaliação.
                  </p>
                ) : null}
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setContatoId(item.id);
                    setNota("");
                  }}
                >
                  Registrar contato
                </Button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {aba === "portal" ? (
        <ul className="space-y-3">
          {portal.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.imovel}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.proprietario} · {item.quando}
                  </p>
                </div>
                <StatusChip tone={item.tipo === "sugerido" ? "teal" : "orange"}>
                  {item.desfecho === "negociacao"
                    ? "Em negociação"
                    : item.desfecho === "perda"
                      ? "Perda registrada"
                      : item.tipo === "sugerido"
                        ? "Sugerido pelo dono"
                        : "Cancelado pelo dono"}
                </StatusChip>
              </div>
              <p className="mt-2 text-sm">{item.detalhe}</p>
              {item.desfecho === "aberto" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      patchPortal(item.id, { desfecho: "negociacao" });
                      toast.success("Captação assumida para negociação.");
                    }}
                  >
                    Assumir negociação
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      patchPortal(item.id, { desfecho: "perda" });
                      toast.success("Perda registrada.");
                    }}
                  >
                    Registrar perda
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {aba === "exclusividade" ? (
        <ul className="space-y-3">
          {exclusividades.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.imovel}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.proprietario} · {item.responsavel}
                  </p>
                </div>
                <StatusChip tone={item.venceEmDias <= 30 ? "orange" : "muted"}>
                  {item.venceEmDias <= 30
                    ? `Vence em ${item.venceEmDias} dias`
                    : `${item.venceEmDias} dias`}
                </StatusChip>
              </div>
              <p className="mt-2 text-sm tabular-nums">{formatBrl(item.valor)}</p>
              {item.venceEmDias <= 30 ? (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    patchExclusividade(item.id, { venceEmDias: 90 });
                    toast.success("Exclusividade renovada por 90 dias.");
                  }}
                >
                  Renovar 90 dias
                </Button>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Dentro do prazo.</p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <Dialog open={Boolean(contatoId)} onOpenChange={(open) => !open && setContatoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contato com o proprietário</DialogTitle>
          </DialogHeader>
          <Textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="O que foi combinado"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!contatoId) return;
                const texto = nota.trim();
                patchParada(contatoId, {
                  diasSemMovimento: 0,
                  ultimoContato: texto ? `agora — ${texto}` : "agora",
                });
                setContatoId(null);
                toast.success("Contato registrado. A captação saiu da fila de paradas.");
              }}
            >
              Salvar contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Vazio({ text }: { text: string }) {
  return (
    <li className="rounded-2xl border px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </li>
  );
}

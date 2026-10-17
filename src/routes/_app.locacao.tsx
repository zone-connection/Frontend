import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Phone, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import {
  FichaDado,
  OPERACAO_FICHA_DIALOG,
  OperacaoFichaView,
} from "@/components/operacao-ficha-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LOCACOES_MOCK, type LocacaoMock } from "@/lib/modulos-mock";
import { phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/locacao")({
  head: () => ({ meta: [{ title: "Locação — Zone Connection" }] }),
  component: LocacaoVisaoGeralPage,
});

const ETAPAS = [
  { id: "novo", label: "Novo interessado" },
  { id: "visita", label: "Visita realizada" },
  { id: "proposta", label: "Proposta" },
  { id: "contrato", label: "Contrato" },
  { id: "assinado", label: "Assinado" },
];

function LocacaoVisaoGeralPage() {
  const [atual, setAtual] = useState<LocacaoMock | null>(null);
  const digits = phoneDigits(atual?.telefone ?? "");

  return (
    <>
      <PageHeader
        title="Locação"
        description="Carteira de exemplo. Os registros reais entram quando o módulo de aluguel for ligado."
      />
      <div className="overflow-hidden rounded-2xl border border-[#E2E8EC] bg-white shadow-sm dark:border-white/10 dark:bg-[#141a22]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interessado</TableHead>
              <TableHead>Imóvel</TableHead>
              <TableHead>Aluguel</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Corretor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LOCACOES_MOCK.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setAtual(row)}>
                <TableCell>
                  <div className="font-medium">{row.nome}</div>
                  <div className="text-xs text-muted-foreground">{row.telefone}</div>
                </TableCell>
                <TableCell>{row.imovel}</TableCell>
                <TableCell>{row.aluguel}</TableCell>
                <TableCell>{row.etapa}</TableCell>
                <TableCell>{row.corretor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!atual} onOpenChange={(open) => !open && setAtual(null)}>
        <DialogContent
          overlayClassName="!top-14 !bottom-0 !left-0 !right-0 md:!left-[var(--app-sidebar,15rem)] bg-background"
          className={cn(OPERACAO_FICHA_DIALOG)}
        >
          {atual ? (
            <>
              <DialogTitle className="sr-only">{atual.nome}</DialogTitle>
              <DialogDescription className="sr-only">Detalhes de {atual.nome}</DialogDescription>
              <OperacaoFichaView
                name={atual.nome}
                kind="Locação"
                chips={[atual.etapa, atual.bairro]}
                corretor={atual.corretor}
                createdAt="2026-10-02T12:00:00.000Z"
                onBack={() => setAtual(null)}
                temTelefone={digits.length >= 10}
                onCall={() => {
                  window.location.href = `tel:+55${digits}`;
                }}
                onWhatsApp={() => {
                  window.open(`https://wa.me/55${digits}`, "_blank", "noopener,noreferrer");
                }}
                funnelName="Funil de locação"
                stages={ETAPAS}
                currentStageId={
                  atual.etapa === "Proposta"
                    ? "proposta"
                    : atual.etapa === "Contrato"
                      ? "contrato"
                      : "visita"
                }
                facts={[
                  { icon: Phone, label: "Telefone", value: atual.telefone },
                  { icon: Mail, label: "E-mail", value: atual.email },
                  { icon: Wallet, label: "Aluguel", value: atual.aluguel },
                  { icon: MapPin, label: "Bairro", value: atual.bairro },
                ]}
                tabs={["Dados", "Imóvel"]}
              >
                {() => (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FichaDado label="Interessado" value={atual.nome} />
                    <FichaDado label="Telefone" value={atual.telefone} />
                    <FichaDado label="E-mail" value={atual.email} />
                    <FichaDado label="Imóvel" value={atual.imovel} />
                    <FichaDado label="Aluguel" value={atual.aluguel} />
                    <FichaDado label="Etapa" value={atual.etapa} />
                  </div>
                )}
              </OperacaoFichaView>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

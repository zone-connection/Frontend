import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalPageTitle } from "@/components/portal-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
import { ApiError } from "@/lib/api";
import { formatBrl } from "@/lib/captacao-api";
import {
  aceitarPortalProposta,
  fetchPortalPropostasCarteira,
  visualizarPortalProposta,
  type PortalProposta,
} from "@/lib/portal-api";
import { PROPOSTA_STATUS_LABEL, type PropostaStatus } from "@/lib/propostas-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/propostas")({
  ssr: false,
  component: PortalPropostasPage,
});

type Item = PortalProposta & {
  imovel: { id: string; identificacao: string };
};

function rotuloStatus(status: string) {
  if (status in PROPOSTA_STATUS_LABEL) {
    return PROPOSTA_STATUS_LABEL[status as PropostaStatus];
  }
  return status.replaceAll("_", " ");
}

function PortalPropostasPage() {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof fetchPortalPropostasCarteira>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<Item | null>(null);
  const [aceitando, setAceitando] = useState(false);

  useEffect(() => {
    void fetchPortalPropostasCarteira()
      .then(setRows)
      .catch((err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível carregar.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const itens = rows.flatMap((row) =>
    row.propostas.map((proposta) => ({ ...proposta, imovel: row.imovel })),
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageTitle
        title="Propostas"
        subtitle="Propostas vinculadas aos seus imóveis. Você vê só o que é seu."
      />
      {itens.length === 0 ? (
        <PortalEmpty>
          Ainda não há propostas vinculadas aos seus imóveis.
        </PortalEmpty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
          <Table className="[&_th]:px-4 [&_td]:px-4 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500">
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Proposta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow
                  key={`${item.imovel.id}-${item.id}`}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => {
                    setAberta(item);
                    if (item.origem === "crm") {
                      void visualizarPortalProposta(item.id).catch(() => {});
                    }
                  }}
                >
                  <TableCell>
                    <Link
                      to="/portal/imoveis/$id"
                      params={{ id: item.imovel.id }}
                      className="text-sm font-medium text-[#12343d] hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {item.imovel.identificacao}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {item.origem === "crm" ? item.numero : `#${item.numero}`}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {formatBrl(item.valor)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                      {rotuloStatus(item.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(aberta)} onOpenChange={(open) => !open && setAberta(null)}>
        <DialogContent className="max-w-lg">
          {aberta && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {aberta.origem === "crm" ? aberta.numero : `Proposta #${aberta.numero}`}
                </DialogTitle>
                <DialogDescription>
                  {aberta.imovel.identificacao}
                  {aberta.empreendimentoNome ? ` · ${aberta.empreendimentoNome}` : ""}
                  {aberta.unidade ? ` · Un. ${aberta.unidade}` : ""}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Interessado</dt>
                  <dd className="font-medium">{aberta.interessadoNome}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="font-medium">{rotuloStatus(aberta.status)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Valor</dt>
                  <dd className="font-semibold tabular-nums">{formatBrl(aberta.valor)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Vinculada em</dt>
                  <dd>{new Date(aberta.data).toLocaleString("pt-BR")}</dd>
                </div>
                {aberta.interessadoTelefone ? (
                  <div>
                    <dt className="text-xs text-slate-500">Telefone</dt>
                    <dd className="font-medium">{aberta.interessadoTelefone}</dd>
                  </div>
                ) : null}
                {aberta.aceitaEm ? (
                  <div>
                    <dt className="text-xs text-slate-500">Aceita em</dt>
                    <dd>{new Date(aberta.aceitaEm).toLocaleString("pt-BR")}</dd>
                  </div>
                ) : null}
                {aberta.corretorNome ? (
                  <div>
                    <dt className="text-xs text-slate-500">Corretor</dt>
                    <dd className="font-medium">{aberta.corretorNome}</dd>
                  </div>
                ) : null}
                {aberta.validade ? (
                  <div>
                    <dt className="text-xs text-slate-500">Validade</dt>
                    <dd>{new Date(aberta.validade).toLocaleDateString("pt-BR")}</dd>
                  </div>
                ) : null}
                {aberta.desconto ? (
                  <div>
                    <dt className="text-xs text-slate-500">Desconto</dt>
                    <dd className="tabular-nums">{formatBrl(aberta.desconto)}</dd>
                  </div>
                ) : null}
              </dl>
              {aberta.observacao ? (
                <p className="rounded-xl border border-black/5 bg-slate-50 p-3 text-sm text-slate-700">
                  {aberta.observacao}
                </p>
              ) : null}
              {(aberta.composicao ?? []).length > 0 && (
                <ul className="space-y-1 rounded-xl border border-black/5 p-3 text-sm">
                  {aberta.composicao?.map((linha) => (
                    <li key={linha.label} className="flex justify-between gap-3">
                      <span className="text-slate-500">{linha.label}</span>
                      <span className="tabular-nums font-medium">{formatBrl(linha.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {aberta.origem === "crm" &&
              aberta.status !== "aceita" &&
              aberta.status !== "recusada" &&
              aberta.status !== "expirada" ? (
                <Button
                  className="w-full"
                  disabled={aceitando}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Aceitar esta proposta? Esta ação registra o aceite do proprietário.",
                      )
                    ) {
                      return;
                    }
                    setAceitando(true);
                    void aceitarPortalProposta(aberta.id)
                      .then((result) => {
                        toast.success("Proposta aceita.");
                        setAberta({
                          ...aberta,
                          status: result.status,
                          aceitaEm: result.aceitaEm,
                        });
                        setRows((prev) =>
                          prev.map((row) => ({
                            ...row,
                            propostas: row.propostas.map((p) =>
                              p.id === aberta.id
                                ? {
                                    ...p,
                                    status: result.status,
                                    aceitaEm: result.aceitaEm,
                                  }
                                : p,
                            ),
                          })),
                        );
                      })
                      .catch((err) => {
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível aceitar.",
                        );
                      })
                      .finally(() => setAceitando(false));
                  }}
                >
                  {aceitando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Aceitar proposta
                </Button>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { DemoPreviewNote } from "@/components/demo-preview-note";
import { PillTabs, StatusChip, TableFrame, vendaStatusTone } from "@/components/operacao-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBrl } from "@/lib/captacao-api";
import { FILTER_CONTROL, TABLE_LUX } from "@/lib/filter-bar";
import {
  CHAVE_STATUS_LABEL,
  ESTOQUE_STATUS_LABEL,
  IMOVEIS_DEMO,
  PERFIS_DEMO,
  PROPOSTA_FILA_LABEL,
  VISITA_STATUS_LABEL,
  concluirPosVenda,
  imovelById,
  matchImovel,
  patchChave,
  perfilById,
  useDemoOperacao,
  type EstoqueStatus,
  type ImovelDemo,
} from "@/lib/demo-operacao-usados";
import { toast } from "sonner";

type Search = { status?: EstoqueStatus };

const STATUS_OPTS: Array<EstoqueStatus | "todos"> = [
  "todos",
  "disponivel",
  "reservado",
  "vendido",
];

export const Route = createFileRoute("/_app/imoveis-usados/estoque")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const status = search.status;
    if (status === "disponivel" || status === "reservado" || status === "vendido") {
      return { status };
    }
    return {};
  },
  component: EstoqueDemoPage,
});

function EstoqueDemoPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const demo = useDemoOperacao();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [aba, setAba] = useState("resumo");

  const filtro = status ?? "todos";
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return IMOVEIS_DEMO.filter((item) => {
      if (filtro !== "todos" && item.status !== filtro) return false;
      if (!q) return true;
      return (
        item.titulo.toLowerCase().includes(q) ||
        item.bairro.toLowerCase().includes(q) ||
        item.cidade.toLowerCase().includes(q) ||
        item.proprietario.toLowerCase().includes(q)
      );
    });
  }, [busca, filtro]);

  const imovel = aberto ? imovelById(aberto) : undefined;

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Disponível, reservado e vendido, com preço e dias no mercado."
      />
      <DemoPreviewNote />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PillTabs
          value={filtro}
          onChange={(id) => {
            void navigate({
              to: "/imoveis-usados/estoque",
              search: id === "todos" ? {} : { status: id as EstoqueStatus },
            });
          }}
          items={STATUS_OPTS.map((id) => ({
            id,
            label:
              id === "todos"
                ? `Todos (${IMOVEIS_DEMO.length})`
                : `${ESTOQUE_STATUS_LABEL[id]} (${IMOVEIS_DEMO.filter((item) => item.status === id).length})`,
          }))}
        />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar imóvel, bairro ou dono"
          className={`sm:max-w-xs ${FILTER_CONTROL}`}
        />
      </div>
      <TableFrame>
        <Table className={TABLE_LUX}>
          <TableHeader>
            <TableRow>
              <TableHead>Imóvel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Dias no mercado</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum imóvel neste filtro.
                </TableCell>
              </TableRow>
            ) : (
              lista.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => {
                    setAba("resumo");
                    setAberto(item.id);
                  }}
                >
                  <TableCell>
                    <div className="text-sm font-medium">{item.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.bairro} · {item.cidade}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={vendaStatusTone(item.status)}>
                      {ESTOQUE_STATUS_LABEL[item.status]}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums">
                    {formatBrl(item.preco)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {item.diasNoMercado}
                    {item.preco > item.avaliacao * 1.08 ? (
                      <span className="mt-0.5 block text-[11px] text-orange-700 dark:text-orange-300">
                        Acima da avaliação
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.responsavel}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableFrame>
      <Sheet open={Boolean(imovel)} onOpenChange={(open) => !open && setAberto(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {imovel ? (
            <FichaEstoque
              imovel={imovel}
              aba={aba}
              onAba={setAba}
              demo={demo}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FichaEstoque({
  imovel,
  aba,
  onAba,
  demo,
}: {
  imovel: ImovelDemo;
  aba: string;
  onAba: (id: string) => void;
  demo: ReturnType<typeof useDemoOperacao>;
}) {
  const visitas = demo.visitas.filter((item) => item.imovelId === imovel.id);
  const propostas = demo.propostas.filter((item) => item.imovelId === imovel.id);
  const chave = demo.chaves.find((item) => item.imovelId === imovel.id);
  const pos = demo.posVenda.find((item) => item.imovelId === imovel.id);
  const compativeis = PERFIS_DEMO.flatMap((perfil) => {
    const match = matchImovel(imovel, perfil);
    if (!match || match.nivel !== "alto") return [];
    return [{ perfil, match }];
  });

  return (
    <>
      <SheetHeader className="pr-8 text-left">
        <SheetTitle>{imovel.titulo}</SheetTitle>
        <p className="text-sm text-muted-foreground">
          {imovel.bairro}, {imovel.cidade} · {imovel.proprietario}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <StatusChip tone={vendaStatusTone(imovel.status)}>
            {ESTOQUE_STATUS_LABEL[imovel.status]}
          </StatusChip>
          <StatusChip tone="muted">{formatBrl(imovel.preco)}</StatusChip>
          <StatusChip tone="muted">{imovel.diasNoMercado} dias</StatusChip>
        </div>
      </SheetHeader>
      <div className="mt-4">
        <PillTabs
          value={aba}
          onChange={onAba}
          items={[
            { id: "resumo", label: "Resumo" },
            { id: "visitas", label: `Visitas (${visitas.length})` },
            { id: "propostas", label: `Propostas (${propostas.length})` },
            { id: "chaves", label: "Chaves" },
            { id: "compativeis", label: `Compatíveis (${compativeis.length})` },
          ]}
        />
        {aba === "resumo" ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Tipo" value={imovel.tipo} />
            <Info label="Área" value={`${imovel.area} m²`} />
            <Info label="Quartos" value={imovel.quartos ? String(imovel.quartos) : "—"} />
            <Info label="Avaliação" value={formatBrl(imovel.avaliacao)} />
            <Info label="Responsável" value={imovel.responsavel} />
            <Info label="Proprietário" value={imovel.proprietario} />
            {pos ? (
              <div className="col-span-2 rounded-xl border p-3">
                <p className="text-xs font-medium text-muted-foreground">Pós-venda</p>
                <p className="mt-1 font-medium">{pos.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {pos.concluida ? "Concluída nesta sessão." : pos.atrasada ? "Pendência atrasada." : "Em andamento."}
                </p>
                {pos.concluida ? null : (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      concluirPosVenda(imovel.id);
                      toast.success("Pendência de pós-venda concluída.");
                    }}
                  >
                    Concluir pendência
                  </Button>
                )}
              </div>
            ) : null}
          </dl>
        ) : null}
        {aba === "visitas" ? (
          <ul className="space-y-2">
            {visitas.length === 0 ? (
              <Empty text="Nenhuma visita neste imóvel." />
            ) : (
              visitas.map((visita) => {
                const pessoa = perfilById(visita.interessadoId);
                return (
                  <li key={visita.id} className="rounded-xl border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {visita.diaLabel} · {visita.hora}
                      </span>
                      <StatusChip tone="teal">{VISITA_STATUS_LABEL[visita.status]}</StatusChip>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {pessoa?.nome ?? "Interessado"} · {visita.corretor}
                    </p>
                    {visita.feedback ? (
                      <p className="mt-1 text-xs">{visita.feedback}</p>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
        {aba === "propostas" ? (
          <ul className="space-y-2">
            {propostas.length === 0 ? (
              <Empty text="Nenhuma proposta neste imóvel." />
            ) : (
              propostas.map((proposta) => (
                <li key={proposta.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">{formatBrl(proposta.valor)}</span>
                    <StatusChip tone="violet">{PROPOSTA_FILA_LABEL[proposta.fila]}</StatusChip>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {perfilById(proposta.interessadoId)?.nome} · pedido {formatBrl(proposta.pedido)}
                  </p>
                  <p className="mt-1 text-xs">{proposta.nota}</p>
                </li>
              ))
            )}
          </ul>
        ) : null}
        {aba === "chaves" && chave ? (
          <div className="rounded-xl border p-3 text-sm">
            <StatusChip tone={chave.status === "retirada" ? "orange" : "teal"}>
              {CHAVE_STATUS_LABEL[chave.status]}
            </StatusChip>
            <p className="mt-2">{chave.detalhe}</p>
            {chave.status === "retirada" ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  patchChave(imovel.id, {
                    status: "imobiliaria",
                    detalhe: "Devolvida à caixa da imobiliária.",
                  });
                  toast.success("Devolução da chave registrada.");
                }}
              >
                Registrar devolução
              </Button>
            ) : null}
          </div>
        ) : null}
        {aba === "compativeis" ? (
          <ul className="space-y-2">
            {compativeis.length === 0 ? (
              <Empty text="Nenhum interessado compatível no exemplo." />
            ) : (
              compativeis.map(({ perfil, match }) => (
                <li key={perfil.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">{perfil.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {match.motivos.join(" · ")} · {perfil.corretor}
                  </p>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

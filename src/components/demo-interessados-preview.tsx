import { useState } from "react";
import { DemoPreviewNote } from "@/components/demo-preview-note";
import { StatusChip, TableFrame, vendaStatusTone } from "@/components/operacao-ui";
import { Button } from "@/components/ui/button";
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
import { TABLE_LUX } from "@/lib/filter-bar";
import {
  ESTOQUE_STATUS_LABEL,
  IMOVEIS_DEMO,
  PERFIS_DEMO,
  dispensarAlerta,
  matchImovel,
  useDemoOperacao,
  vincularInteressado,
  type PerfilDemo,
} from "@/lib/demo-operacao-usados";
import { toast } from "sonner";

export function DemoInteressadosPreview() {
  const demo = useDemoOperacao();
  const [aberto, setAberto] = useState<string | null>(null);
  const perfil = PERFIS_DEMO.find((item) => item.id === aberto);

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-sm font-semibold">Ficha com imóveis compatíveis</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Clique um interessado de exemplo para ver o que combina com o estoque.
      </p>
      <DemoPreviewNote />
      <TableFrame>
        <Table className={TABLE_LUX}>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Faixa</TableHead>
              <TableHead>Corretor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERFIS_DEMO.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => setAberto(item.id)}
              >
                <TableCell className="text-sm font-medium">{item.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.cidade}</TableCell>
                <TableCell className="text-sm">{item.tipo}</TableCell>
                <TableCell className="text-sm tabular-nums">
                  {formatBrl(item.precoMin)} — {formatBrl(item.precoMax)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.corretor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>
      <Sheet open={Boolean(perfil)} onOpenChange={(open) => !open && setAberto(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {perfil ? <Ficha perfil={perfil} vinculos={demo.vinculos} alertas={demo.alertasDispensados} /> : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Ficha({
  perfil,
  vinculos,
  alertas,
}: {
  perfil: PerfilDemo;
  vinculos: string[];
  alertas: string[];
}) {
  const linhas = IMOVEIS_DEMO.flatMap((imovel) => {
    const match = matchImovel(imovel, perfil);
    if (!match) return [];
    return [{ imovel, match }];
  });
  const altos = linhas.filter((item) => item.match.nivel === "alto");
  const fora = linhas.filter((item) => item.match.nivel === "fora");
  const alerta = altos.find(
    (item) =>
      item.imovel.entrouRecente &&
      !alertas.includes(`${perfil.id}:${item.imovel.id}`),
  );

  return (
    <>
      <SheetHeader className="pr-8 text-left">
        <SheetTitle>{perfil.nome}</SheetTitle>
        <p className="text-sm text-muted-foreground">
          {perfil.telefone} · {perfil.email}
        </p>
      </SheetHeader>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Busca</dt>
          <dd className="font-medium">
            {perfil.tipo} em {perfil.cidade}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Bairros</dt>
          <dd className="font-medium">{perfil.bairros}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Faixa</dt>
          <dd className="font-medium tabular-nums">
            {formatBrl(perfil.precoMin)} — {formatBrl(perfil.precoMax)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Corretor</dt>
          <dd className="font-medium">{perfil.corretor}</dd>
        </div>
      </dl>
      {alerta ? (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium">Imóvel novo no perfil</p>
          <p className="mt-1 text-muted-foreground">
            {alerta.imovel.titulo} entrou no estoque e cabe na busca de {perfil.nome}.
          </p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              dispensarAlerta(perfil.id, alerta.imovel.id);
              toast.success(`Aviso enviado para ${perfil.corretor}.`);
            }}
          >
            Avisar o corretor
          </Button>
        </div>
      ) : null}
      <h3 className="mb-2 mt-5 text-sm font-semibold">Compatíveis</h3>
      <ul className="space-y-2">
        {altos.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nenhum imóvel na faixa.</li>
        ) : (
          altos.map(({ imovel, match }) => {
            const ligado = vinculos.includes(`${perfil.id}:${imovel.id}`);
            return (
              <li key={imovel.id} className="rounded-xl border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{imovel.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {imovel.bairro} · {match.motivos.join(" · ")}
                    </p>
                  </div>
                  <StatusChip tone={vendaStatusTone(imovel.status)}>
                    {ESTOQUE_STATUS_LABEL[imovel.status]}
                  </StatusChip>
                </div>
                <p className="mt-1 font-semibold tabular-nums">{formatBrl(imovel.preco)}</p>
                {ligado ? (
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                    Vinculado a este interessado.
                  </p>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      vincularInteressado(perfil.id, imovel.id);
                      toast.success(`${imovel.titulo} vinculado a ${perfil.nome}.`);
                    }}
                  >
                    Vincular
                  </Button>
                )}
              </li>
            );
          })
        )}
      </ul>
      {fora.length > 0 ? (
        <>
          <h3 className="mb-2 mt-5 text-sm font-semibold">Fora da faixa</h3>
          <ul className="space-y-2">
            {fora.map(({ imovel, match }) => (
              <li key={imovel.id} className="rounded-xl border border-dashed p-3 text-sm">
                <p className="font-medium">{imovel.titulo}</p>
                <p className="text-xs text-muted-foreground">{match.motivos.join(" · ")}</p>
                <p className="mt-1 tabular-nums">{formatBrl(imovel.preco)}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

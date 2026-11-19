import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { brl } from "@/lib/crm-types";
import {
  downloadPropostaPdfCliente,
  downloadPropostaPdfCorretor,
  type PropostaPdfBrand,
} from "@/lib/proposta-pdf";
import {
  PROPOSTA_STATUS_LABEL,
  fetchPropostas,
  propostaValorLiquido,
  type Proposta,
} from "@/lib/propostas-api";
import { useTenantTheme } from "@/lib/tenant-theme";

export function DocumentacaoPropostaPainel({
  leadId,
  empreendimentoId,
  clienteNome,
}: {
  leadId: string;
  empreendimentoId: string;
  clienteNome: string;
}) {
  const { logoUrl, tenant } = useTenantTheme();
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<Proposta[]>([]);
  const [escolhidaId, setEscolhidaId] = useState("");

  const brand = useMemo<PropostaPdfBrand>(
    () => ({
      logoUrl,
      primaryColor: tenant?.primaryColor ?? null,
      company: tenant
        ? {
            name: tenant.name,
            documento: tenant.documento,
            creci: tenant.creci,
            email: tenant.email,
            telefone: tenant.telefone,
            endereco: tenant.endereco,
            cidade: tenant.cidade,
          }
        : null,
    }),
    [logoUrl, tenant],
  );

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    void fetchPropostas()
      .then((todas) => {
        if (!ativo) return;
        const nome = clienteNome.trim().toLowerCase();
        const doLead = leadId
          ? todas.filter((item) => item.leadId === leadId)
          : [];
        const doImovel = todas.filter((item) => {
          if (empreendimentoId && item.empreendimentoId === empreendimentoId) {
            return true;
          }
          return nome.length > 0 && item.clienteNome.trim().toLowerCase() === nome;
        });
        const encontradas = doLead.length ? doLead : doImovel;
        setLista(encontradas);
        setEscolhidaId(encontradas[0]?.id ?? "");
      })
      .catch(() => {
        if (!ativo) return;
        setLista([]);
        toast.error("Não foi possível carregar a proposta.");
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [leadId, empreendimentoId, clienteNome]);

  const proposta = lista.find((item) => item.id === escolhidaId) ?? lista[0];

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando proposta
      </div>
    );
  }

  if (!proposta) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Nenhuma proposta vinculada a esta ficha.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {lista.length > 1 && (
        <Select value={proposta.id} onValueChange={setEscolhidaId}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lista.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.codigo} · {brl(propostaValorLiquido(item))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-medium">{proposta.clienteNome}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Telefone</p>
          <p className="font-medium">{proposta.clienteTelefone || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Empreendimento</p>
          <p className="font-medium">
            {proposta.empreendimento?.nome ?? "—"}
            {proposta.unidade ? ` · Un. ${proposta.unidade}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Construtora</p>
          <p className="font-medium">{proposta.construtora?.nome ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="font-medium">{PROPOSTA_STATUS_LABEL[proposta.status]}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Valor</p>
          <p className="font-medium tabular-nums">{brl(propostaValorLiquido(proposta))}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Entrada", proposta.entrada],
              ["FGTS", proposta.fgts],
              ["Financiamento", proposta.financiamento],
              [
                "Parcelas até as chaves",
                (proposta.preChaves ?? []).reduce((s, n) => s + n, 0) || null,
              ],
              [
                "Parcelas depois das chaves",
                (proposta.posChaves ?? []).reduce((s, n) => s + n, 0) || null,
              ],
            ].map(([nome, valor]) => (
              <TableRow key={String(nome)}>
                <TableCell>{nome}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {typeof valor === "number" && valor > 0 ? brl(valor) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void downloadPropostaPdfCliente(proposta, brand).then(() => {
              toast.success("Relatório visual baixado");
            });
          }}
        >
          <Download className="mr-2 size-4" />
          Baixar para o cliente
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void downloadPropostaPdfCorretor(proposta, brand).then(() => {
              toast.success("Ficha para assinatura baixada");
            });
          }}
        >
          <Download className="mr-2 size-4" />
          Baixar para assinatura
        </Button>
      </div>
    </div>
  );
}

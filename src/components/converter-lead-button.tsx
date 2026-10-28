import { useState } from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  converterLeadCliente,
  type ConversaoLeadResult,
} from "@/lib/lead-conversao-api";

export function ConverterLeadButton({
  leadId,
  leadNome,
}: {
  leadId: string;
  leadNome: string;
}) {
  const [open, setOpen] = useState(false);
  const [plano, setPlano] = useState("prata");
  const [valorAdesao, setValorAdesao] = useState("");
  const [valorMensalidade, setValorMensalidade] = useState("");
  const [qtdMensalidades, setQtdMensalidades] = useState("12");
  const [dataInicio, setDataInicio] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ConversaoLeadResult | null>(null);

  async function submit() {
    setSaving(true);
    try {
      const created = await converterLeadCliente(leadId, {
        plano: plano as "solo" | "bronze" | "prata" | "ouro",
        valorAdesao: Number(valorAdesao),
        valorMensalidade: Number(valorMensalidade),
        qtdMensalidades: Number(qtdMensalidades),
        dataInicio,
        vencimento,
      });
      setResult(created);
      toast.success(
        created.alreadyConverted
          ? "Este lead já estava convertido."
          : "Cliente e assinatura criados.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível converter o lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="text-[11px] font-medium text-primary hover:underline"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        Converter
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onClick={(event) => event.stopPropagation()}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Converter {leadNome}</DialogTitle>
          </DialogHeader>
          {result ? (
            <div className="space-y-2 text-sm">
              <p>Cliente: {result.tenantId}</p>
              <p>Contrato: {result.contratoId}</p>
              <p>{result.titulos.length} título(s) em aberto.</p>
              {result.temporaryPassword ? (
                <p>Senha temporária do admin: {result.temporaryPassword}</p>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Plano acordado</Label>
                <Select value={plano} onValueChange={setPlano}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="prata">Prata</SelectItem>
                    <SelectItem value="ouro">Ouro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Adesão (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={valorAdesao}
                  onChange={(event) => setValorAdesao(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Mensalidade (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={valorMensalidade}
                  onChange={(event) => setValorMensalidade(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Quantidade de mensalidades</Label>
                <Input
                  inputMode="numeric"
                  value={qtdMensalidades}
                  onChange={(event) => setQtdMensalidades(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(event) => setDataInicio(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={vencimento}
                  onChange={(event) => setVencimento(event.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            {result ? null : (
              <Button type="button" disabled={saving} onClick={() => void submit()}>
                {saving ? "Convertendo..." : "Criar cliente e assinatura"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

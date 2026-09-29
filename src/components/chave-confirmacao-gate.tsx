import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  confirmarDevolucaoMuralChave,
  fetchMuralChaveOpcoes,
  fetchMuralChavePendencias,
  formatChaveQuando,
  type MuralChavePendencia,
} from "@/lib/mural-chaves-api";

export function ChaveConfirmacaoGate() {
  const [itens, setItens] = useState<MuralChavePendencia[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [entregueParaId, setEntregueParaId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!getSession()) return;
    try {
      const pendencias = await fetchMuralChavePendencias();
      setItens(pendencias);
    } catch {
      setItens([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), 20_000);
    return () => window.clearInterval(id);
  }, [carregar]);

  const atual = itens[0];
  const movimentoId = atual?.movimentoId ?? "";
  const recebidoPorId = atual?.recebidoPorId ?? "";

  useEffect(() => {
    if (!movimentoId) return;
    setEntregueParaId(recebidoPorId);
    void fetchMuralChaveOpcoes()
      .then((opcoes) => setUsuarios(opcoes.usuarios))
      .catch(() => setUsuarios([]));
  }, [movimentoId, recebidoPorId]);

  if (!atual) return null;

  async function confirmar() {
    if (!atual) return;
    if (!entregueParaId) {
      toast.error("Informe para quem você entregou a chave.");
      return;
    }
    setSalvando(true);
    try {
      await confirmarDevolucaoMuralChave(atual.movimentoId, entregueParaId);
      toast.success("Devolução confirmada.");
      setItens((prev) => prev.filter((item) => item.movimentoId !== atual.movimentoId));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível confirmar a devolução.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chave-confirmacao-titulo"
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center gap-2 text-primary">
          <KeyRound className="h-5 w-5" />
          <p className="text-xs font-medium uppercase tracking-wide">Pendência obrigatória</p>
        </div>
        <h2 id="chave-confirmacao-titulo" className="text-lg font-semibold">
          Confirme a devolução da chave
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O responsável pelas chaves registrou que você devolveu esta chave. Confirme para quem
          você entregou. Essa pendência permanece até a confirmação.
        </p>
        {itens.length > 1 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {itens.length} confirmações pendentes. Esta é a mais antiga.
          </p>
        ) : null}
        <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-semibold">{atual.identificador}</p>
          <p className="text-muted-foreground">
            Empreendimento: {atual.empreendimentoNome || "—"}
          </p>
          <p className="text-muted-foreground">Imóvel: {atual.imovelLabel}</p>
          <p className="text-muted-foreground">
            Recebida em: {formatChaveQuando(atual.devolucaoEm)}
          </p>
          {atual.recebidoPorNome ? (
            <p className="text-muted-foreground">Registro de quem recebeu: {atual.recebidoPorNome}</p>
          ) : null}
        </div>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="chave-entregue-para">Para quem você entregou a chave</Label>
          <select
            id="chave-entregue-para"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={entregueParaId}
            onChange={(event) => setEntregueParaId(event.target.value)}
          >
            <option value="">Selecione</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.name}
              </option>
            ))}
          </select>
        </div>
        <Button className="mt-4 w-full" disabled={salvando} onClick={() => void confirmar()}>
          {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Confirmar devolução
        </Button>
      </div>
    </div>
  );
}

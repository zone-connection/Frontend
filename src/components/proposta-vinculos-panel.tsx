import { useEffect, useMemo, useState } from "react";
import { Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  fetchCaptacaoImoveis,
  type CaptacaoImovelTipo,
  type Imovel,
} from "@/lib/captacao-api";
import type { Empreendimento } from "@/lib/empreendimentos-api";
import {
  fetchPropostaVinculos,
  removerPropostaVinculo,
  rotuloPropostaVinculo,
  vincularProposta,
  type PropostaVinculo,
} from "@/lib/propostas-api";

function mensagemErro(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function quando(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function avisoNotificacao(vinculo: PropostaVinculo) {
  const aviso = vinculo.notificacoes[0];
  if (!aviso) return "Vínculo criado.";
  if (aviso.status === "enviado") return `E-mail enviado para ${aviso.email}.`;
  if (aviso.status === "sem_email") return "Vínculo criado. O proprietário não tem e-mail.";
  return "Vínculo criado. O e-mail não foi enviado.";
}

const STATUS_AVISO: Record<string, string> = {
  enviado: "E-mail enviado",
  falhou: "Falha no envio",
  sem_email: "Sem e-mail",
};

export function PropostaVinculosPanel({
  propostaId,
  empreendimentos,
  onChanged,
}: {
  propostaId: string;
  empreendimentos: Empreendimento[];
  onChanged?: () => void;
}) {
  const [vinculos, setVinculos] = useState<PropostaVinculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaImovel, setBuscaImovel] = useState("");
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [buscandoImovel, setBuscandoImovel] = useState(false);
  const [buscaEmp, setBuscaEmp] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      setVinculos(await fetchPropostaVinculos(propostaId));
    } catch (err) {
      toast.error(mensagemErro(err, "Não foi possível carregar os vínculos."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [propostaId]);

  useEffect(() => {
    const termo = buscaImovel.trim();
    if (termo.length < 2) {
      setImoveis([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setBuscandoImovel(true);
      void fetchCaptacaoImoveis({ search: termo })
        .then(setImoveis)
        .catch(() => setImoveis([]))
        .finally(() => setBuscandoImovel(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [buscaImovel]);

  const ativos = vinculos.filter((item) => !item.removidoEm);
  const historico = vinculos.filter((item) => item.removidoEm);
  const imoveisAtivos = new Set(
    ativos.map((item) => item.imovel?.id).filter(Boolean),
  );
  const empreendimentosAtivos = new Set(
    ativos.map((item) => item.empreendimento?.id).filter(Boolean),
  );

  const empreendimentosFiltrados = useMemo(() => {
    const termo = buscaEmp.trim().toLowerCase();
    if (termo.length < 2) return [];
    return empreendimentos
      .filter((item) =>
        `${item.nome} ${item.cidade ?? ""}`.toLowerCase().includes(termo),
      )
      .slice(0, 8);
  }, [buscaEmp, empreendimentos]);

  async function vincular(alvo: { imovelId?: string; empreendimentoId?: string }) {
    const chave = alvo.imovelId ?? alvo.empreendimentoId ?? "";
    setSalvando(chave);
    try {
      const criado = await vincularProposta(propostaId, alvo);
      toast.success(avisoNotificacao(criado));
      setBuscaImovel("");
      setBuscaEmp("");
      setImoveis([]);
      await carregar();
      onChanged?.();
    } catch (err) {
      toast.error(mensagemErro(err, "Não foi possível vincular."));
    } finally {
      setSalvando(null);
    }
  }

  async function remover(vinculoId: string) {
    setSalvando(vinculoId);
    try {
      await removerPropostaVinculo(propostaId, vinculoId);
      toast.success("Vínculo removido. A proposta continua cadastrada.");
      await carregar();
      onChanged?.();
    } catch (err) {
      toast.error(mensagemErro(err, "Não foi possível remover o vínculo."));
    } finally {
      setSalvando(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-700">
          <Link2 className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Imóveis e empreendimentos vinculados</h3>
          <p className="text-xs text-muted-foreground">
            A mesma proposta pode ir para vários imóveis, mesmo de proprietários diferentes.
            Cada vínculo é individual e aparece só no portal daquele proprietário.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando vínculos…
        </div>
      ) : ativos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum vínculo ativo.</p>
      ) : (
        <ul className="space-y-2">
          {ativos.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{rotuloPropostaVinculo(item)}</div>
                <div className="text-xs text-muted-foreground">
                  {item.imovel
                    ? `Proprietário: ${item.proprietario?.nome ?? "—"}`
                    : "Empreendimento"}
                  {" · "}
                  {item.corretorNome} em {quando(item.vinculadoEm)}
                </div>
                {item.notificacoes[0] && (
                  <div className="text-xs text-muted-foreground">
                    {STATUS_AVISO[item.notificacoes[0].status] ?? item.notificacoes[0].status}
                    {item.notificacoes[0].email ? ` · ${item.notificacoes[0].email}` : ""}
                    {" · "}
                    {quando(item.notificacoes[0].enviadoEm)}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={salvando === item.id}
                onClick={() => void remover(item.id)}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="busca-imovel">
            Vincular imóvel
          </label>
          <Input
            id="busca-imovel"
            value={buscaImovel}
            placeholder="Rua, bairro, cidade ou proprietário"
            onChange={(event) => setBuscaImovel(event.target.value)}
          />
          {buscandoImovel && (
            <p className="text-xs text-muted-foreground">Buscando imóveis…</p>
          )}
          {imoveis.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-auto rounded-xl border p-1">
              {imoveis.slice(0, 8).map((imovel) => {
                const tipo =
                  CAPTACAO_IMOVEL_TIPO_LABEL[imovel.tipo as CaptacaoImovelTipo] ??
                  imovel.tipo;
                const jaVinculado = imoveisAtivos.has(imovel.id);
                return (
                  <li key={imovel.id}>
                    <button
                      type="button"
                      disabled={jaVinculado || salvando === imovel.id}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                      onClick={() => void vincular({ imovelId: imovel.id })}
                    >
                      <span className="font-medium">
                        {[imovel.logradouro, imovel.numero].filter(Boolean).join(", ") || tipo}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[imovel.bairro, imovel.cidade].filter(Boolean).join(" · ")}
                        {imovel.proprietario?.nome ? ` · ${imovel.proprietario.nome}` : ""}
                        {jaVinculado ? " · já vinculado" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="busca-emp">
            Vincular empreendimento
          </label>
          <Input
            id="busca-emp"
            value={buscaEmp}
            placeholder="Nome do empreendimento"
            onChange={(event) => setBuscaEmp(event.target.value)}
          />
          {empreendimentosFiltrados.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-auto rounded-xl border p-1">
              {empreendimentosFiltrados.map((item) => {
                const jaVinculado = empreendimentosAtivos.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={jaVinculado || salvando === item.id}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                      onClick={() => void vincular({ empreendimentoId: item.id })}
                    >
                      <span className="font-medium">{item.nome}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.cidade || "Sem cidade"}
                        {jaVinculado ? " · já vinculado" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {historico.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Histórico de vínculos removidos ({historico.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {historico.map((item) => (
              <li key={item.id} className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{rotuloPropostaVinculo(item)}</div>
                <div>
                  Vinculado por {item.corretorNome} em {quando(item.vinculadoEm)}
                </div>
                <div>
                  Removido
                  {item.removidoPorNome ? ` por ${item.removidoPorNome}` : ""} em{" "}
                  {quando(item.removidoEm)}
                </div>
                {item.proprietario && <div>Proprietário: {item.proprietario.nome}</div>}
                {item.notificacoes.map((aviso) => (
                  <div key={aviso.id}>
                    {STATUS_AVISO[aviso.status] ?? aviso.status}
                    {aviso.email ? ` para ${aviso.email}` : ""} em {quando(aviso.enviadoEm)}
                    {aviso.status === "falhou" && aviso.detalhe ? ` (${aviso.detalhe})` : ""}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

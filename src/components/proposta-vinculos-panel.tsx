import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  fetchCaptacoes,
  type Captacao,
  type CaptacaoImovelTipo,
  type Imovel,
} from "@/lib/captacao-api";
import type { Empreendimento } from "@/lib/empreendimentos-api";
import {
  fetchVendasUsado,
  VENDA_STATUS_LABEL,
  type VendaUsado,
} from "@/lib/imoveis-usados-api";
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

function textoImovel(imovel: Imovel) {
  return [
    imovel.logradouro,
    imovel.numero,
    imovel.bairro,
    imovel.cidade,
    imovel.proprietario?.nome,
    imovel.tipo,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function rotuloEndereco(imovel: Imovel) {
  return (
    [imovel.logradouro, imovel.numero].filter(Boolean).join(", ") ||
    CAPTACAO_IMOVEL_TIPO_LABEL[imovel.tipo as CaptacaoImovelTipo] ||
    "Imóvel"
  );
}

function ListaVinculo({
  titulo,
  vazio,
  children,
}: {
  titulo: string;
  vazio: string;
  children: ReactNode;
}) {
  const temItens = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <ul className="max-h-64 space-y-1 overflow-auto rounded-xl border p-1">
        {temItens ? (
          children
        ) : (
          <li className="px-2 py-3 text-xs text-muted-foreground">{vazio}</li>
        )}
      </ul>
    </div>
  );
}

function ItemVinculo({
  titulo,
  detalhe,
  disabled,
  onClick,
}: {
  titulo: string;
  detalhe: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
        onClick={onClick}
      >
        <span className="font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalhe}</span>
      </button>
    </li>
  );
}

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
  const [busca, setBusca] = useState("");
  const [captacoes, setCaptacoes] = useState<Captacao[]>([]);
  const [vendasUsado, setVendasUsado] = useState<VendaUsado[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
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
    setCarregandoCatalogo(true);
    void Promise.all([
      fetchCaptacoes().catch(() => [] as Captacao[]),
      fetchVendasUsado().catch(() => [] as VendaUsado[]),
    ])
      .then(([listaCaptacao, listaUsados]) => {
        setCaptacoes(listaCaptacao);
        setVendasUsado(listaUsados);
      })
      .finally(() => setCarregandoCatalogo(false));
  }, []);

  const ativos = vinculos.filter((item) => !item.removidoEm);
  const historico = vinculos.filter((item) => item.removidoEm);
  const imoveisAtivos = new Set(
    ativos.map((item) => item.imovel?.id).filter(Boolean),
  );
  const empreendimentosAtivos = new Set(
    ativos.map((item) => item.empreendimento?.id).filter(Boolean),
  );

  const termo = busca.trim().toLowerCase();

  const captacoesFiltradas = useMemo(() => {
    const vistos = new Set<string>();
    const unicos = captacoes.filter((item) => {
      if (vistos.has(item.imovelId)) return false;
      vistos.add(item.imovelId);
      return true;
    });
    if (!termo) return unicos;
    return unicos.filter((item) => textoImovel(item.imovel).includes(termo));
  }, [captacoes, termo]);

  const usadosFiltrados = useMemo(() => {
    if (!termo) return vendasUsado;
    return vendasUsado.filter((item) =>
      `${textoImovel(item.imovel)} ${item.status}`.includes(termo),
    );
  }, [vendasUsado, termo]);

  const empreendimentosFiltrados = useMemo(() => {
    if (!termo) return empreendimentos.filter((item) => item.ativo !== false);
    return empreendimentos.filter((item) =>
      `${item.nome} ${item.cidade ?? ""} ${item.endereco ?? ""}`
        .toLowerCase()
        .includes(termo),
    );
  }, [empreendimentos, termo]);

  async function vincular(alvo: { imovelId?: string; empreendimentoId?: string }) {
    const chave = alvo.imovelId ?? alvo.empreendimentoId ?? "";
    setSalvando(chave);
    try {
      const criado = await vincularProposta(propostaId, alvo);
      toast.success(avisoNotificacao(criado));
      setBusca("");
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

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="busca-vinculo">
            Buscar para vincular
          </label>
          <Input
            id="busca-vinculo"
            value={busca}
            placeholder="Rua, bairro, proprietário ou nome do empreendimento"
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>

        {carregandoCatalogo ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando imóveis e empreendimentos…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <ListaVinculo titulo="Captações" vazio="Nenhuma captação encontrada.">
              {captacoesFiltradas.map((item) => {
                const imovel = item.imovel;
                const jaVinculado = imoveisAtivos.has(imovel.id);
                return (
                  <ItemVinculo
                    key={item.id}
                    titulo={rotuloEndereco(imovel)}
                    detalhe={[
                      CAPTACAO_IMOVEL_TIPO_LABEL[imovel.tipo as CaptacaoImovelTipo] ??
                        imovel.tipo,
                      [imovel.bairro, imovel.cidade].filter(Boolean).join(" · "),
                      imovel.proprietario?.nome,
                      item.funilEtapa?.label,
                      jaVinculado ? "já vinculado" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    disabled={jaVinculado || salvando === imovel.id}
                    onClick={() => void vincular({ imovelId: imovel.id })}
                  />
                );
              })}
            </ListaVinculo>

            <ListaVinculo titulo="Vendas de usados" vazio="Nenhuma venda de usado encontrada.">
              {usadosFiltrados.map((item) => {
                const imovel = item.imovel;
                const jaVinculado = imoveisAtivos.has(imovel.id);
                return (
                  <ItemVinculo
                    key={item.id}
                    titulo={rotuloEndereco(imovel)}
                    detalhe={[
                      VENDA_STATUS_LABEL[item.status] ?? item.status,
                      [imovel.bairro, imovel.cidade].filter(Boolean).join(" · "),
                      imovel.proprietario?.nome,
                      jaVinculado ? "já vinculado" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    disabled={jaVinculado || salvando === imovel.id}
                    onClick={() => void vincular({ imovelId: imovel.id })}
                  />
                );
              })}
            </ListaVinculo>

            <ListaVinculo titulo="Empreendimentos" vazio="Nenhum empreendimento encontrado.">
              {empreendimentosFiltrados.map((item) => {
                const jaVinculado = empreendimentosAtivos.has(item.id);
                return (
                  <ItemVinculo
                    key={item.id}
                    titulo={item.nome}
                    detalhe={[
                      item.cidade || "Sem cidade",
                      jaVinculado ? "já vinculado" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    disabled={jaVinculado || salvando === item.id}
                    onClick={() => void vincular({ empreendimentoId: item.id })}
                  />
                );
              })}
            </ListaVinculo>
          </div>
        )}
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

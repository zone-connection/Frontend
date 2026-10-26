import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  addFilaMembro,
  fetchFilaElegiveis,
  fetchFilaHistorico,
  fetchFilaPainel,
  removeFilaMembro,
  reordenarFila,
  setFilaAtiva,
  setFilaPrazo,
  setFilaMembroAtivo,
  type FilaElegivel,
  type FilaEvento,
  type FilaPainel,
} from "@/lib/lead-fila-api";

export const Route = createFileRoute("/_app/leads_/fila")({
  head: () => ({ meta: [{ title: "Fila de distribuição — Zone Connection" }] }),
  component: Page,
});

const CARGO: Record<string, string> = {
  corretor: "Corretor",
  gerente: "Gerente",
  treinee: "Trainee",
  admin: "Administrador",
};

const EVENTO: Record<string, string> = {
  atribuicao: "Lead atribuído",
  sem_participante: "Sem integrante disponível",
  ativar: "Distribuição ligada",
  pausar: "Distribuição pausada",
  membro_add: "Integrante adicionado",
  membro_remove: "Integrante removido",
  membro_ativar: "Integrante ativado",
  membro_desativar: "Integrante desativado",
  reordenar: "Ordem alterada",
  redistribuicao: "Redistribuído pela roleta",
};

function Page() {
  const role = getSession()?.role;
  const pode = role === "admin" || role === "gerente";
  const [painel, setPainel] = useState<FilaPainel | null>(null);
  const [elegiveis, setElegiveis] = useState<FilaElegivel[]>([]);
  const [historico, setHistorico] = useState<FilaEvento[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [minutos, setMinutos] = useState("10");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  async function load(periodo?: { de?: string; ate?: string }) {
    const [next, livres, eventos] = await Promise.all([
      fetchFilaPainel(periodo?.de, periodo?.ate),
      fetchFilaElegiveis(),
      fetchFilaHistorico(),
    ]);
    setPainel(next);
    setMinutos(String(next.redistribuirMinutos ?? 0));
    setElegiveis(livres);
    setHistorico(eventos);
  }

  useEffect(() => {
    if (!pode) {
      setLoading(false);
      return;
    }
    void load()
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar a fila."),
      )
      .finally(() => setLoading(false));
  }, [pode]);

  if (!pode) {
    return (
      <PageHeader title="Fila de distribuição de leads" description="Acesso restrito a administrador e gerente." />
    );
  }

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await load({ de: de || undefined, ate: ate || undefined });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar a fila.");
    }
  }

  function mover(index: number, delta: number) {
    if (!painel) return;
    const ids = painel.membros.map((m) => m.id);
    const next = index + delta;
    if (next < 0 || next >= ids.length) return;
    const [item] = ids.splice(index, 1);
    ids.splice(next, 0, item);
    void run(() => reordenarFila(ids));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fila de distribuição de leads"
        description="Os leads novos passam, um a um, pelos integrantes ativos. Quem recebe vai para o fim da fila."
      />
      {loading || !painel ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando fila…
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Integrantes ativos" value={painel.ativos} />
            <Kpi label="Integrantes inativos" value={painel.inativos} />
            <Kpi label="Leads distribuídos" value={painel.distribuidos} />
            <Kpi label="Sem responsável" value={painel.semResponsavel} />
          </div>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">Distribuição automática</p>
              <p className="text-sm text-muted-foreground">
                {painel.ativa
                  ? "Ligada. O próximo lead novo entra no primeiro integrante ativo."
                  : "Pausada. Leads novos ficam sem atribuição automática."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {painel.redistribuirMinutos > 0
                  ? `Se ficar ${painel.redistribuirMinutos} min na primeira etapa sem atividade, vai para o próximo. Zero desliga.`
                  : "Redistribuição por tempo desligada. Informe os minutos e salve para ligar."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Falhas no período: {painel.falhas} · Corretor {painel.porCargo.corretor} · Gerente{" "}
                {painel.porCargo.gerente} · Trainee {painel.porCargo.treinee}
              </p>
            </div>
            <label className="text-sm">
              Redistribuir após (min)
              <input
                type="number"
                min={0}
                max={1440}
                className="mt-1 block w-28 rounded-md border bg-background px-2 py-1.5 text-sm"
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void run(() => setFilaPrazo(Math.max(0, Math.min(1440, Number(minutos) || 0))))
              }
            >
              Salvar prazo
            </Button>
            <Switch
              checked={painel.ativa}
              onCheckedChange={(ativa) => void run(() => setFilaAtiva(ativa))}
              aria-label="Ativar distribuição automática"
            />
          </Card>
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                De
                <input
                  type="date"
                  className="mt-1 block rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Até
                <input
                  type="date"
                  className="mt-1 block rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={ate}
                  onChange={(e) => setAte(e.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void load({ de: de || undefined, ate: ate || undefined }).catch(() =>
                    toast.error("Não foi possível filtrar o período."),
                  )
                }
              >
                Filtrar período
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-56 flex-1 text-sm">
                Adicionar integrante
                <select
                  className="mt-1 block w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {elegiveis.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {CARGO[u.role] ?? u.role}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                disabled={!userId}
                onClick={() =>
                  void run(async () => {
                    await addFilaMembro(userId);
                    setUserId("");
                  })
                }
              >
                <Users className="mr-1 size-4" />
                Adicionar
              </Button>
            </div>
            <ul className="divide-y rounded-xl border">
              {painel.membros.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">Nenhum integrante na fila.</li>
              ) : (
                painel.membros.map((membro, index) => (
                  <li key={membro.id} className="flex flex-wrap items-center gap-3 p-3">
                    <span className="w-8 text-center text-sm font-semibold tabular-nums text-primary">
                      {membro.ordem}
                    </span>
                    <Avatar className="size-9">
                      {membro.avatar ? <AvatarImage src={membro.avatar} alt="" /> : null}
                      <AvatarFallback>{membro.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {membro.nome}{" "}
                        {membro.proximo ? (
                          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            Próximo
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {membro.cargo || CARGO[membro.role] || membro.role} ·{" "}
                        {membro.ativoNaFila ? "Ativo na fila" : "Inativo na fila"} · {membro.recebidos}{" "}
                        lead(s) no período
                        {membro.ultimaAtribuicaoAt
                          ? ` · última ${new Date(membro.ultimaAtribuicaoAt).toLocaleString("pt-BR")}`
                          : ""}
                      </p>
                    </div>
                    <Button type="button" size="icon" variant="outline" onClick={() => mover(index, -1)} aria-label="Subir">
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={() => mover(index, 1)} aria-label="Descer">
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void run(() => setFilaMembroAtivo(membro.id, !membro.ativoNaFila))}
                    >
                      {membro.ativoNaFila ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void run(() => removeFilaMembro(membro.id))}
                    >
                      Remover
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </Card>
          <Card className="p-4">
            <p className="mb-2 font-medium">Histórico</p>
            <ul className="max-h-80 space-y-2 overflow-auto text-sm">
              {historico.length === 0 ? (
                <li className="text-muted-foreground">Nenhum evento ainda.</li>
              ) : (
                historico.map((evento) => (
                  <li key={evento.id} className="flex flex-wrap justify-between gap-2 border-b pb-2">
                    <span>
                      {EVENTO[evento.tipo] ?? evento.tipo}
                      {evento.usuario ? ` · ${evento.usuario}` : ""}
                      {evento.origem ? ` · ${evento.origem}` : ""}
                      {evento.ator ? ` · por ${evento.ator}` : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(evento.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

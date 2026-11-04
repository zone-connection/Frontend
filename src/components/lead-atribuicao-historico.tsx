import { useEffect, useState } from "react";
import {
  ArrowRight,
  GitBranch,
  RefreshCw,
  Shuffle,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  fetchLeadAtribuicoes,
  type LeadAtribuicaoItem,
} from "@/lib/leads-api";
import { formatDateTimePt } from "@/lib/lead-monitoramento";
import { cn } from "@/lib/utils";

const PERFIL: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  super_admin: "Super admin",
  corretor: "Corretor",
  treinee: "Treinee",
  analista: "Analista",
};

function quemFez(item: LeadAtribuicaoItem) {
  if (!item.ator) {
    return item.acao === "roleta" || item.acao === "redistribuicao"
      ? "Fila automática"
      : "Responsável não registrado";
  }
  const perfil = item.atorPerfil ? PERFIL[item.atorPerfil] : null;
  return perfil ? `${perfil} · ${item.ator}` : item.ator;
}

const ACAO: Record<string, string> = {
  entrada: "Entrou no sistema",
  distribuicao: "Distribuição",
  reatribuicao: "Reatribuição",
  troca_equipe: "Troca de equipe",
  roleta: "Fila automática",
  redistribuicao: "Redistribuição da fila",
  desvinculo: "Corretor desvinculado",
  caca: "Caça-lead",
  transformacao: "Virou cliente",
};

const TOM: Record<string, { icon: typeof UserRound; chip: string; bola: string }> = {
  entrada: { icon: UserPlus, chip: "bg-sky-50 text-sky-800", bola: "bg-sky-500" },
  distribuicao: { icon: Shuffle, chip: "bg-cyan-50 text-cyan-800", bola: "bg-[#079ED4]" },
  reatribuicao: { icon: RefreshCw, chip: "bg-violet-50 text-violet-800", bola: "bg-violet-500" },
  troca_equipe: { icon: GitBranch, chip: "bg-amber-50 text-amber-900", bola: "bg-amber-500" },
  roleta: { icon: Shuffle, chip: "bg-cyan-50 text-cyan-800", bola: "bg-[#079ED4]" },
  redistribuicao: { icon: RefreshCw, chip: "bg-cyan-50 text-cyan-800", bola: "bg-[#079ED4]" },
  desvinculo: { icon: UserMinus, chip: "bg-rose-50 text-rose-800", bola: "bg-rose-500" },
  caca: { icon: UserRound, chip: "bg-emerald-50 text-emerald-800", bola: "bg-emerald-500" },
  transformacao: { icon: UserPlus, chip: "bg-emerald-50 text-emerald-800", bola: "bg-emerald-600" },
};

function Fluxo({
  de,
  para,
  vazio,
}: {
  de: string | null;
  para: string | null;
  vazio: string;
}) {
  if (!de && !para) return null;
  const igual = de === para;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="max-w-full truncate rounded-full bg-background px-2 py-0.5 text-xs ring-1 ring-border">
        {de ?? vazio}
      </span>
      {igual ? null : (
        <>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="max-w-full truncate rounded-full bg-[#079ED4]/10 px-2 py-0.5 text-xs font-medium text-[#0B6F96]">
            {para ?? vazio}
          </span>
        </>
      )}
    </div>
  );
}

const cache = new Map<
  string,
  { itens: LeadAtribuicaoItem[]; cadastradoEm: string }
>();

export function LeadAtribuicaoHistorico({ leadId }: { leadId: string }) {
  const salvo = cache.get(leadId);
  const [itens, setItens] = useState<LeadAtribuicaoItem[] | null>(
    salvo?.itens ?? null,
  );
  const [cadastradoEm, setCadastradoEm] = useState<string | null>(
    salvo?.cadastradoEm ?? null,
  );
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const pronto = cache.get(leadId);
    if (pronto) {
      setItens(pronto.itens);
      setCadastradoEm(pronto.cadastradoEm);
      return;
    }
    let ativo = true;
    const timer = window.setTimeout(() => {
      if (!ativo) return;
      setErro("O histórico demorou para responder. Feche e abra o lead de novo.");
    }, 8000);
    void fetchLeadAtribuicoes(leadId)
      .then((data) => {
        if (!ativo) return;
        cache.set(leadId, {
          itens: data.itens,
          cadastradoEm: data.cadastradoEm,
        });
        setItens(data.itens);
        setCadastradoEm(data.cadastradoEm);
        setErro(null);
      })
      .catch((error) => {
        if (!ativo) return;
        setErro(
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar o histórico.",
        );
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [leadId]);

  if (erro) {
    return <p className="text-sm text-rose-600">{erro}</p>;
  }
  if (!itens) {
    return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        No sistema desde {cadastradoEm ? formatDateTimePt(cadastradoEm) : "—"}
      </p>
      {itens.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma movimentação gravada ainda.
        </p>
      ) : (
        <ol className="mt-4">
          {itens.map((item, index) => {
            const tom = TOM[item.acao] ?? TOM.reatribuicao;
            const Icon = tom.icon;
            const ultimo = index === itens.length - 1;
            return (
              <li key={item.id} className="flex gap-3">
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-white",
                      tom.bola,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {ultimo ? null : <span className="my-1 w-px flex-1 bg-border" />}
                </div>
                <div className={cn("min-w-0 flex-1", ultimo ? "pb-1" : "pb-4")}>
                  <div className="rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tom.chip)}>
                        {ACAO[item.acao] ?? "Movimentação"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateTimePt(item.criadoEm)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {quemFez(item)}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {item.deCorretor || item.paraCorretor ? (
                        <div className="flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <Fluxo de={item.deCorretor} para={item.paraCorretor} vazio="Sem corretor" />
                        </div>
                      ) : null}
                      {item.deEquipe || item.paraEquipe ? (
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <Fluxo de={item.deEquipe} para={item.paraEquipe} vazio="Sem equipe" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

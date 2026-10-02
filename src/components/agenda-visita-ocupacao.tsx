import { useEffect, useState } from "react";
import { fetchDisponibilidadeVisitas, type VisitaOcupacao } from "@/lib/agenda-api";
import { fetchEmpreendimentos } from "@/lib/empreendimentos-api";
import { fetchImoveisCaptados } from "@/lib/imoveis-usados-api";
import type { Imovel } from "@/lib/captacao-api";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function rotuloImovel(imovel: Pick<Imovel, "logradouro" | "numero" | "bairro" | "cidade">) {
  const endereco = [imovel.logradouro, imovel.numero].filter(Boolean).join(", ");
  const lugar = [imovel.bairro, imovel.cidade].filter(Boolean).join(" · ");
  return [endereco, lugar].filter(Boolean).join(" — ") || "Imóvel";
}

export function fimBloqueioLocal(
  date: string,
  timeStart: string,
  timeEnd: string,
  toleranciaAtiva: boolean,
) {
  if (!date || !timeStart) return "";
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = timeStart.split(":").map(Number);
  const inicio = new Date(y, m - 1, d, hh, mm, 0, 0);
  let fim = new Date(inicio);
  if (toleranciaAtiva) fim = new Date(inicio.getTime() + 2 * 60 * 60 * 1000);
  else fim = new Date(inicio.getTime() + 60 * 60 * 1000);
  if (timeEnd) {
    const [eh, em] = timeEnd.split(":").map(Number);
    const informado = new Date(y, m - 1, d, eh, em, 0, 0);
    if (informado.getTime() > fim.getTime()) fim = informado;
  }
  return `${String(fim.getHours()).padStart(2, "0")}:${String(fim.getMinutes()).padStart(2, "0")}`;
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function limitesDoDia(dia: string) {
  const [y, m, d] = dia.split("-").map(Number);
  const inicio = new Date(y, m - 1, d, 0, 0, 0, 0);
  const fim = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { from: inicio.toISOString(), to: fim.toISOString() };
}

export function AgendaVisitaOcupacao({
  empreendimentoId,
  imovelId,
  dia,
  titulo,
}: {
  empreendimentoId?: string;
  imovelId?: string;
  dia: string;
  titulo?: string;
}) {
  const [visitas, setVisitas] = useState<VisitaOcupacao[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ((!empreendimentoId && !imovelId) || !dia) {
      setVisitas([]);
      setTotal(0);
      return;
    }
    let cancelado = false;
    setLoading(true);
    const { from, to } = limitesDoDia(dia);
    void fetchDisponibilidadeVisitas({
      empreendimentoId,
      imovelId,
      from,
      to,
    })
      .then((res) => {
        if (cancelado) return;
        setVisitas(res.visitas);
        setTotal(res.total);
      })
      .catch(() => {
        if (!cancelado) {
          setVisitas([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [empreendimentoId, imovelId, dia]);

  if (!empreendimentoId && !imovelId) return null;

  const nome = titulo?.trim() || "Este recurso";

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
      <p className="font-medium">
        {loading
          ? "Consultando a agenda…"
          : `${nome} possui ${total} visita${total === 1 ? "" : "s"} agendada${total === 1 ? "" : "s"} neste dia.`}
      </p>
      {!loading && visitas.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Nenhum horário ocupado. Os demais horários do dia estão disponíveis.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {visitas.map((visita) => {
            const fim = visita.bloqueadoAte ?? visita.endsAt ?? visita.startsAt;
            return (
              <li key={visita.id} className="text-xs leading-snug">
                <span className="font-medium">
                  {hora(visita.startsAt)}–{hora(fim)}
                </span>
                {" · "}
                {visita.corretorNome}
                {" · "}
                {visita.titulo}
                {visita.toleranciaAtiva ? " · tolerância de 2 horas" : ""}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AgendaVisitasPainel({ dia }: { dia: string }) {
  const [empreendimentos, setEmpreendimentos] = useState<
    { id: string; nome: string }[]
  >([]);
  const [imoveis, setImoveis] = useState<{ id: string; label: string }[]>([]);
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [imovelId, setImovelId] = useState("");

  useEffect(() => {
    let cancelado = false;
    void fetchEmpreendimentos({ ativo: true })
      .then((rows) => {
        if (!cancelado) {
          setEmpreendimentos(rows.map((item) => ({ id: item.id, nome: item.nome })));
        }
      })
      .catch(() => {
        if (!cancelado) setEmpreendimentos([]);
      });
    void fetchImoveisCaptados()
      .then((rows) => {
        if (!cancelado) {
          setImoveis(rows.map((item) => ({ id: item.id, label: rotuloImovel(item) })));
        }
      })
      .catch(() => {
        if (!cancelado) setImoveis([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const empreendimentoNome = empreendimentos.find((item) => item.id === empreendimentoId)?.nome;
  const imovelLabel = imoveis.find((item) => item.id === imovelId)?.label;
  const titulo = [empreendimentoNome, imovelLabel].filter(Boolean).join(" · ");

  return (
    <section className="mb-4 rounded-2xl border border-black/5 bg-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Agenda de visitas</h2>
        <p className="text-xs text-muted-foreground">
          Horários ocupados e disponíveis do empreendimento ou do imóvel no dia selecionado.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Empreendimento</Label>
          <Select
            value={empreendimentoId || "__none__"}
            onValueChange={(value) =>
              setEmpreendimentoId(value === "__none__" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar empreendimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {empreendimentos.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Imóvel</Label>
          <Select
            value={imovelId || "__none__"}
            onValueChange={(value) => setImovelId(value === "__none__" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar imóvel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {imoveis.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3">
        {empreendimentoId || imovelId ? (
          <AgendaVisitaOcupacao
            empreendimentoId={empreendimentoId || undefined}
            imovelId={imovelId || undefined}
            dia={dia}
            titulo={titulo}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecione um empreendimento ou um imóvel para ver as visitas do dia.
          </p>
        )}
      </div>
    </section>
  );
}

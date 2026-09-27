import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, Loader2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { brl } from "@/lib/crm-types";
import {
  fetchPropostasDoAlvo,
  PROPOSTA_STATUS_LABEL,
  propostaStatusClass,
  type Proposta,
} from "@/lib/propostas-api";
import { Badge } from "@/components/ui/badge";

function gestor() {
  const role = getSession()?.role;
  return role === "admin" || role === "super_admin" || role === "gerente";
}

export function PropostasDoAlvo({
  empreendimentoId,
  imovelId,
  titulo = "Propostas",
}: {
  empreendimentoId?: string;
  imovelId?: string;
  titulo?: string;
}) {
  const [itens, setItens] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!gestor()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchPropostasDoAlvo({ empreendimentoId, imovelId })
      .then((rows) => {
        setItens(rows);
        setErro("");
      })
      .catch((err) => {
        setErro(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, [empreendimentoId, imovelId]);

  if (!gestor()) return null;

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-4 w-4" />
          {titulo}
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Interno
        </span>
      </div>
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando propostas…
        </p>
      ) : erro ? (
        <p className="text-sm text-destructive">{erro}</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma proposta vinculada.
        </p>
      ) : (
        <ul className="divide-y">
          {itens.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link
                  to="/propostas"
                  className="font-mono text-xs font-medium text-primary hover:underline"
                >
                  {item.codigo}
                </Link>
                <p className="text-sm font-medium">{item.clienteNome}</p>
                <p className="text-xs text-muted-foreground">
                  {item.corretor?.name ?? "Sem corretor"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">{brl(item.valor)}</span>
                <Badge variant="outline" className={propostaStatusClass(item.status)}>
                  {PROPOSTA_STATUS_LABEL[item.status]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { brl } from "@/lib/crm-types";
import {
  fetchPropostaPublicaRecibo,
  type PropostaPublicaRecibo,
} from "@/lib/proposta-publica-api";
import { PROPOSTA_STATUS_LABEL, type PropostaStatus } from "@/lib/propostas-api";

export const Route = createFileRoute("/publico/proposta/recibo/$compradorToken")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Recibo da proposta — Zone Connection" }],
  }),
  component: ReciboPage,
});

function ReciboPage() {
  const { compradorToken } = Route.useParams();
  const [item, setItem] = useState<PropostaPublicaRecibo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPropostaPublicaRecibo(compradorToken)
      .then(setItem)
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Recibo não encontrado.",
        );
      })
      .finally(() => setLoading(false));
  }, [compradorToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (error || !item) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-slate-600">
        {error ?? "Recibo indisponível."}
      </div>
    );
  }

  const status =
    item.status in PROPOSTA_STATUS_LABEL
      ? PROPOSTA_STATUS_LABEL[item.status as PropostaStatus]
      : item.status;
  const aceita = item.status === "aceita";

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {item.tenant.logoUrl ? (
            <img
              src={item.tenant.logoUrl}
              alt=""
              className="mb-4 h-10 w-auto object-contain"
            />
          ) : (
            <p className="mb-4 text-sm font-semibold">{item.tenant.name}</p>
          )}
          <div className="mb-4 flex items-center gap-2">
            {aceita ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : null}
            <h1 className="text-xl font-semibold">{item.codigo}</h1>
          </div>
          <p className="text-sm text-slate-500">
            Status: <strong className="text-slate-800">{status}</strong>
          </p>
          {item.imovel ? (
            <p className="mt-2 text-sm text-slate-600">{item.imovel.rotulo}</p>
          ) : null}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Comprador</dt>
              <dd className="font-medium">{item.clienteNome}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Valor</dt>
              <dd className="font-semibold tabular-nums">{brl(item.valor)}</dd>
            </div>
            {item.corretorNome ? (
              <div>
                <dt className="text-xs text-slate-500">Corretor</dt>
                <dd>{item.corretorNome}</dd>
              </div>
            ) : null}
            {item.aceitaEm ? (
              <div>
                <dt className="text-xs text-slate-500">Aceita em</dt>
                <dd>{new Date(item.aceitaEm).toLocaleString("pt-BR")}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </main>
    </div>
  );
}

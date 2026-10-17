import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  fetchCaptacaoDocumentacao,
  type ChecklistItem,
} from "@/lib/captacao-api";
import { DOCUMENTACAO_MOCK } from "@/lib/modulos-mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/captacao/documentacao")({
  component: DocumentacaoPage,
});

function DocumentacaoPage() {
  const [rows, setRows] = useState<
    Array<{ id: string; proprietario: string; etapa: string; itens: ChecklistItem[] }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCaptacaoDocumentacao()
      .then((next) => setRows(next.length ? next : DOCUMENTACAO_MOCK))
      .catch(() => setRows(DOCUMENTACAO_MOCK))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Documentação e autorizações"
        description="O checklist lê fotos, dados do dono, valor, exclusividade e texto do anúncio."
      />
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
      <div className="space-y-3">
        {rows.map((row) => {
          const prontos = row.itens.filter((item) => item.pronto).length;
          return (
            <div key={row.id} className="rounded-2xl border border-[#E2E8EC] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#141a22]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <Link
                    to="/captacao/captacoes/$id"
                    params={{ id: row.id }}
                    className="font-medium text-[#079ED4] underline"
                  >
                    {row.proprietario}
                  </Link>
                  <p className="text-xs text-muted-foreground">{row.etapa}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {prontos}/{row.itens.length}
                </span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {row.itens.map((item) => (
                  <li
                    key={item.chave}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      item.pronto
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.pronto ? "Pronto" : "Pendente"} · {item.label}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

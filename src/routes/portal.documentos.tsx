import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalPageTitle } from "@/components/portal-ui";
import { ApiError } from "@/lib/api";
import { fetchPortalDocumentosCarteira } from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/documentos")({
  ssr: false,
  component: PortalDocumentosPage,
});

function PortalDocumentosPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPortalDocumentosCarteira>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalDocumentosCarteira()
      .then(setRows)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  const comDocs = rows.filter((row) => row.docs.length > 0);

  return (
    <div className="space-y-6">
      <PortalPageTitle
        title="Documentos"
        subtitle="Checklist da documentação. O sistema ainda não guarda PDF ou contrato para baixar."
      />
      {comDocs.length === 0 ? (
        <PortalEmpty>
          Nenhum checklist aberto. Quando a imobiliária pedir documentos, o status aparece aqui.
        </PortalEmpty>
      ) : (
        <div className="space-y-4">
          {comDocs.map((row) => {
            const pendentes = row.docs.filter((doc) => doc.status !== "aprovado").length;
            return (
              <Link
                key={row.imovel.id}
                to="/portal/imoveis/$id"
                params={{ id: row.imovel.id }}
                className="block rounded-xl border bg-card p-5 shadow-sm"
              >
                <p className="text-sm font-semibold">{row.imovel.identificacao}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pendentes === 0
                    ? "Tudo certo: não falta nenhum item."
                    : `Faltam ${pendentes} ${pendentes === 1 ? "item" : "itens"}.`}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {row.docs.map((doc) => (
                    <li key={doc.id}>
                      {doc.status === "aprovado" ? "✓" : "○"} {doc.nome}
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

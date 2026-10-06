import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalPageTitle } from "@/components/portal-ui";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  fetchPortalDashboard,
  registrarPortalAcao,
  type PortalImovelListItem,
} from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/mensagens")({
  ssr: false,
  component: PortalMensagensPage,
});

function telHref(raw?: string | null) {
  const digits = raw?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function PortalMensagensPage() {
  const [imoveis, setImoveis] = useState<PortalImovelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void fetchPortalDashboard()
      .then((data) => setImoveis(data.imoveis))
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  const contato = imoveis.find((item) => item.contato?.corretor || item.contato?.imobiliaria.telefone)
    ?.contato;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageTitle
        title="Mensagens"
        subtitle="Ainda não há chat interno. Fale com o corretor pelo WhatsApp ou peça um retorno."
      />
      {contato ? (
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold">
            {contato.corretor?.nome ?? contato.imobiliaria.nome}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {contato.imobiliaria.nome}
            {contato.imobiliaria.telefone ? ` · ${contato.imobiliaria.telefone}` : ""}
          </p>
          {telHref(contato.corretor?.whatsapp ?? contato.corretor?.telefone ?? contato.imobiliaria.telefone) ? (
            <a
              href={telHref(contato.corretor?.whatsapp ?? contato.corretor?.telefone ?? contato.imobiliaria.telefone)!}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Abrir WhatsApp
            </a>
          ) : null}
        </div>
      ) : (
        <PortalEmpty>A imobiliária ainda não informou um telefone de contato.</PortalEmpty>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Pedir retorno por imóvel</h2>
        {imoveis.map((imovel) => (
          <div
            key={imovel.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
          >
            <p className="text-sm">{imovel.identificacao}</p>
            <Button
              type="button"
              variant="outline"
              disabled={busyId === imovel.id}
              onClick={() => {
                setBusyId(imovel.id);
                void registrarPortalAcao(imovel.id, "quero_falar")
                  .then((res) => toast.success(res.texto))
                  .catch((err) => {
                    toast.error(err instanceof ApiError ? err.message : "Não foi possível registrar.");
                  })
                  .finally(() => setBusyId(null));
              }}
            >
              Quero falar com o corretor
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

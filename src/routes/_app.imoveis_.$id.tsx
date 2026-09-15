import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { brl } from "@/lib/crm-types";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import {
  empreendimentoImagens,
  empreendimentoLocalidadeNome,
  empreendimentoShareText,
  empreendimentoShareUrl,
  empreendimentoStatusLabel,
  empreendimentoTipoLabel,
  fetchEmpreendimento,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { fetchOruloComercial, fetchOruloOAuthUrl, type OruloComercial } from "@/lib/orulo-api";
import { getSession } from "@/lib/auth";
import { Building2, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis_/$id")({
  head: () => ({ meta: [{ title: "Imóvel — Zone Connection" }] }),
  component: EmpreendimentoDetalhePage,
});

function formatPrevisao(iso: string | null | undefined) {
  if (!iso) return "—";
  const [year, month] = iso.slice(0, 7).split("-");
  if (!year || !month) return iso;
  return `${month}/${year}`;
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

function EmpreendimentoDetalhePage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<Empreendimento | null>(null);
  const [comercial, setComercial] = useState<OruloComercial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchEmpreendimento(id)
      .then((next) => {
        setItem(next);
        if (next.oruloBuildingId) {
          void fetchOruloComercial(next.id)
            .then(setComercial)
            .catch(() => setComercial(null));
        } else {
          setComercial(null);
        }
      })
      .catch((err) => {
        setItem(null);
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o imóvel.",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-3 py-10">
        <p className="text-sm text-muted-foreground">
          Não foi possível abrir este imóvel.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/imoveis">Voltar ao catálogo</Link>
        </Button>
      </div>
    );
  }

  const covers = empreendimentoImagens(item);
  const imobiliaria = getSession()?.tenant?.name?.trim() || "Imobiliária";

  async function compartilhar() {
    const url = empreendimentoShareUrl(item.id);
    const text = empreendimentoShareText(item.nome, imobiliaria, item.id);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: item.nome,
          text,
          url,
        });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado. Cole no WhatsApp para enviar.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <>
      <PageHeader
        title={item.nome}
        description={
          [
            item.oruloBuildingId ? "Órulo" : null,
            item.construtora?.nome,
            empreendimentoLocalidadeNome(item),
          ]
            .filter(Boolean)
            .join(" · ") || "Empreendimento do catálogo"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void compartilhar()}>
              <Share2 className="mr-1.5 h-4 w-4" />
              Compartilhar
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/imoveis">Voltar ao catálogo</Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div
          className={
            covers.length > 1
              ? "grid gap-3 sm:grid-cols-2"
              : "grid gap-3"
          }
        >
          {covers.length === 0 ? (
            <div className="flex h-56 items-center justify-center rounded-xl bg-linear-to-br from-primary/25 via-primary/10 to-muted">
              <Building2 className="h-10 w-10 text-primary/35" />
            </div>
          ) : (
            covers.map((src) => (
              <img
                key={src}
                src={src}
                alt={item.nome}
                className="max-h-72 w-full rounded-xl object-cover"
              />
            ))
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do imóvel</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Construtora" value={item.construtora?.nome} />
            <Field
              label="Localidade"
              value={empreendimentoLocalidadeNome(item)}
            />
            <Field label="Endereço" value={item.endereco} />
            <Field
              label="Previsão"
              value={formatPrevisao(item.previsaoEntrega)}
            />
            <Field
              label="Valor a partir de"
              value={
                item.valorReferencia != null ? brl(item.valorReferencia) : null
              }
            />
            <Field
              label="Renda a partir de"
              value={
                item.rendaAPartirDe != null ? brl(item.rendaAPartirDe) : null
              }
            />
            <Field
              label="Metragem"
              value={item.areaM2 != null ? `${item.areaM2} m²` : null}
            />
            <Field label="Quartos" value={item.quartos} />
            <Field label="Banheiros" value={item.banheiros} />
            <Field label="Vagas" value={item.vagas} />
          </CardContent>
        </Card>

        {item.tipo || item.status || (item.tags ?? []).length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classificação</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {item.tipo ? (
                <Badge className={STATUS_CHIP_CLASS}>
                  {empreendimentoTipoLabel(item.tipo)}
                </Badge>
              ) : null}
              {item.status ? (
                <Badge className={STATUS_CHIP_CLASS}>
                  {empreendimentoStatusLabel(item.status)}
                </Badge>
              ) : null}
              {(item.tags ?? []).map((tag) => (
                <Badge key={tag} className={STATUS_CHIP_CLASS} title={tag}>
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {item.observacao?.trim() ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{item.observacao}</p>
            </CardContent>
          </Card>
        ) : null}

        {item.oruloBuildingId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados comerciais Órulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {comercial?.authorized === false ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Autorize sua conta Órulo para ver comissão, contatos e
                    arquivos em tempo real. Nada disso é gravado no CRM.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void fetchOruloOAuthUrl()
                        .then((res) => window.location.assign(res.url))
                        .catch((err) =>
                          toast.error(
                            err instanceof ApiError
                              ? err.message
                              : "Não foi possível abrir a autorização.",
                          ),
                        );
                    }}
                  >
                    Autorizar Órulo
                  </Button>
                </div>
              ) : comercial?.authorized ? (
                <div className="space-y-3">
                  {comercial.opportunity ? (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Oportunidade
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap">
                        {String(
                          comercial.opportunity.broker_description ??
                            comercial.opportunity.client_description ??
                            "Há campanha ativa para este empreendimento.",
                        )}
                      </p>
                    </div>
                  ) : null}
                  {(comercial.commercialContacts ?? []).map((contact, index) => (
                    <div key={String(contact.id ?? index)}>
                      <p className="font-medium">
                        {String(contact.name ?? "Contato comercial")}
                      </p>
                      {contact.real_estate_agency_commission != null ? (
                        <p className="text-muted-foreground">
                          Comissão: {String(contact.real_estate_agency_commission)}
                          %
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {(comercial.files ?? []).length > 0 ? (
                    <ul className="list-disc space-y-1 pl-4">
                      {comercial.files!.map((file, index) => (
                        <li key={String(file.id ?? index)}>
                          {typeof file.uri === "string" ||
                          typeof file.url === "string" ? (
                            <a
                              href={String(file.uri ?? file.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {String(file.name ?? file.title ?? "Arquivo")}
                            </a>
                          ) : (
                            String(file.name ?? file.title ?? "Arquivo")
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Carregando dados comerciais…
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {item.externalUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={item.externalUrl} target="_blank" rel="noreferrer">
              {item.oruloBuildingId ? "Abrir na Órulo" : "Abrir link externo"}
            </a>
          </Button>
        ) : null}
      </div>
    </>
  );
}

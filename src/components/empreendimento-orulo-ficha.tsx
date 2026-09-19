import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl } from "@/lib/crm-types";
import type { EmpreendimentoVitrine } from "@/lib/empreendimentos-api";

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month) return iso;
  return day ? `${day}/${month}/${year}` : `${month}/${year}`;
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="font-normal">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function EmpreendimentoOruloFicha({
  vitrine,
  codigo,
  fotos,
  tipo,
}: {
  vitrine?: EmpreendimentoVitrine | null;
  codigo?: number | string | null;
  fotos?: number;
  tipo?: string | null;
}) {
  if (!vitrine) return null;
  const condo = vitrine.lazer ?? [];
  const infra = vitrine.infraestrutura ?? [];
  const unidade =
    vitrine.detalhesUnidade?.length
      ? vitrine.detalhesUnidade
      : (vitrine.diferenciais ?? []);
  const tipologias = vitrine.tipologias ?? [];
  const plantas = vitrine.plantas ?? [];
  const hasOutras =
    Boolean(vitrine.lancamento) ||
    Boolean(vitrine.unidades) ||
    Boolean(vitrine.andares) ||
    Boolean(vitrine.nomeCondominio) ||
    Boolean(vitrine.atualizadoEm) ||
    Boolean(codigo) ||
    Boolean(fotos);

  const hasMap =
    vitrine.latitude != null && vitrine.longitude != null;

  if (
    !vitrine.descricao &&
    !vitrine.website &&
    !vitrine.tourVirtual &&
    !hasOutras &&
    !hasMap &&
    !condo.length &&
    !infra.length &&
    !unidade.length &&
    !tipologias.length &&
    !plantas.length &&
    vitrine.suites == null &&
    vitrine.areaMax == null &&
    vitrine.valorMax == null &&
    vitrine.valorM2 == null
  ) {
    return null;
  }

  return (
    <div className="space-y-4">
      {vitrine.website || vitrine.tourVirtual || tipo ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mídia e links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" value={tipo} />
            {vitrine.website ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Website
                </p>
                <a
                  href={vitrine.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block text-sm underline"
                >
                  {vitrine.website}
                </a>
              </div>
            ) : null}
            {vitrine.tourVirtual ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Tour virtual 360°
                </p>
                <a
                  href={vitrine.tourVirtual}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block text-sm underline"
                >
                  Abrir tour
                </a>
              </div>
            ) : (
              <Field label="Tour virtual 360°" value="Não habilitado" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {condo.length || infra.length || unidade.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Características</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Chips title="Características condominiais" items={[...condo, ...infra]} />
            <Chips title="Características da unidade" items={unidade} />
          </CardContent>
        </Card>
      ) : null}

      {tipologias.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipologias disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Tipo</th>
                  <th className="pb-2 pr-3 font-medium">m²</th>
                  <th className="pb-2 pr-3 font-medium">Quartos</th>
                  <th className="pb-2 pr-3 font-medium">Suítes</th>
                  <th className="pb-2 pr-3 font-medium">Banheiros</th>
                  <th className="pb-2 pr-3 font-medium">Vagas</th>
                  <th className="pb-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {tipologias.map((row, index) => (
                  <tr key={`${row.nome}-${index}`} className="border-t">
                    <td className="py-2 pr-3">
                      {row.nome}
                      {row.pavimento ? (
                        <span className="block text-xs text-muted-foreground">
                          {row.pavimento}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">{row.areaM2 ?? "—"}</td>
                    <td className="py-2 pr-3">{row.quartos ?? "—"}</td>
                    <td className="py-2 pr-3">{row.suites ?? "—"}</td>
                    <td className="py-2 pr-3">{row.banheiros ?? "—"}</td>
                    <td className="py-2 pr-3">{row.vagas ?? "—"}</td>
                    <td className="py-2">
                      {row.valor != null ? brl(row.valor) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {plantas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plantas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {plantas.map((src) => (
              <img
                key={src}
                src={src}
                alt="Planta"
                className="max-h-72 w-full rounded-xl object-contain bg-muted"
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {hasOutras ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outras informações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Código" value={codigo != null ? String(codigo) : null} />
            <Field label="Fotos" value={fotos != null ? String(fotos) : null} />
            <Field label="Lançamento" value={formatDate(vitrine.lancamento)} />
            <Field label="Unidades" value={vitrine.unidades} />
            <Field label="Andares" value={vitrine.andares} />
            <Field label="Condomínio" value={vitrine.nomeCondominio} />
            <Field label="Suítes a partir de" value={vitrine.suites} />
            <Field
              label="Metragem máxima"
              value={vitrine.areaMax != null ? `${vitrine.areaMax} m²` : null}
            />
            <Field
              label="Valor máximo"
              value={vitrine.valorMax != null ? brl(vitrine.valorMax) : null}
            />
            <Field
              label="Valor por m²"
              value={vitrine.valorM2 != null ? brl(Math.round(vitrine.valorM2)) : null}
            />
            <Field
              label="Atualizado em"
              value={formatDate(vitrine.atualizadoEm)}
            />
          </CardContent>
        </Card>
      ) : null}

      {hasMap ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapa</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              title="Mapa do empreendimento"
              className="h-64 w-full rounded-xl border-0"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${vitrine.latitude},${vitrine.longitude}&z=15&output=embed`}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

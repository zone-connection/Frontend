import type {
  Empreendimento,
  EmpreendimentoTipologia,
} from "@/lib/empreendimentos-api";

type CatalogoTipologia = Pick<
  Empreendimento,
  "areaM2" | "quartos" | "banheiros" | "vagas" | "valorReferencia"
> & {
  vitrine?: {
    tipologias?: EmpreendimentoTipologia[] | null;
    tiposUnidade?: string[];
    suites?: number | null;
    andares?: number | null;
  } | null;
};

/** Tipologias salvas, ou um bloco montado com os campos antigos do catálogo. */
export function tipologiasVisiveis(
  item: CatalogoTipologia,
): EmpreendimentoTipologia[] {
  if (item.vitrine?.tipologias?.length) {
    return item.vitrine.tipologias;
  }
  const nome = item.vitrine?.tiposUnidade?.[0] ?? "";
  const hasLegacy =
    Boolean(nome) ||
    item.areaM2 != null ||
    item.quartos != null ||
    item.banheiros != null ||
    item.vagas != null ||
    item.valorReferencia != null ||
    item.vitrine?.suites != null ||
    item.vitrine?.andares != null;
  if (!hasLegacy) return [];
  return [
    {
      nome: nome || "Unidade",
      areaM2: item.areaM2 ?? null,
      quartos: item.quartos ?? null,
      suites: item.vitrine?.suites ?? null,
      banheiros: item.banheiros ?? null,
      vagas: item.vagas ?? null,
      valor: item.valorReferencia ?? null,
      pavimento:
        item.vitrine?.andares != null ? String(item.vitrine.andares) : null,
    },
  ];
}

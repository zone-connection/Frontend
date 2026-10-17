import type { ReactNode } from "react";
import type { CaptacaoImovelTipo, Proprietario } from "@/lib/captacao-api";

export type ImovelFichaValues = {
  complemento: string;
  area: string;
  areaConstruida: string;
  quartos: string;
  suites: string;
  banheiros: string;
  vagas: string;
  tipoEmpreendimento: string;
  aptsPorAndar: string;
  andares: string;
  torres: string;
  descricao: string;
  observacoes: string;
  comodidadesUnidade: string[];
  comodidadesCondominio: string[];
};

export function emptyImovelFicha(): ImovelFichaValues {
  return {
    complemento: "",
    area: "",
    areaConstruida: "",
    quartos: "",
    suites: "",
    banheiros: "",
    vagas: "",
    tipoEmpreendimento: "Condomínio",
    aptsPorAndar: "",
    andares: "",
    torres: "",
    descricao: "",
    observacoes: "",
    comodidadesUnidade: [],
    comodidadesCondominio: [],
  };
}

export function imovelToFicha(item: {
  complemento?: string | null;
  area?: number | null;
  areaConstruida?: number | null;
  quartos?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  tipoEmpreendimento?: string | null;
  aptsPorAndar?: number | null;
  andares?: number | null;
  torres?: number | null;
  descricao?: string | null;
  observacoes?: string | null;
  comodidadesUnidade?: string[] | null;
  comodidadesCondominio?: string[] | null;
}): ImovelFichaValues {
  return {
    complemento: item.complemento ?? "",
    area: item.area != null ? String(item.area) : "",
    areaConstruida:
      item.areaConstruida != null ? String(item.areaConstruida) : "",
    quartos: item.quartos != null ? String(item.quartos) : "",
    suites: item.suites != null ? String(item.suites) : "",
    banheiros: item.banheiros != null ? String(item.banheiros) : "",
    vagas: item.vagas != null ? String(item.vagas) : "",
    tipoEmpreendimento: item.tipoEmpreendimento ?? "Condomínio",
    aptsPorAndar: item.aptsPorAndar != null ? String(item.aptsPorAndar) : "",
    andares: item.andares != null ? String(item.andares) : "",
    torres: item.torres != null ? String(item.torres) : "",
    descricao: item.descricao ?? "",
    observacoes: item.observacoes ?? "",
    comodidadesUnidade: item.comodidadesUnidade ?? [],
    comodidadesCondominio: item.comodidadesCondominio ?? [],
  };
}

export function fichaToPayload(ficha: ImovelFichaValues) {
  function num(v: string) {
    if (!v.trim()) return undefined;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return {
    complemento: ficha.complemento,
    area: num(ficha.area),
    areaConstruida: num(ficha.areaConstruida),
    quartos: num(ficha.quartos),
    suites: num(ficha.suites),
    banheiros: num(ficha.banheiros),
    vagas: num(ficha.vagas),
    tipoEmpreendimento: ficha.tipoEmpreendimento,
    aptsPorAndar: num(ficha.aptsPorAndar),
    andares: num(ficha.andares),
    torres: num(ficha.torres),
    descricao: ficha.descricao,
    observacoes: ficha.observacoes,
    comodidadesUnidade: ficha.comodidadesUnidade,
    comodidadesCondominio: ficha.comodidadesCondominio,
  };
}

export type ImovelCadastroFields = {
  proprietarioId: string;
  tipo: CaptacaoImovelTipo;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  proprietarios: Proprietario[];
  /** Bloco extra abaixo do select, para criar o dono na hora. */
  depoisDoProprietario?: ReactNode;
  onChange: (
    patch: Partial<Omit<ImovelCadastroFields, "proprietarios" | "onChange">>,
  ) => void;
};

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  fetchEnderecoPorCep,
  type EnderecoCep,
} from "@/lib/propostas-api";
import { formatCep } from "@/lib/utils";

export type { EnderecoCep };

const UF_NOME: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export function nomeEstado(uf: string): string {
  return UF_NOME[uf.toUpperCase()] ?? uf;
}

/** Rua, bairro — cidade-UF. O número não vem no CEP. */
export function linhaDeEndereco(endereco: EnderecoCep): string {
  const rua = [endereco.endereco, endereco.bairro].filter(Boolean).join(", ");
  const cidade = [endereco.cidade, endereco.uf].filter(Boolean).join("-");
  return [rua, cidade].filter(Boolean).join(" — ");
}

async function consultarCepPublico(digits: string): Promise<EnderecoCep> {
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP.");
  }
  const result = (await response.json()) as {
    erro?: boolean;
    cep?: string;
    logradouro?: string;
    complemento?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (result.erro) {
    throw new Error("CEP não encontrado.");
  }
  return {
    cep: result.cep ?? digits,
    endereco: result.logradouro ?? "",
    complemento: result.complemento ?? "",
    bairro: result.bairro ?? "",
    cidade: result.localidade ?? "",
    uf: result.uf ?? "",
  };
}

export function useConsultaCep(publico = false) {
  const [loading, setLoading] = useState(false);

  async function buscar(cep: string): Promise<EnderecoCep | null> {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8 || loading) return null;
    setLoading(true);
    try {
      const endereco = publico
        ? await consultarCepPublico(digits)
        : await fetchEnderecoPorCep(digits);
      toast.success("Endereço preenchido a partir do CEP.");
      return endereco;
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível consultar o CEP.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { loading, buscar };
}

/** Dispara a consulta assim que os 8 dígitos estão no campo. */
export function consultarSeCepCompleto(
  cep: string,
  buscar: (cep: string) => Promise<EnderecoCep | null>,
  aplicar: (endereco: EnderecoCep) => void,
) {
  if (cep.replace(/\D/g, "").length !== 8) return;
  void buscar(cep).then((endereco) => {
    if (endereco) aplicar(endereco);
  });
}

/** Campo de CEP que só serve para preencher o endereço ao lado. */
export function CampoCep({
  id,
  disabled,
  publico = false,
  onEncontrado,
}: {
  id: string;
  disabled?: boolean;
  publico?: boolean;
  onEncontrado: (endereco: EnderecoCep) => void;
}) {
  const [cep, setCep] = useState("");
  const { loading, buscar } = useConsultaCep(publico);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        CEP
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        value={cep}
        disabled={disabled || loading}
        placeholder={loading ? "Consultando..." : "00000-000"}
        maxLength={9}
        className="h-10 bg-background"
        onChange={(e) => {
          const valor = formatCep(e.target.value);
          setCep(valor);
          consultarSeCepCompleto(valor, buscar, onEncontrado);
        }}
      />
    </div>
  );
}

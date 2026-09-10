import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCep, formatCpfCnpj, formatRg } from "@/lib/utils";

export type ContatoContratoValues = {
  cpf: string;
  rg: string;
  endereco: string;
  cep: string;
};

type Props = {
  idPrefix: string;
  values: ContatoContratoValues;
  onChange: (patch: Partial<ContatoContratoValues>) => void;
};

/** Campos opcionais usados para preencher contratos. */
export function ContatoContratoFields({ idPrefix, values, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-cpf`}
          className="text-xs text-muted-foreground"
        >
          CPF <span className="font-normal">(opcional)</span>
        </Label>
        <Input
          id={`${idPrefix}-cpf`}
          inputMode="numeric"
          value={values.cpf}
          onChange={(e) => onChange({ cpf: formatCpfCnpj(e.target.value) })}
          placeholder="000.000.000-00"
          className="h-10 bg-background"
          maxLength={18}
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-rg`}
          className="text-xs text-muted-foreground"
        >
          RG <span className="font-normal">(opcional)</span>
        </Label>
        <Input
          id={`${idPrefix}-rg`}
          value={values.rg}
          onChange={(e) => onChange({ rg: formatRg(e.target.value) })}
          placeholder="00.000.000-0"
          className="h-10 bg-background"
          maxLength={12}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label
          htmlFor={`${idPrefix}-endereco`}
          className="text-xs text-muted-foreground"
        >
          Endereço <span className="font-normal">(opcional)</span>
        </Label>
        <Input
          id={`${idPrefix}-endereco`}
          value={values.endereco}
          onChange={(e) => onChange({ endereco: e.target.value })}
          placeholder="Rua, número, bairro"
          className="h-10 bg-background"
          maxLength={200}
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-cep`}
          className="text-xs text-muted-foreground"
        >
          CEP <span className="font-normal">(opcional)</span>
        </Label>
        <Input
          id={`${idPrefix}-cep`}
          inputMode="numeric"
          value={values.cep}
          onChange={(e) => onChange({ cep: formatCep(e.target.value) })}
          placeholder="00000-000"
          className="h-10 bg-background"
          maxLength={9}
        />
      </div>
    </div>
  );
}

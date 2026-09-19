import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/form-dialog";
import {
  ImageUploadField,
  assertImageFile,
} from "@/components/image-upload-field";
import { cn } from "@/lib/utils";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  CAPTACAO_IMOVEL_TIPOS,
  IMOVEL_MAX_FOTOS,
  IMOVEL_CARACTERISTICAS_DIFERENCIAIS,
  IMOVEL_DETALHES_IMOVEL,
  IMOVEL_LOCALIZACAO_INFRA,
  splitComodidadesCondominio,
  type CaptacaoImovelTipo,
} from "@/lib/captacao-api";
import {
  Bath,
  BedDouble,
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  Layers,
  MapPin,
  Megaphone,
  Plus,
  Sparkles,
  StickyNote,
  UserRound,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  type ImovelCadastroFields,
  type ImovelFichaValues,
} from "@/lib/imovel-ficha";

const fieldInput =
  "h-10 rounded-xl border-border/80 bg-background shadow-sm";

const imovelSelectClass =
  "flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function toggle(list: string[], value: string, on: boolean) {
  if (on) return list.includes(value) ? list : [...list, value];
  return list.filter((item) => item !== value);
}

export function AmenityChips({
  title,
  hint,
  options,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const extras = value.filter((item) => !options.includes(item));
  const selected = value.length;

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {selected > 0 ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {selected}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[...options, ...extras].map((item) => {
          const checked = value.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(toggle(value, item, !checked))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                checked
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          placeholder="Incluir outra…"
          className={cn(fieldInput, "h-9")}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const next = custom.trim();
            if (!next) return;
            onChange(toggle(value, next, true));
            setCustom("");
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 rounded-xl"
          onClick={() => {
            const next = custom.trim();
            if (!next) return;
            onChange(toggle(value, next, true));
            setCustom("");
          }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Incluir
        </Button>
      </div>
    </div>
  );
}

export function ImovelFichaFields({
  value,
  onChange,
  cadastro,
  resetKey,
  foto,
}: {
  value: ImovelFichaValues;
  onChange: (next: ImovelFichaValues) => void;
  cadastro?: ImovelCadastroFields;
  resetKey?: string;
  foto?: {
    items: Array<{ id?: string; url: string }>;
    previewUrls?: string[];
    busy?: boolean;
    onAdd: (file: File) => void;
    onRemove: (index: number, id?: string) => void;
  };
}) {
  const sections = cadastro ? CADASTRO_SECTIONS : FICHA_SECTIONS;
  const [section, setSection] = useState<ImovelFormSectionId>(sections[0]!.id);

  const isCadastro = Boolean(cadastro);
  useEffect(() => {
    setSection(isCadastro ? "identificacao" : "foto");
  }, [resetKey, isCadastro]);

  function set<K extends keyof ImovelFichaValues>(
    key: K,
    next: ImovelFichaValues[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  const { diferenciais, infra } = splitComodidadesCondominio(
    value.comodidadesCondominio,
  );
  const index = sections.findIndex((item) => item.id === section);
  const isFirst = index <= 0;
  const isLast = index >= sections.length - 1;

  return (
    <div className="space-y-4">
      <nav className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {sections.map((item, i) => {
          const active = item.id === section;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/80 bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {i + 1}. {item.label}
            </button>
          );
        })}
      </nav>

      {section === "identificacao" && cadastro ? (
        <FormSection
          icon={<UserRound className="h-3.5 w-3.5" />}
          title="Identificação"
          description="Quem é o dono e qual o tipo do imóvel."
        >
          <Field label="Proprietário">
            <select
              className={imovelSelectClass}
              value={cadastro.proprietarioId}
              onChange={(e) =>
                cadastro.onChange({ proprietarioId: e.target.value })
              }
            >
              <option value="">Selecione</option>
              {cadastro.proprietarios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select
              className={imovelSelectClass}
              value={cadastro.tipo}
              onChange={(e) =>
                cadastro.onChange({
                  tipo: e.target.value as CaptacaoImovelTipo,
                })
              }
            >
              {CAPTACAO_IMOVEL_TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {CAPTACAO_IMOVEL_TIPO_LABEL[tipo]}
                </option>
              ))}
            </select>
          </Field>
        </FormSection>
      ) : null}

      {section === "endereco" && cadastro ? (
        <FormSection
          icon={<MapPin className="h-3.5 w-3.5" />}
          title="Endereço"
          description="Localização do imóvel."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CEP">
              <Input
                className={fieldInput}
                value={cadastro.cep}
                onChange={(e) => cadastro.onChange({ cep: e.target.value })}
              />
            </Field>
            <Field label="UF">
              <Input
                className={fieldInput}
                value={cadastro.estado}
                maxLength={2}
                onChange={(e) => cadastro.onChange({ estado: e.target.value })}
              />
            </Field>
            <Field label="Logradouro" className="sm:col-span-2">
              <Input
                className={fieldInput}
                value={cadastro.logradouro}
                onChange={(e) =>
                  cadastro.onChange({ logradouro: e.target.value })
                }
              />
            </Field>
            <Field label="Número">
              <Input
                className={fieldInput}
                value={cadastro.numero}
                onChange={(e) => cadastro.onChange({ numero: e.target.value })}
              />
            </Field>
            <Field label="Bairro">
              <Input
                className={fieldInput}
                value={cadastro.bairro}
                onChange={(e) => cadastro.onChange({ bairro: e.target.value })}
                placeholder="Muro Alto"
              />
            </Field>
            <Field label="Cidade" className="sm:col-span-2">
              <Input
                className={fieldInput}
                value={cadastro.cidade}
                onChange={(e) => cadastro.onChange({ cidade: e.target.value })}
              />
            </Field>
          </div>
        </FormSection>
      ) : null}

      {section === "foto" && foto ? (
        <FormSection
          icon={<Camera className="h-3.5 w-3.5" />}
          title="Fotos"
          description={`Até ${IMOVEL_MAX_FOTOS} fotos. A primeira é a capa na captação, nos usados e no portal.`}
        >
          <ImageUploadField
            images={[
              ...foto.items.map((item) => item.url),
              ...(foto.previewUrls ?? []),
            ]}
            max={IMOVEL_MAX_FOTOS}
            label="Fotos do imóvel"
            hint="JPG, PNG ou WebP. Até 5 MB cada. Capa = primeira foto."
            recommendedSize="1600 × 1200"
            slotLabels={["Capa"]}
            busy={foto.busy}
            onAdd={(files) => {
              const file = files[0];
              if (!file) return;
              const err = assertImageFile(file);
              if (err) {
                toast.error(err);
                return;
              }
              foto.onAdd(file);
            }}
            onRemove={(index) => {
              const saved = foto.items[index];
              foto.onRemove(index, saved?.id);
            }}
          />
        </FormSection>
      ) : null}

      {section === "unidade" ? (
        <FormSection
          icon={<BedDouble className="h-3.5 w-3.5" />}
          title="Unidade"
          description="Metragem, cômodos e vagas da ficha."
        >
          <Field label="Complemento">
            <Input
              className={fieldInput}
              value={value.complemento}
              onChange={(e) => set("complemento", e.target.value)}
              placeholder="Apto, bloco, rooftop…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Área (m²)">
              <Input
                className={fieldInput}
                value={value.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder="105,71"
              />
            </Field>
            <Field label="Área construída (m²)">
              <Input
                className={fieldInput}
                value={value.areaConstruida}
                onChange={(e) => set("areaConstruida", e.target.value)}
              />
            </Field>
            <Field label="Quartos">
              <div className="relative">
                <BedDouble className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn(fieldInput, "pl-9")}
                  value={value.quartos}
                  onChange={(e) => set("quartos", e.target.value)}
                />
              </div>
            </Field>
            <Field label="Suítes">
              <div className="relative">
                <Bath className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn(fieldInput, "pl-9")}
                  value={value.suites}
                  onChange={(e) => set("suites", e.target.value)}
                />
              </div>
            </Field>
            <Field label="Banheiros sociais">
              <Input
                className={fieldInput}
                value={value.banheiros}
                onChange={(e) => set("banheiros", e.target.value)}
              />
            </Field>
            <Field label="Vagas">
              <div className="relative">
                <Car className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn(fieldInput, "pl-9")}
                  value={value.vagas}
                  onChange={(e) => set("vagas", e.target.value)}
                />
              </div>
            </Field>
          </div>
        </FormSection>
      ) : null}

      {section === "condominio" ? (
        <FormSection
          icon={<Building2 className="h-3.5 w-3.5" />}
          title="Condomínio"
          description="O que aparece na visão geral do empreendimento."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field
              label="Tipo (visão geral)"
              className="col-span-2 sm:col-span-1"
            >
              <Input
                className={fieldInput}
                value={value.tipoEmpreendimento}
                onChange={(e) => set("tipoEmpreendimento", e.target.value)}
                placeholder="Condomínio"
              />
            </Field>
            <Field label="Apts. por andar">
              <Input
                className={fieldInput}
                value={value.aptsPorAndar}
                onChange={(e) => set("aptsPorAndar", e.target.value)}
              />
            </Field>
            <Field label="Andares">
              <div className="relative">
                <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn(fieldInput, "pl-9")}
                  value={value.andares}
                  onChange={(e) => set("andares", e.target.value)}
                />
              </div>
            </Field>
            <Field label="Torres">
              <Input
                className={fieldInput}
                value={value.torres}
                onChange={(e) => set("torres", e.target.value)}
              />
            </Field>
          </div>
        </FormSection>
      ) : null}

      {section === "anuncio" ? (
        <FormSection
          icon={<Megaphone className="h-3.5 w-3.5" />}
          title="Anúncio"
          description="Texto que o time e o portal veem. Pode colar o material de divulgação."
        >
          <Textarea
            className="min-h-36 rounded-xl border-border/80 bg-background shadow-sm"
            value={value.descricao}
            onChange={(e) => set("descricao", e.target.value)}
            placeholder="Excelente apartamento em Muro Alto com 105,71m²…"
          />
        </FormSection>
      ) : null}

      {section === "caracteristicas" ? (
        <FormSection
          icon={<Sparkles className="h-3.5 w-3.5" />}
          title="Características"
          description="Toque para marcar. Os grupos seguem a ficha de visão geral."
        >
          <AmenityChips
            title="Características e diferenciais"
            hint="Lazer do condomínio"
            options={IMOVEL_CARACTERISTICAS_DIFERENCIAIS}
            value={diferenciais}
            onChange={(next) =>
              set("comodidadesCondominio", [...next, ...infra])
            }
          />
          <AmenityChips
            title="Localização e infraestrutura"
            hint="Segurança e acesso"
            options={IMOVEL_LOCALIZACAO_INFRA}
            value={infra}
            onChange={(next) =>
              set("comodidadesCondominio", [...diferenciais, ...next])
            }
          />
          <AmenityChips
            title="Detalhes do imóvel"
            hint="Ambientes da unidade"
            options={IMOVEL_DETALHES_IMOVEL}
            value={value.comodidadesUnidade}
            onChange={(comodidadesUnidade) =>
              set("comodidadesUnidade", comodidadesUnidade)
            }
          />
        </FormSection>
      ) : null}

      {section === "notas" ? (
        <FormSection
          icon={<StickyNote className="h-3.5 w-3.5" />}
          title="Notas internas"
          description="Só o time vê. Não entra no anúncio nem no portal."
        >
          <Textarea
            className="min-h-24 rounded-xl border-border/80 bg-background shadow-sm"
            value={value.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Combinado com o proprietário, pendência de documentação…"
          />
        </FormSection>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          className="rounded-xl"
          disabled={isFirst}
          onClick={() => {
            const prev = sections[index - 1];
            if (prev) setSection(prev.id);
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {index + 1} de {sections.length}
        </span>
        <Button
          type="button"
          variant={isLast ? "outline" : "default"}
          className="rounded-xl"
          disabled={isLast}
          onClick={() => {
            const next = sections[index + 1];
            if (next) setSection(next.id);
          }}
        >
          Continuar
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

type ImovelFormSectionId =
  | "identificacao"
  | "endereco"
  | "foto"
  | "unidade"
  | "condominio"
  | "anuncio"
  | "caracteristicas"
  | "notas";

const FICHA_SECTIONS: Array<{
  id: ImovelFormSectionId;
  label: string;
}> = [
  { id: "foto", label: "Foto" },
  { id: "unidade", label: "Unidade" },
  { id: "condominio", label: "Condomínio" },
  { id: "anuncio", label: "Anúncio" },
  { id: "caracteristicas", label: "Características" },
  { id: "notas", label: "Notas" },
];

const CADASTRO_SECTIONS: Array<{
  id: ImovelFormSectionId;
  label: string;
}> = [
  { id: "identificacao", label: "Identificação" },
  { id: "endereco", label: "Endereço" },
  ...FICHA_SECTIONS,
];


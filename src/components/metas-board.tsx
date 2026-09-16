import { type ReactNode } from "react";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  META_ESCOPO_LABEL,
  META_PERIODO_LABEL,
  META_TIPOS,
  META_TIPO_LABEL,
  type Meta,
  type MetaTipo,
} from "@/lib/metas-api";
import type { MetasVista } from "@/lib/metas-nav-prefs";
import { cn } from "@/lib/utils";
import { FlowTrack, type FlowBarTone } from "@/components/flow-bar";
import {
  Building2,
  CalendarDays,
  FileText,
  Pencil,
  Target,
  Trash2,
  Trophy,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MetaGrupoGerente = {
  id: string;
  name: string;
  subtitle: string | null;
  metas: Meta[];
};

export type MetaGrupoCorretor = {
  corretor: NonNullable<Meta["corretor"]>;
  metas: Meta[];
};

type MetaActions = {
  canEdit: (meta: Meta) => boolean;
  onEdit: (meta: Meta) => void;
  onRemove: (meta: Meta) => void;
};

export function MetasGestorBoard({
  isAdmin,
  vista = "cards",
  filteredMetas,
  filteredImobiliaria,
  filteredGruposGerentes,
  filteredGruposCorretores,
  showImobiliaria,
  showGerentes,
  showCorretores,
  canEdit,
  onEdit,
  onRemove,
}: {
  isAdmin: boolean;
  vista?: MetasVista;
  filteredMetas: Meta[];
  filteredImobiliaria: Meta[];
  filteredGruposGerentes: MetaGrupoGerente[];
  filteredGruposCorretores: MetaGrupoCorretor[];
  showImobiliaria: boolean;
  showGerentes: boolean;
  showCorretores: boolean;
} & MetaActions) {
  const empty =
    filteredMetas.length === 0 &&
    !showImobiliaria &&
    !showGerentes &&
    filteredGruposCorretores.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-gradient-to-r from-primary/10 via-background to-background px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Acompanhamento</p>
          <p className="text-xs text-muted-foreground">
            {filteredMetas.length} meta
            {filteredMetas.length === 1 ? "" : "s"} no recorte atual
          </p>
        </div>
      </div>

      {empty ? (
        <div className="p-4">
          <EmptyState admin={isAdmin} />
        </div>
      ) : vista === "tabela" ? (
        <MetasTable
          metas={filteredMetas}
          showResponsavel
          emptyText="Nenhuma meta neste recorte."
          canEdit={canEdit}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ) : (
        <>
          {showImobiliaria ? (
            <PanelBlock
              heading={
                <SectionHeading
                  icon={Building2}
                  title="Imobiliária"
                  count={filteredImobiliaria.length}
                />
              }
            >
              {filteredImobiliaria.length > 0 ? (
                <MetaList
                  metas={filteredImobiliaria}
                  canEdit={canEdit}
                  onEdit={onEdit}
                  onRemove={onRemove}
                />
              ) : (
                <EmptyColumn text="Nenhuma meta da imobiliária neste recorte." />
              )}
            </PanelBlock>
          ) : null}

          {showGerentes ? (
            filteredGruposGerentes.length > 0 ? (
              filteredGruposGerentes.map((grupo) => (
                <PanelBlock
                  key={grupo.id}
                  heading={
                    <PersonHeading
                      name={grupo.name}
                      subtitle={grupo.subtitle}
                    />
                  }
                >
                  {grupo.metas.length > 0 ? (
                    <MetaList
                      metas={grupo.metas}
                      canEdit={canEdit}
                      onEdit={onEdit}
                      onRemove={onRemove}
                    />
                  ) : (
                    <EmptyColumn text="Nenhuma meta deste gerente neste recorte." />
                  )}
                </PanelBlock>
              ))
            ) : (
              <PanelBlock
                heading={
                  <SectionHeading
                    icon={UserRound}
                    title="Gerentes / equipes"
                    count={0}
                  />
                }
              >
                <EmptyColumn text="Nenhuma meta de gerente neste recorte." />
              </PanelBlock>
            )
          ) : null}

          {showCorretores ? (
            filteredGruposCorretores.length > 0 ? (
              filteredGruposCorretores.map(
                ({ corretor, metas: metasDoCorretor }) => (
                  <PanelBlock
                    key={corretor.id}
                    heading={
                      <PersonHeading
                        name={corretor.name}
                        subtitle={corretor.equipe?.name ?? "Sem equipe"}
                      />
                    }
                  >
                    {metasDoCorretor.length > 0 ? (
                      <MetaList
                        metas={metasDoCorretor}
                        canEdit={canEdit}
                        onEdit={onEdit}
                        onRemove={onRemove}
                      />
                    ) : (
                      <EmptyColumn text="Nenhuma meta deste corretor neste recorte." />
                    )}
                  </PanelBlock>
                ),
              )
            ) : (
              <PanelBlock
                heading={
                  <SectionHeading
                    icon={Users}
                    title="Corretores"
                    count={0}
                  />
                }
              >
                <EmptyState admin={isAdmin} />
              </PanelBlock>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

export function MetasPorOrigem({
  metas,
  vista = "cards",
  flat = false,
  headingTitle,
  canEdit,
  onEdit,
  onRemove,
}: {
  metas: Meta[];
  vista?: MetasVista;
  /** Solo: lista única sem escopo/origem de equipe. */
  flat?: boolean;
  headingTitle?: string;
} & MetaActions) {
  const metasGerencia = metas.filter(
    (meta) => meta.origem === "gerente" || meta.origem === "admin",
  );
  const metasPessoais = metas.filter((meta) => meta.origem === "pessoal");

  if (metas.length === 0) return <EmptyState />;

  if (vista === "tabela") {
    return (
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-sm">
        <MetasTable
          metas={metas}
          showResponsavel={!flat}
          emptyText="Nenhuma meta neste recorte."
          canEdit={canEdit}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>
    );
  }

  if (flat) {
    return (
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-sm">
        <PanelBlock
          heading={
            <SectionHeading
              icon={Target}
              title={headingTitle ?? "Suas metas"}
              count={metas.length}
            />
          }
        >
          <MetaList
            metas={metas}
            canEdit={canEdit}
            onEdit={onEdit}
            onRemove={onRemove}
            hideEscopo
          />
        </PanelBlock>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-sm">
      <PanelBlock
        heading={
          <SectionHeading
            icon={Users}
            title="Metas atribuídas"
            count={metasGerencia.length}
          />
        }
      >
        {metasGerencia.length > 0 ? (
          <MetaList
            metas={metasGerencia}
            canEdit={canEdit}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ) : (
          <EmptyColumn text="Nenhuma meta atribuída neste recorte." />
        )}
      </PanelBlock>
      <PanelBlock
        heading={
          <SectionHeading
            icon={Target}
            title="Metas pessoais"
            count={metasPessoais.length}
          />
        }
      >
        {metasPessoais.length > 0 ? (
          <MetaList
            metas={metasPessoais}
            canEdit={canEdit}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ) : (
          <EmptyColumn text="Nenhuma meta pessoal neste recorte." />
        )}
      </PanelBlock>
    </div>
  );
}

function MetaList({
  metas,
  canEdit,
  onEdit,
  onRemove,
  hideEscopo = false,
}: {
  metas: Meta[];
  hideEscopo?: boolean;
} & MetaActions) {
  return (
    <div className="flex flex-col gap-2">
      {metas.map((meta) => (
        <MetaCard
          key={meta.id}
          meta={meta}
          editavel={canEdit(meta)}
          onEdit={onEdit}
          onRemove={onRemove}
          hideEscopo={hideEscopo}
        />
      ))}
    </div>
  );
}

function MetasTable({
  metas,
  showResponsavel = false,
  emptyText,
  canEdit,
  onEdit,
  onRemove,
}: {
  metas: Meta[];
  showResponsavel?: boolean;
  emptyText: string;
} & MetaActions) {
  const pager = useTablePager(metas);
  if (metas.length === 0) {
    return (
      <div className="p-4">
        <EmptyColumn text={emptyText} />
      </div>
    );
  }

  return (
    <>
    <Table className="[&_th]:px-4 [&_td]:px-4 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground">
      <TableHeader>
        <TableRow>
          {showResponsavel ? <TableHead>Responsável</TableHead> : null}
          <TableHead>Tipo</TableHead>
          <TableHead>Período</TableHead>
          <TableHead>Progresso</TableHead>
          <TableHead>Realizado / meta</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead className="w-28 text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pager.pageItems.map((meta) => {
          const editavel = canEdit(meta);
          const tone = progressTone(meta.percentual);
          const barra = Math.min(100, Math.max(0, meta.percentual));
          const responsavel = metaResponsavel(meta);
          return (
            <TableRow key={meta.id} className="hover:bg-muted/40">
              {showResponsavel ? (
                <TableCell>
                  <div className="flex min-w-40 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#053647] text-[11px] font-bold text-white">
                      {iniciais(responsavel.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold leading-tight">
                        {responsavel.name}
                      </p>
                      {responsavel.subtitle ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {responsavel.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
              ) : null}
              <TableCell className="font-medium">
                {META_TIPO_LABEL[meta.tipo]}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {META_PERIODO_LABEL[meta.periodo]}
              </TableCell>
              <TableCell className="min-w-40">
                <div className="flex items-center gap-2">
                  <FlowTrack
                    percent={barra}
                    tone={tone.bar}
                    className="h-2 min-w-24 flex-1"
                  />
                  <span
                    className={cn(
                      "w-10 shrink-0 text-right text-sm font-semibold tabular-nums",
                      tone.pct,
                    )}
                  >
                    {meta.percentual}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">
                <p className="font-medium">
                  {formatValor(meta.atual, meta.tipo)} /{" "}
                  {formatValor(meta.valor, meta.tipo)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metaStatusText(meta)}
                </p>
              </TableCell>
              <TableCell>
                <Badge
                  className="h-5 border-transparent px-1.5 text-[10px]"
                  variant="secondary"
                >
                  {origemLabel(meta.origem)}
                </Badge>
                <p className="mt-1 max-w-40 truncate text-xs text-muted-foreground">
                  {meta.origem === "pessoal"
                    ? "Definida por você"
                    : `Definida por ${meta.criador.name}`}
                </p>
              </TableCell>
              <TableCell className="text-right">
                {editavel ? (
                  <div className="flex justify-end gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onEdit(meta)}
                      title="Editar"
                      aria-label="Editar meta"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemove(meta)}
                      title="Excluir"
                      aria-label="Excluir meta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <TablePager
      page={pager.page}
      totalPages={pager.totalPages}
      total={pager.total}
      onPageChange={pager.setPage}
    />
    </>
  );
}

function MetaCard({
  meta,
  editavel,
  onEdit,
  onRemove,
  hideEscopo = false,
}: {
  meta: Meta;
  editavel: boolean;
  onEdit: (meta: Meta) => void;
  onRemove: (meta: Meta) => void;
  hideEscopo?: boolean;
}) {
  const Icon = META_TIPO_ICON[meta.tipo];
  const concluida = meta.percentual >= 100;
  const tone = progressTone(meta.percentual);
  const barra = Math.min(100, Math.max(0, meta.percentual));
  const restante = Math.max(0, meta.valor - meta.atual);
  const superou = meta.atual > meta.valor;
  const origem = origemLabel(meta.origem);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-black/5 border-l-[4px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] transition hover:shadow-md",
        META_TIPO_CARD[meta.tipo],
      )}
    >
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            META_TIPO_WELL[meta.tipo],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate text-sm font-semibold leading-tight">
              {META_TIPO_LABEL[meta.tipo]}
            </p>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3 text-primary" />
              {META_PERIODO_LABEL[meta.periodo]}
            </span>
            {!hideEscopo && meta.escopo !== "corretor" && meta.escopo !== "imobiliaria" ? (
              <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
                {META_ESCOPO_LABEL[meta.escopo]}
              </span>
            ) : null}
            <span
              className={cn(
                "ml-auto shrink-0 text-sm font-semibold tabular-nums",
                tone.pct,
              )}
            >
              {meta.percentual}%
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>
              {formatValor(meta.atual, meta.tipo)} /{" "}
              {formatValor(meta.valor, meta.tipo)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                concluida
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {concluida ? <Trophy className="h-3 w-3" /> : null}
              {concluida
                ? superou
                  ? `Superou em ${formatValor(meta.atual - meta.valor, meta.tipo)}`
                  : "Meta atingida"
                : `Faltam ${formatValor(restante, meta.tipo)}`}
            </span>
            <Badge
              className="h-5 border-transparent px-1.5 text-[10px]"
              variant="secondary"
            >
              {origem}
            </Badge>
          </div>
          <FlowTrack
            percent={barra}
            tone={tone.bar}
            className="mt-1.5 h-2"
          />
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {meta.origem === "pessoal"
              ? "Definida por você"
              : `Definida por ${meta.criador.name}`}
          </p>
        </div>
        {editavel ? (
          <div className="flex shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
              onClick={() => onEdit(meta)}
              aria-label="Editar meta"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full text-destructive hover:text-destructive"
              onClick={() => onRemove(meta)}
              aria-label="Excluir meta"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PanelBlock({
  heading,
  children,
}: {
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b last:border-b-0">
      <div className="px-4 py-3">{heading}</div>
      <div className="space-y-2 px-4 pb-4">{children}</div>
    </section>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

export function MetasResumo({ metas }: { metas: Meta[] }) {
  const concluidas = metas.filter((meta) => meta.percentual >= 100).length;
  const media =
    metas.length === 0
      ? 0
      : Math.round(
          metas.reduce((soma, meta) => soma + meta.percentual, 0) /
            metas.length,
        );
  return (
    <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
      <ResumoChip label="Metas" value={String(metas.length)} />
      <ResumoChip
        label="Atingidas"
        value={String(concluidas)}
        hint={
          metas.length
            ? `${metas.length - concluidas} em andamento`
            : undefined
        }
        tone="emerald"
      />
      <ResumoChip
        label="Média"
        value={`${media}%`}
        tone={media >= 100 ? "emerald" : "blue"}
      />
    </div>
  );
}

function ResumoChip({
  label,
  value,
  hint,
  tone = "blue",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "blue" | "emerald";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        tone === "emerald"
          ? "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10"
          : "border-border/70 bg-background/70",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-bold tabular-nums tracking-tight",
          tone === "emerald" && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  count,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#079ed4] text-white">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {count != null ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function PersonHeading({
  name,
  subtitle,
}: {
  name: string;
  subtitle?: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#053647] text-[11px] font-bold text-white">
        {iniciais(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function origemLabel(origem: Meta["origem"]) {
  if (origem === "admin") return "Administração";
  if (origem === "gerente") return "Gerência";
  return "Pessoal";
}

function metaResponsavel(meta: Meta) {
  if (meta.escopo === "imobiliaria") {
    return { name: "Imobiliária", subtitle: META_ESCOPO_LABEL.imobiliaria };
  }
  if (meta.escopo === "gerente") {
    return {
      name: meta.gerente?.name ?? "Gerente",
      subtitle: meta.gerente?.equipeGerenciada?.name ?? "Sem equipe",
    };
  }
  return {
    name: meta.corretor?.name ?? "Corretor",
    subtitle: meta.corretor?.equipe?.name ?? "Sem equipe",
  };
}

function metaStatusText(meta: Meta) {
  const restante = Math.max(0, meta.valor - meta.atual);
  if (meta.percentual >= 100) {
    return meta.atual > meta.valor
      ? `Superou em ${formatValor(meta.atual - meta.valor, meta.tipo)}`
      : "Meta atingida";
  }
  return `Faltam ${formatValor(restante, meta.tipo)}`;
}

function progressTone(percentual: number): {
  bar: FlowBarTone;
  pct: string;
} {
  if (percentual >= 100) {
    return {
      bar: "emerald",
      pct: "text-emerald-700 dark:text-emerald-400",
    };
  }
  if (percentual >= 70) {
    return {
      bar: "sky",
      pct: "text-[#04648a] dark:text-[#5bc4e8]",
    };
  }
  return {
    bar: "navy",
    pct: "text-foreground",
  };
}

const META_TIPO_ICON: Record<MetaTipo, LucideIcon> = {
  vendas: Target,
  documentacoes: FileText,
  vgv: Wallet,
};

const META_TIPO_WELL: Record<MetaTipo, string> = {
  vendas: "bg-[#079ed4] text-white",
  documentacoes: "bg-[#057aa8] text-white",
  vgv: "bg-[#053647] text-white",
};

const META_TIPO_CARD: Record<MetaTipo, string> = {
  vendas: "bg-card border-border border-l-[#079ed4] text-foreground",
  documentacoes: "bg-card border-border border-l-[#057aa8] text-foreground",
  vgv: "bg-card border-border border-l-[#053647] text-foreground",
};

const META_TIPO_SOFT: Record<MetaTipo, string> = {
  vendas:
    "bg-[#079ed4]/12 text-[#04648a] dark:text-[#5bc4e8] border-[#079ed4]/30",
  documentacoes:
    "bg-[#057aa8]/12 text-[#04648a] dark:text-[#5bc4e8] border-[#057aa8]/30",
  vgv: "bg-[#053647]/10 text-[#053647] dark:bg-white/10 dark:text-slate-100 border-[#053647]/25 dark:border-white/20",
};

export function MetaTipoPicker({
  value,
  onChange,
  disabled,
  tipos = META_TIPOS,
}: {
  value: MetaTipo;
  onChange: (tipo: MetaTipo) => void;
  disabled?: boolean;
  tipos?: readonly MetaTipo[];
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-3", disabled && "opacity-80")}>
      {tipos.map((tipo) => {
        const Icon = META_TIPO_ICON[tipo];
        const selected = value === tipo;
        return (
          <button
            key={tipo}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tipo)}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left transition",
              selected
                ? cn(META_TIPO_SOFT[tipo], "shadow-sm")
                : "border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
              disabled && "cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm",
                selected
                  ? META_TIPO_WELL[tipo]
                  : "bg-background text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold leading-tight">
              {META_TIPO_LABEL[tipo]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ admin = false }: { admin?: boolean }) {
  return (
    <div className="rounded-xl border border-dashed py-10 text-center">
      <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-semibold">Nenhuma meta ativa</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {admin
          ? "Crie metas da imobiliária, por gerente ou por corretor."
          : "Defina uma meta para começar o acompanhamento."}
      </p>
    </div>
  );
}

function formatValor(valor: number, tipo: MetaTipo) {
  return tipo === "vgv"
    ? valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : valor.toLocaleString("pt-BR");
}

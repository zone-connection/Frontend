import type { ReactNode } from "react";
import {
  AlarmClockOff,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Building2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Hourglass,
  Link2,
  Mail,
  MapPin,
  Phone,
  Tag,
  Target,
  Timer,
  TriangleAlert,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { MeuLeadBadge } from "@/components/meu-lead-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ANALISE_STATUS_LABEL,
  analiseBadgeClass,
  shouldShowAnaliseStatus,
} from "@/lib/analise-status";
import { docStatus1BadgeClass } from "@/lib/documentacao-status";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import { useCatalog } from "@/lib/catalog-store";
import { brl, type Lead } from "@/lib/crm-types";
import { hasProspeccao } from "@/lib/lead-prospeccao";
import { displayEmail } from "@/lib/email";
import { getWhatsAppUrl } from "@/lib/env";
import {
  formatDateTimePt,
  formatPrazoUnidade,
  MOTIVO_SEM_MOVIMENTACAO_LABEL,
  type ProblemaMonitoramento,
} from "@/lib/lead-monitoramento";
import { phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

const PRIORIDADE_AVATAR: Record<Lead["prioridade"], string> = {
  Alta: "from-rose-400 to-rose-600 text-white ring-rose-500/25",
  Média: "from-amber-300 to-amber-500 text-amber-950 ring-amber-500/25",
  Baixa: "from-sky-400 to-sky-600 text-white ring-sky-500/25",
};

const PROBLEMA_ICON: Record<ProblemaMonitoramento["tipo"], LucideIcon> = {
  prazo_ultrapassado: AlarmClockOff,
  tarefa_atrasada: ClipboardCheck,
  sem_movimentacao: Timer,
  prazo_proximo: Hourglass,
};

const CHIP = "h-6 w-auto max-w-full rounded-full px-2.5 py-0 text-[11px]";

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function InfoCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-xl border bg-card p-3.5 shadow-sm", className)}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="mt-2 divide-y divide-border/50">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  action,
}: {
  label: string;
  value: ReactNode;
  action?: ReactNode;
}) {
  const empty =
    value === null || value === undefined || value === "" || value === "—";
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div
          className={cn(
            "text-sm break-words",
            empty ? "text-muted-foreground" : "font-medium",
          )}
        >
          {empty ? "—" : value}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Ação de contato: vira link quando há dado, senão fica desabilitada. */
function LinkAcao({
  href,
  icon: Icon,
  label,
}: {
  href: string | null;
  icon: LucideIcon;
  label: string;
}) {
  const conteudo = (
    <>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </>
  );
  if (!href) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled
      >
        {conteudo}
      </Button>
    );
  }
  return (
    <Button asChild size="sm" variant="outline" className="h-8">
      <a href={href}>{conteudo}</a>
    </Button>
  );
}

function MonitoramentoCard({
  lead,
  inatividadeFallback,
  onAddAtividade,
  children,
}: {
  lead: Lead;
  inatividadeFallback?: string;
  onAddAtividade?: () => void;
  children?: ReactNode;
}) {
  const mon = lead.monitoramento;
  if (!mon || mon.problemas.length === 0) return null;

  const isRed = mon.visual === "vermelho";
  const tempo = isRed
    ? (mon.tempoAtrasoLabel ?? mon.tempoSemMovimentacaoLabel)
    : (mon.tempoRestanteLabel ?? mon.permanenciaLabel);

  const fatos: { label: string; value: string }[] = [
    { label: "Entrada na etapa", value: formatDateTimePt(mon.stageEnteredAt) },
    {
      label: "Última movimentação",
      value: formatDateTimePt(mon.lastMovementAt),
    },
    {
      label: "Prazo da etapa",
      value: mon.prazoConfigurado
        ? formatPrazoUnidade(
            mon.prazoConfigurado.valor,
            mon.prazoConfigurado.unidade,
          ) + (mon.prazoAdiado ? " · adiado" : "")
        : "Sem prazo",
    },
    {
      label: "Alerta de inatividade",
      value: mon.inatividadeConfig
        ? formatPrazoUnidade(
            mon.inatividadeConfig.valor,
            mon.inatividadeConfig.unidade,
          )
        : (inatividadeFallback ?? "—"),
    },
  ];

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        isRed ? "border-rose-500/30" : "border-orange-400/30",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-2.5",
          isRed
            ? "bg-gradient-to-r from-rose-500/15 via-rose-500/8 to-transparent"
            : "bg-gradient-to-r from-orange-400/18 via-amber-400/10 to-transparent",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isRed
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
              : "bg-orange-500/15 text-orange-600 dark:text-orange-300",
          )}
        >
          <TriangleAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isRed ? "Precisa de atenção agora" : "Prazo próximo do vencimento"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {mon.problemas.map((problema) => problema.titulo).join(" · ")}
          </p>
        </div>
        {tempo && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              isRed
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                : "bg-orange-500/15 text-orange-600 dark:text-orange-300",
            )}
          >
            {tempo}
          </span>
        )}
      </div>

      <div className="space-y-2.5 bg-card p-3">
        <div className="space-y-2">
          {mon.problemas.map((problema) => {
            const Icon = PROBLEMA_ICON[problema.tipo];
            return (
              <div
                key={problema.tipo}
                className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{problema.titulo}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {problema.detalhe}
                  </p>
                  {problema.motivos && problema.motivos.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {problema.motivos.map((motivo) => (
                        <span
                          key={motivo}
                          className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border/70"
                        >
                          {MOTIVO_SEM_MOVIMENTACAO_LABEL[motivo]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {mon.tarefasAtrasadas && mon.tarefasAtrasadas.length > 0 && (
          <ul className="space-y-1.5">
            {mon.tarefasAtrasadas.map((tarefa) => (
              <li
                key={tarefa.id}
                className="flex items-center gap-2 rounded-lg bg-rose-500/8 px-2.5 py-1.5 text-[11px] ring-1 ring-rose-500/20"
              >
                <CalendarClock className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-300" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {tarefa.titulo}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  prazo {tarefa.prazo}
                </span>
              </li>
            ))}
          </ul>
        )}

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {fatos.map((fato) => (
            <div key={fato.label} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {fato.label}
              </dt>
              <dd className="truncate text-xs font-medium tabular-nums">
                {fato.value}
              </dd>
            </div>
          ))}
        </dl>

        {children}

        {onAddAtividade && isRed ? (
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={onAddAtividade}
          >
            <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
            Adicionar atividade
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Visão detalhada do lead/cliente: cabeçalho com identidade e ações rápidas,
 * alerta de monitoramento e os dados agrupados em cartões.
 */
export function LeadDetalheDialog({
  lead,
  open,
  onOpenChange,
  showCorretor = true,
  showMeuLeadBadge = false,
  equipe,
  inatividadeFallback,
  monitoramentoSlot,
  footer,
  onAddAtividade,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showCorretor?: boolean;
  showMeuLeadBadge?: boolean;
  /** Equipe resolvida pela tela (cai para a equipe do lead quando ausente). */
  equipe?: string | null;
  /** Prazo de inatividade do funil ativo, quando o lead não traz o próprio. */
  inatividadeFallback?: string;
  /** Ação de monitoramento (histórico de prazos / adiar). */
  monitoramentoSlot?: ReactNode;
  footer?: ReactNode;
  onAddAtividade?: () => void;
}) {
  const { funnelStages, colorByLabel } = useCatalog();
  const stage = funnelStages.find((item) => item.id === lead?.stage);
  const telefoneDigits = lead ? phoneDigits(lead.telefone) : "";
  const temTelefone = telefoneDigits.length >= 10;
  const email = lead ? displayEmail(lead.email) : "";
  const mapsQuery = lead
    ? [lead.prospeccao?.endereco, lead.bairro, lead.cidade]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(", ")
    : "";
  const temMapa = Boolean(mapsQuery);
  const isProspeccao = Boolean(lead && hasProspeccao(lead.prospeccao));

  function abrirWhatsApp() {
    if (!temTelefone) return;
    const e164 = telefoneDigits.startsWith("55")
      ? telefoneDigits
      : `55${telefoneDigits}`;
    window.open(
      getWhatsAppUrl(undefined, e164),
      "_blank",
      "noopener,noreferrer",
    );
  }

  function abrirMaps() {
    if (!temMapa) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copiarTelefone() {
    if (!lead?.telefone) return;
    try {
      await navigator.clipboard.writeText(lead.telefone);
      toast.success("Telefone copiado.");
    } catch {
      toast.error("Não foi possível copiar o telefone.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-1.5rem)] gap-0 p-0 sm:w-full",
          isProspeccao ? "max-w-3xl" : "max-w-2xl",
          "!flex !flex-col overflow-hidden",
          "!top-[max(0.75rem,2dvh)] !translate-y-0",
          "max-h-[calc(100dvh-1.5rem)]",
        )}
      >
        {lead && (
          <>
            <header className="relative shrink-0 overflow-hidden border-b bg-gradient-to-br from-primary/12 via-card to-card px-4 pt-5 pb-4 sm:px-6">
              <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-bold ring-4",
                    PRIORIDADE_AVATAR[lead.prioridade],
                  )}
                >
                  {initials(lead.nome)}
                </span>
                <div className="min-w-0 flex-1 pr-6">
                  <DialogTitle className="truncate text-base tracking-tight sm:text-lg">
                    {lead.nome}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Detalhes de {lead.nome}
                  </DialogDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        CHIP,
                        lead.tipo === "cliente" &&
                          "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
                      )}
                    >
                      {lead.tipo === "cliente"
                        ? "Cliente da carteira"
                        : "Lead de captação"}
                    </Badge>
                    {stage && (
                      <Badge
                        className={cn(
                          catalogColorBadgeClass(stage.color),
                          CHIP,
                        )}
                        style={catalogColorBadgeStyle(stage.color)}
                        title={stage.name}
                      >
                        {stage.name}
                      </Badge>
                    )}
                    <Badge
                      className={cn(
                        CHIP,
                        "border-transparent",
                        lead.prioridade === "Alta" &&
                          "bg-destructive/15 text-destructive hover:bg-destructive/20",
                        lead.prioridade === "Média" &&
                          "bg-amber-500/15 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300",
                        lead.prioridade === "Baixa" &&
                          "bg-sky-500/15 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
                      )}
                    >
                      Prioridade {lead.prioridade}
                    </Badge>
                    {lead.documentacaoStatus1?.trim() ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          docStatus1BadgeClass(lead.documentacaoStatus1),
                          CHIP,
                        )}
                        title={`Documentação · Status 1 · ${lead.documentacaoStatus1.trim()}`}
                      >
                        {lead.documentacaoStatus1.trim()}
                      </Badge>
                    ) : null}
                    {lead.analise &&
                      shouldShowAnaliseStatus(lead.analise.status) && (
                        <Badge
                          variant="outline"
                          className={cn(
                            analiseBadgeClass(lead.analise.status),
                            CHIP,
                          )}
                        >
                          {ANALISE_STATUS_LABEL[lead.analise.status]}
                        </Badge>
                      )}
                    {showMeuLeadBadge && <MeuLeadBadge />}
                  </div>
                </div>
              </div>

              <div className="relative mt-3.5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-[#25D366] text-white hover:bg-[#25D366]/90"
                  disabled={!temTelefone}
                  onClick={abrirWhatsApp}
                >
                  <FaWhatsapp className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  WhatsApp
                </Button>
                <LinkAcao
                  href={email ? `mailto:${email}` : null}
                  icon={Mail}
                  label="E-mail"
                />
                {isProspeccao ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={!temMapa}
                    onClick={abrirMaps}
                  >
                    <MapPin className="mr-1.5 h-3.5 w-3.5" />
                    Maps
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-muted-foreground"
                  disabled={!lead.telefone}
                  onClick={() => void copiarTelefone()}
                  title="Copiar telefone"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [scrollbar-gutter:stable] [scrollbar-width:thin]">
              <div className="space-y-3 px-4 py-4 sm:px-6 sm:py-5">
                <MonitoramentoCard
                  lead={lead}
                  inatividadeFallback={inatividadeFallback}
                  onAddAtividade={onAddAtividade}
                >
                  {monitoramentoSlot}
                </MonitoramentoCard>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    icon={isProspeccao ? Building2 : Phone}
                    title={isProspeccao ? "Empresa" : "Contato"}
                  >
                    <InfoRow
                      label="Telefone"
                      value={lead.telefone}
                      action={
                        <button
                          type="button"
                          title="Abrir WhatsApp"
                          aria-label="Abrir WhatsApp"
                          disabled={!temTelefone}
                          className="shrink-0 rounded-md p-1.5 text-[#25D366] hover:bg-[#25D366]/15 disabled:pointer-events-none disabled:opacity-40"
                          onClick={abrirWhatsApp}
                        >
                          <FaWhatsapp className="h-4 w-4" aria-hidden />
                        </button>
                      }
                    />
                    <InfoRow label="E-mail" value={email} />
                    {isProspeccao ? (
                      <InfoRow
                        label="Quem abordar"
                        value={lead.prospeccao?.quemAbordar}
                      />
                    ) : null}
                    <InfoRow
                      label="Origem"
                      value={
                        lead.origem ? (
                          <Badge
                            className={cn(
                              catalogColorBadgeClass(
                                colorByLabel("origem", lead.origem),
                              ),
                              CHIP,
                            )}
                            style={catalogColorBadgeStyle(
                              colorByLabel("origem", lead.origem),
                            )}
                            title={lead.origem}
                          >
                            {lead.origem}
                          </Badge>
                        ) : null
                      }
                    />
                  </InfoCard>

                  {isProspeccao ? (
                    <InfoCard icon={MapPin} title="Local">
                      <InfoRow label="Município" value={lead.cidade} />
                      <InfoRow label="Bairro / Região" value={lead.bairro} />
                      <InfoRow
                        label="Endereço"
                        value={lead.prospeccao?.endereco}
                        action={
                          temMapa ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 shrink-0"
                              title="Abrir no Google Maps"
                              onClick={abrirMaps}
                            >
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Maps
                            </Button>
                          ) : undefined
                        }
                      />
                    </InfoCard>
                  ) : (
                    <InfoCard icon={Wallet} title="Perfil e renda">
                      <InfoRow
                        label="Renda mensal"
                        value={lead.renda != null ? brl(lead.renda) : null}
                      />
                      <InfoRow label="Tipo de renda" value={lead.tipoRenda} />
                      <InfoRow label="Estado civil" value={lead.estadoCivil} />
                      <InfoRow label="CPF" value={lead.cpf} />
                      <InfoRow label="RG" value={lead.rg} />
                      <InfoRow label="Endereço" value={lead.endereco} />
                      <InfoRow label="CEP" value={lead.cep} />
                      <InfoRow label="Interesse" value={lead.interesse} />
                    </InfoCard>
                  )}

                  {isProspeccao ? (
                    <>
                      <InfoCard icon={Globe} title="Digital">
                        <InfoRow label="Site" value={lead.prospeccao?.site} />
                        <InfoRow
                          label="Instagram"
                          value={lead.prospeccao?.instagram}
                        />
                        <InfoRow
                          label="LinkedIn"
                          value={lead.prospeccao?.linkedin}
                        />
                      </InfoCard>
                      <InfoCard icon={Link2} title="Operação">
                        <InfoRow
                          label="Atuação / Serviços"
                          value={lead.prospeccao?.atuacao}
                        />
                        <InfoRow
                          label="Lançamentos"
                          value={lead.prospeccao?.lancamentos}
                        />
                        <InfoRow label="Usados" value={lead.prospeccao?.usados} />
                        <InfoRow
                          label="Locação"
                          value={lead.prospeccao?.locacao}
                        />
                        <InfoRow
                          label="Administração"
                          value={lead.prospeccao?.administracao}
                        />
                        <InfoRow
                          label="CRM identificado"
                          value={lead.prospeccao?.crmIdentificado}
                        />
                        <InfoRow
                          label="Tecnologia"
                          value={lead.prospeccao?.tecnologia}
                        />
                        <InfoRow
                          label="Sinais"
                          value={lead.prospeccao?.sinais}
                        />
                      </InfoCard>
                      <InfoCard icon={Target} title="Fit">
                        <InfoRow
                          label="Produto indicado"
                          value={lead.prospeccao?.produtoIndicado}
                        />
                        <InfoRow
                          label="Fit"
                          value={
                            lead.prospeccao?.fit != null
                              ? String(lead.prospeccao.fit)
                              : null
                          }
                        />
                        <InfoRow
                          label="Motivo do fit"
                          value={lead.prospeccao?.motivoFit}
                        />
                      </InfoCard>
                    </>
                  ) : (
                    <InfoCard icon={MapPin} title="Localização e imóvel">
                      <InfoRow label="Cidade" value={lead.cidade} />
                      <InfoRow label="Bairro" value={lead.bairro} />
                      {lead.construtora && (
                        <InfoRow
                          label="Construtora"
                          value={lead.construtora.nome}
                        />
                      )}
                      {lead.empreendimento && (
                        <InfoRow
                          label="Empreendimento"
                          value={lead.empreendimento.nome}
                        />
                      )}
                    </InfoCard>
                  )}

                  <InfoCard
                    icon={Briefcase}
                    title={isProspeccao ? "Funil" : "Atendimento"}
                  >
                    {showCorretor && (
                      <InfoRow
                        label="Corretor"
                        value={
                          <span className="flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {lead.corretor}
                          </span>
                        }
                      />
                    )}
                    {showCorretor && (equipe ?? lead.equipe) ? (
                      <InfoRow label="Equipe" value={equipe ?? lead.equipe} />
                    ) : null}
                    <InfoRow
                      label="Cadastrado em"
                      value={
                        lead.createdAt ? formatDateTimePt(lead.createdAt) : null
                      }
                    />
                    <InfoRow
                      label="Atualizado em"
                      value={
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {lead.updatedAt}
                        </span>
                      }
                    />
                  </InfoCard>

                  {lead.tags.length > 0 && (
                    <InfoCard icon={Tag} title="Tags" className="sm:col-span-2">
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {lead.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className={cn(
                              catalogColorBadgeClass(colorByLabel("tag", tag)),
                              CHIP,
                            )}
                            style={catalogColorBadgeStyle(
                              colorByLabel("tag", tag),
                            )}
                            title={tag}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </InfoCard>
                  )}

                  {lead.analise?.parecer &&
                    shouldShowAnaliseStatus(lead.analise.status) && (
                      <InfoCard
                        icon={ClipboardCheck}
                        title="Parecer da análise"
                        className="sm:col-span-2"
                      >
                        <p className="pt-2 text-sm whitespace-pre-wrap text-muted-foreground">
                          {lead.analise.parecer}
                        </p>
                      </InfoCard>
                    )}
                </div>
              </div>
            </div>

            {footer}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

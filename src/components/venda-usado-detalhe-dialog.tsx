import type { ReactNode } from "react";
import {
  Briefcase,
  Building2,
  Clock,
  Copy,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import { OperacaoMonitoramentoCard } from "@/components/operacao-funil-alerta";
import { CAPTACAO_IMOVEL_TIPO_LABEL, imovelCapaUrl } from "@/lib/captacao-api";
import { displayEmail } from "@/lib/email";
import { getWhatsAppUrl } from "@/lib/env";
import {
  formatBrl,
  VENDA_STATUS_LABEL,
  type VendaUsado,
} from "@/lib/imoveis-usados-api";
import { formatDateTimePt } from "@/lib/lead-monitoramento";
import { phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

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
      <Button type="button" size="sm" variant="outline" className="h-8" disabled>
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

function proprietarioContato(venda: VendaUsado) {
  const raw = venda.imovel.proprietario as
    | { id: string; nome: string; telefone?: string; email?: string }
    | undefined;
  return {
    nome: raw?.nome ?? "Proprietário",
    telefone: raw?.telefone ?? "",
    email: raw?.email ?? "",
    id: raw?.id,
  };
}

function imovelEndereco(venda: VendaUsado) {
  const { logradouro, numero, bairro, cidade, estado } = venda.imovel;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const cidadeUf = [cidade, estado].filter(Boolean).join("/");
  return [rua, bairro, cidadeUf].filter(Boolean).join(" · ") || null;
}

export function VendaUsadoDetalheDialog({
  venda,
  open,
  onOpenChange,
  footer,
}: {
  venda: VendaUsado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: ReactNode;
}) {
  const contato = venda ? proprietarioContato(venda) : null;
  const telefone = contato?.telefone ?? "";
  const telefoneDigits = phoneDigits(telefone);
  const temTelefone = telefoneDigits.length >= 10;
  const email = contato ? displayEmail(contato.email) : "";

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

  async function copiarTelefone() {
    if (!telefone) return;
    try {
      await navigator.clipboard.writeText(telefone);
      toast.success("Telefone copiado.");
    } catch {
      toast.error("Não foi possível copiar o telefone.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-1.5rem)] max-w-2xl gap-0 p-0 sm:w-full",
          "!flex !flex-col overflow-hidden",
          "!top-[max(0.75rem,2dvh)] !translate-y-0",
          "max-h-[calc(100dvh-1.5rem)]",
        )}
      >
        {venda && contato && (
          <>
            {imovelCapaUrl(venda.imovel) ? (
              <img
                src={imovelCapaUrl(venda.imovel) ?? ""}
                alt=""
                className="h-36 w-full shrink-0 object-cover"
              />
            ) : null}
            <header className="relative shrink-0 overflow-hidden border-b bg-gradient-to-br from-primary/12 via-card to-card px-4 pt-5 pb-4 sm:px-6">
              <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-base font-bold text-white ring-4 ring-sky-500/25">
                  {initials(contato.nome)}
                </span>
                <div className="min-w-0 flex-1 pr-6">
                  <DialogTitle className="truncate text-base tracking-tight sm:text-lg">
                    {contato.nome}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Detalhes de {contato.nome}
                  </DialogDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={CHIP}>
                      Venda de usado
                    </Badge>
                    <Badge
                      className={cn(
                        catalogColorBadgeClass(venda.funilEtapa.color),
                        CHIP,
                      )}
                      style={catalogColorBadgeStyle(venda.funilEtapa.color)}
                      title={venda.funilEtapa.label}
                    >
                      {venda.funilEtapa.label}
                    </Badge>
                    <Badge
                      className={cn(
                        CHIP,
                        "border-transparent",
                        venda.status === "vendido" &&
                          "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
                        venda.status === "reservado" &&
                          "bg-amber-500/15 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300",
                        venda.status === "indisponivel" &&
                          "bg-destructive/15 text-destructive hover:bg-destructive/20",
                        venda.status === "disponivel" &&
                          "bg-sky-500/15 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
                      )}
                    >
                      {VENDA_STATUS_LABEL[venda.status]}
                    </Badge>
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
                  href={temTelefone ? `tel:+${telefoneDigits}` : null}
                  icon={Phone}
                  label="Ligar"
                />
                <LinkAcao
                  href={email ? `mailto:${email}` : null}
                  icon={Mail}
                  label="E-mail"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-muted-foreground"
                  disabled={!telefone}
                  onClick={() => void copiarTelefone()}
                  title="Copiar telefone"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [scrollbar-gutter:stable] [scrollbar-width:thin]">
              <div className="space-y-3 px-4 py-4 sm:px-6 sm:py-5">
                <OperacaoMonitoramentoCard
                  monitoramento={venda.monitoramento}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard icon={Phone} title="Contato">
                    <InfoRow
                      label="Telefone"
                      value={telefone}
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
                    <InfoRow
                      label="Interessados"
                      value={
                        venda._count?.vinculos != null
                          ? String(venda._count.vinculos)
                          : venda.vinculos
                            ? String(venda.vinculos.length)
                            : null
                      }
                    />
                  </InfoCard>

                  <InfoCard icon={Wallet} title="Valores">
                    <InfoRow
                      label="Preço de venda"
                      value={formatBrl(venda.precoVenda)}
                    />
                    <InfoRow
                      label="Valor do imóvel"
                      value={formatBrl(venda.imovel.valor)}
                    />
                    <InfoRow
                      label="Status"
                      value={VENDA_STATUS_LABEL[venda.status]}
                    />
                    <InfoRow
                      label="Disponibilizado em"
                      value={formatDateTimePt(venda.dataDisponibilizacao)}
                    />
                  </InfoCard>

                  <InfoCard icon={MapPin} title="Imóvel">
                    <InfoRow label="Título" value={venda.imovel.titulo} />
                    <InfoRow
                      label="Tipo"
                      value={CAPTACAO_IMOVEL_TIPO_LABEL[venda.imovel.tipo]}
                    />
                    <InfoRow label="Endereço" value={imovelEndereco(venda)} />
                    <InfoRow
                      label="Área"
                      value={
                        venda.imovel.area != null
                          ? `${venda.imovel.area} m²`
                          : null
                      }
                    />
                  </InfoCard>

                  <InfoCard icon={Briefcase} title="Atendimento">
                    <InfoRow
                      label="Responsável"
                      value={
                        <span className="flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {venda.responsavel.name}
                        </span>
                      }
                    />
                    <InfoRow
                      label="Observações"
                      value={venda.observacoes || null}
                    />
                    <InfoRow
                      label="Imóvel"
                      value={
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {venda.imovel.cidade || venda.imovel.titulo}
                        </span>
                      }
                    />
                    <InfoRow
                      label="Atualizado"
                      value={
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {formatDateTimePt(venda.dataDisponibilizacao)}
                        </span>
                      }
                    />
                  </InfoCard>
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

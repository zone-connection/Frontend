import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  Phone,
  TriangleAlert,
  User,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import { useCatalog } from "@/lib/catalog-store";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  formatBrl,
  type Captacao,
} from "@/lib/captacao-api";
import { displayEmail } from "@/lib/email";
import { getWhatsAppUrl } from "@/lib/env";
import { formatDateTimePt } from "@/lib/lead-monitoramento";
import { phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

const PRIORIDADE_AVATAR = {
  Alta: "from-rose-400 to-rose-600 text-white",
  Média: "from-amber-300 to-amber-500 text-amber-950",
  Baixa: "from-sky-400 to-sky-600 text-white",
} as const;

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function DataField({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  const empty =
    children === null ||
    children === undefined ||
    children === "" ||
    children === "—";
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </p>
      <div
        className={cn(
          "mt-0.5 pl-[22px] text-sm",
          empty && "text-muted-foreground",
        )}
      >
        {empty ? "—" : children}
      </div>
    </div>
  );
}

export type CaptacaoDetalheAction = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
};

function ActionRow({ action }: { action: CaptacaoDetalheAction }) {
  const Icon = action.icon;
  const className = cn(
    "flex w-full items-center gap-3 rounded-xl border bg-background/40 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
    action.destructive && "text-destructive",
  );
  const inner = (
    <>
      {Icon ? (
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : null}
      <span className="min-w-0 flex-1 font-medium">{action.label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );
  if (action.href) {
    return (
      <Link to={action.href as never} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {inner}
    </button>
  );
}

function imovelEndereco(item: Captacao) {
  const { logradouro, numero, bairro, cidade, estado } = item.imovel;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const cidadeUf = [cidade, estado].filter(Boolean).join("/");
  return [rua, bairro, cidadeUf].filter(Boolean).join(" · ") || "—";
}

export function CaptacaoDetalheDialog({
  captacao,
  open,
  onOpenChange,
  sidebarActions,
  stageControl,
  perdaAction,
}: {
  captacao: Captacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sidebarActions?: CaptacaoDetalheAction[];
  stageControl?: ReactNode;
  perdaAction?: { label: string; onClick: () => void };
}) {
  const { colorByLabel } = useCatalog();
  const [tab, setTab] = useState("info");
  const telefone = captacao?.proprietario.telefone ?? "";
  const telefoneDigits = phoneDigits(telefone);
  const temTelefone = telefoneDigits.length >= 10;
  const email = captacao ? displayEmail(captacao.proprietario.email ?? "") : "";
  const prioridade = captacao?.exclusividade ? "Alta" : "Média";
  const mon = captacao?.monitoramento;
  const atrasado = mon?.visual === "vermelho";
  const statusLabel = atrasado
    ? "Atrasado"
    : mon?.visual === "laranja"
      ? "Prazo próximo"
      : "Em dia";

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

  function ligar() {
    if (!temTelefone) return;
    window.location.href = `tel:+55${telefoneDigits}`;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setTab("info");
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "w-[calc(100vw-1.25rem)] gap-0 overflow-hidden rounded-2xl border bg-card p-0 sm:max-w-5xl",
          "!flex !flex-col",
          "!top-[max(0.5rem,1.5dvh)] !translate-y-0",
          "max-h-[calc(100dvh-1rem)]",
        )}
      >
        {captacao ? (
          <>
            <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold",
                    PRIORIDADE_AVATAR[prioridade],
                  )}
                >
                  {initials(captacao.proprietario.nome)}
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    {captacao.proprietario.nome}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Detalhes de {captacao.proprietario.nome}
                  </DialogDescription>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Proprietário
                    {captacao.funilEtapa.label
                      ? ` · ${captacao.funilEtapa.label}`
                      : ""}
                    {captacao.responsavel.name
                      ? ` · ${captacao.responsavel.name}`
                      : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {captacao.canceladoPeloProprietario ? (
                      <Badge className="h-5 rounded-full border-transparent bg-red-600 px-2 text-[10px] text-white">
                        Cancelado pelo proprietário
                      </Badge>
                    ) : null}
                    {captacao.sugestaoProprietario ? (
                      <Badge className="h-5 rounded-full border-transparent bg-violet-600 px-2 text-[10px] text-white">
                        Sugestão do proprietário
                      </Badge>
                    ) : null}
                    <Badge
                      className={cn(
                        catalogColorBadgeClass(captacao.funilEtapa.color),
                        "h-5 rounded-full px-2 text-[10px]",
                      )}
                      style={catalogColorBadgeStyle(captacao.funilEtapa.color)}
                    >
                      {captacao.funilEtapa.label}
                    </Badge>
                    {captacao.exclusividade ? (
                      <Badge
                        variant="outline"
                        className="h-5 rounded-full px-2 text-[10px] text-destructive"
                      >
                        Exclusividade
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              {mon && mon.problemas.length > 0 ? (
                <div
                  className={cn(
                    "flex max-w-sm items-start gap-2 rounded-xl px-3 py-2 text-xs",
                    atrasado
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-200"
                      : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                  )}
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">{statusLabel}</p>
                    <p className="text-[11px] opacity-90">
                      {mon.problemas[0]?.titulo}
                      {mon.tempoAtrasoLabel
                        ? ` · ${mon.tempoAtrasoLabel}`
                        : mon.tempoSemMovimentacaoLabel
                          ? ` · ${mon.tempoSemMovimentacaoLabel}`
                          : ""}
                    </p>
                  </div>
                </div>
              ) : null}
            </header>

            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_17.5rem]">
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-width:thin]">
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="mb-4 h-10 w-full justify-start gap-1 rounded-full bg-muted/60 p-1 sm:w-auto">
                    <TabsTrigger value="info" className="rounded-full px-3">
                      <UserRound className="mr-1.5 h-3.5 w-3.5" />
                      Informações
                    </TabsTrigger>
                    <TabsTrigger value="hist" className="rounded-full px-3">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      Histórico
                    </TabsTrigger>
                    <TabsTrigger value="imovel" className="rounded-full px-3">
                      <MapPin className="mr-1.5 h-3.5 w-3.5" />
                      Imóvel
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-0 space-y-3">
                    <section className="rounded-xl border bg-background/30 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4 text-primary" />
                        Dados do proprietário
                      </h3>
                      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        <DataField icon={Phone} label="Telefone">
                          <div className="flex items-center gap-1">
                            <span className="min-w-0 flex-1">
                              {telefone || "—"}
                            </span>
                            {temTelefone ? (
                              <button
                                type="button"
                                className="shrink-0 p-0.5 text-[#25D366]"
                                aria-label="WhatsApp"
                                onClick={abrirWhatsApp}
                              >
                                <FaWhatsapp className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </DataField>
                        <DataField icon={Wallet} label="Valor pretendido">
                          {formatBrl(captacao.valorPretendido)}
                        </DataField>
                        <DataField icon={Mail} label="E-mail">
                          {email || "—"}
                        </DataField>
                        <DataField icon={Wallet} label="Valor de avaliação">
                          {formatBrl(captacao.valorAvaliacao)}
                        </DataField>
                        <DataField icon={User} label="Origem">
                          {captacao.origem ? (
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs",
                                catalogColorBadgeClass(
                                  colorByLabel("origem", captacao.origem),
                                ),
                              )}
                              style={catalogColorBadgeStyle(
                                colorByLabel("origem", captacao.origem),
                              )}
                            >
                              {captacao.origem}
                            </span>
                          ) : (
                            "—"
                          )}
                        </DataField>
                        <DataField icon={Building2} label="Exclusividade">
                          {captacao.exclusividade ? "Sim" : "Não"}
                        </DataField>
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent value="hist" className="mt-0">
                    {(captacao.historicos ?? []).length === 0 ? (
                      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Nenhum histórico registrado nesta captação.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {(captacao.historicos ?? []).map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl border bg-background/40 p-3 text-sm"
                          >
                            <p className="text-[11px] text-muted-foreground">
                              {item.autor?.name ?? "Sistema"} ·{" "}
                              {formatDateTimePt(item.createdAt)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">
                              {item.texto}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="imovel" className="mt-0">
                    <section className="rounded-xl border bg-background/30 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-4 w-4 text-primary" />
                        Imóvel
                      </h3>
                      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        <DataField icon={Building2} label="Título">
                          {captacao.imovel.titulo}
                        </DataField>
                        <DataField icon={Building2} label="Tipo">
                          {CAPTACAO_IMOVEL_TIPO_LABEL[captacao.imovel.tipo]}
                        </DataField>
                        <DataField icon={MapPin} label="Endereço">
                          {imovelEndereco(captacao)}
                        </DataField>
                        <DataField icon={Wallet} label="Valor do imóvel">
                          {formatBrl(captacao.imovel.valor)}
                        </DataField>
                        <DataField icon={Building2} label="Área">
                          {captacao.imovel.area != null
                            ? `${captacao.imovel.area} m²`
                            : "—"}
                        </DataField>
                        <DataField icon={UserRound} label="Responsável">
                          {captacao.responsavel.name}
                        </DataField>
                      </div>
                    </section>
                  </TabsContent>
                </Tabs>
              </div>

              <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-t p-4 lg:border-t-0 lg:border-l">
                {(sidebarActions ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {sidebarActions!.map((action) => (
                      <ActionRow key={action.label} action={action} />
                    ))}
                  </div>
                ) : null}
                {stageControl ? (
                  <div className="rounded-xl border bg-background/40 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Etapa atual
                    </p>
                    {stageControl}
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                  <span className="text-sm">Status da captação</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      atrasado &&
                        "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-200",
                    )}
                  >
                    {atrasado ? (
                      <TriangleAlert className="mr-1 h-3 w-3" />
                    ) : null}
                    {statusLabel}
                  </Badge>
                </div>
                <div className="rounded-xl border bg-background/40 p-3 text-sm">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Resumo rápido
                  </p>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Origem</dt>
                      <dd>{captacao.origem || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Prioridade</dt>
                      <dd
                        className={
                          prioridade === "Alta" ? "text-destructive" : ""
                        }
                      >
                        {prioridade}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Pretendido</dt>
                      <dd>{formatBrl(captacao.valorPretendido)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Criado em</dt>
                      <dd>{formatDateTimePt(captacao.createdAt)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    className="h-10 bg-[#22c55e] text-white hover:bg-[#16a34a]"
                    disabled={!temTelefone}
                    onClick={abrirWhatsApp}
                  >
                    <FaWhatsapp className="mr-1.5 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={!temTelefone}
                    onClick={ligar}
                  >
                    <Phone className="mr-1.5 h-4 w-4" />
                    Ligar
                  </Button>
                </div>
                {perdaAction ? (
                  <button
                    type="button"
                    className="text-center text-xs text-destructive hover:underline"
                    onClick={perdaAction.onClick}
                  >
                    {perdaAction.label}
                  </button>
                ) : null}
              </aside>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

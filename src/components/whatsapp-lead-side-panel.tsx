import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarPlus,
  ClipboardList,
  Home,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  StickyNote,
  User,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mediaSrc } from "@/components/whatsapp-chat-look";
import { ApiError } from "@/lib/api";
import { useCatalog } from "@/lib/catalog-store";
import {
  brl,
  interessesAtivos,
  rotuloInteresseAlvo,
  type Lead,
} from "@/lib/crm-types";
import { displayEmail } from "@/lib/email";
import { fetchLeadById, mapApiLead } from "@/lib/leads-api";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDay(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

function prettyLabel(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  if (!clean || /^a definir$/i.test(clean) || clean === "—") return "";
  if (clean === clean.toUpperCase() && /[A-ZÁÉÍÓÚÃÕÂÊÔÇ]/.test(clean)) {
    return clean
      .toLocaleLowerCase("pt-BR")
      .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
  }
  return clean;
}

function visibleEmail(email: string | null | undefined) {
  const shown = displayEmail(email);
  if (!shown || /@whatsapp\.ozap\.local$/i.test(shown)) return "";
  return shown;
}

export function WhatsappChatAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-10 w-10 shrink-0", className)}>
      {src ? <AvatarImage src={mediaSrc(src)} alt="" /> : null}
      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
        {conversationInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function WhatsappLeadSidePanel({
  leadId,
  avatarUrl,
  name,
  onOpenFicha,
}: {
  leadId: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  onOpenFicha?: () => void;
}) {
  const { funnelStages } = useCatalog();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"cliente" | "imovel" | "atividades">("cliente");

  useEffect(() => {
    setTab("cliente");
    if (!leadId) {
      setLead(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchLeadById(leadId)
      .then((row) => {
        if (!cancelled) setLead(mapApiLead(row));
      })
      .catch((err) => {
        if (!cancelled) {
          setLead(null);
          toast.error(errorMessage(err, "Não foi possível carregar o lead."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (!leadId) {
    return (
      <aside className="flex min-h-0 w-[min(22rem,100%)] shrink-0 flex-col border-l bg-background">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
          <User className="h-8 w-8 opacity-50" />
          <p>Esta conversa ainda não está ligada a um lead do CRM.</p>
        </div>
      </aside>
    );
  }

  const stageName = prettyLabel(
    funnelStages.find((item) => item.id === lead?.stage)?.name ?? lead?.stage,
  );
  const interesses = interessesAtivos(lead?.interesses);
  const place = [prettyLabel(lead?.cidade), prettyLabel(lead?.bairro)]
    .filter(Boolean)
    .join(" · ");
  const chips = [
    lead?.interesse,
    lead?.orcamentoMax ? `Até ${brl(lead.orcamentoMax)}` : null,
    place || null,
  ].filter(Boolean) as string[];
  const email = visibleEmail(lead?.email);
  const phone = lead ? formatPhone(lead.telefone) || lead.telefone : "";
  const created = formatDay(lead?.createdAt);
  const corretor = prettyLabel(lead?.corretor);

  return (
    <aside className="flex min-h-0 w-[min(22rem,100%)] shrink-0 flex-col overflow-hidden border-l bg-muted/40">
      <div className="grid grid-cols-3 gap-1 border-b bg-background p-2">
        {(
          [
            ["cliente", "Cliente"],
            ["imovel", "Imóvel"],
            ["atividades", "Atividades"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              tab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
        {loading && !lead ? (
          <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando ficha…
          </p>
        ) : lead ? (
          <div className="space-y-3">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <WhatsappChatAvatar
                  name={lead.nome || name || "Lead"}
                  src={avatarUrl}
                  className="h-14 w-14 text-base ring-4 ring-primary/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold tracking-tight">
                    {prettyLabel(lead.nome) || lead.nome}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FaWhatsapp className="h-3.5 w-3.5 text-emerald-500" />
                    {phone}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                    {lead.tipo === "cliente" ? "Cliente" : "Lead"}
                  </span>
                </div>
              </div>
            </div>

            {tab === "cliente" ? (
              <>
                <PanelCard
                  title="Informações"
                  action="Editar"
                  onAction={onOpenFicha}
                >
                  <div className="divide-y">
                    <InfoRow icon={Phone} label="Telefone" value={phone} />
                    {email ? (
                      <InfoRow icon={Mail} label="E-mail" value={email} />
                    ) : null}
                    {stageName ? (
                      <InfoRow
                        icon={ClipboardList}
                        label="Etapa do funil"
                        value={stageName}
                      />
                    ) : null}
                    {corretor ? (
                      <InfoRow icon={User} label="Corretor" value={corretor} />
                    ) : null}
                    {created ? (
                      <InfoRow icon={CalendarPlus} label="Criado em" value={created} />
                    ) : null}
                  </div>
                </PanelCard>
                <PanelCard title="Interesses">
                  {chips.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 px-3 py-3">
                      {chips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <EmptyLine text="Nenhum interesse preenchido." />
                  )}
                </PanelCard>
              </>
            ) : null}

            {tab === "imovel" ? (
              <PanelCard title="Imóveis de interesse" leadId={lead.id}>
                {interesses.length === 0 && !lead.empreendimento ? (
                  <EmptyLine text="Nenhum imóvel vinculado." />
                ) : (
                  <ul className="space-y-2 p-3">
                    {lead.empreendimento ? (
                      <PropertyCard
                        title={lead.empreendimento.nome}
                        place={prettyLabel(lead.empreendimento.cidade)}
                        icon={Building2}
                      />
                    ) : null}
                    {interesses.slice(0, 4).map((item) => (
                      <PropertyCard
                        key={item.id}
                        title={rotuloInteresseAlvo(item)}
                        icon={Home}
                      />
                    ))}
                  </ul>
                )}
              </PanelCard>
            ) : null}

            {tab === "atividades" ? (
              <PanelCard title="Notas" action="Abrir ficha" onAction={onOpenFicha}>
                <p className="flex items-start gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Anotações e triagem ficam na ficha completa do lead.
                </p>
              </PanelCard>
            ) : null}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Não foi possível abrir este lead.
          </p>
        )}
      </div>
    </aside>
  );
}

function PanelCard({
  title,
  action,
  onAction,
  leadId,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  leadId?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between px-3 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        {leadId ? (
          <Link
            to="/funil"
            search={{ lead: leadId }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver todos
          </Link>
        ) : action ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={onAction}
          >
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PropertyCard({
  title,
  place,
  icon: Icon,
}: {
  title: string;
  place?: string;
  icon: typeof Home;
}) {
  return (
    <li className="rounded-xl bg-muted/40 px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 truncate">{title}</span>
      </p>
      {place ? (
        <p className="mt-1 flex items-center gap-1 pl-6 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {place}
        </p>
      ) : null}
    </li>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="px-3 py-3 text-sm text-muted-foreground">{text}</p>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}

export function WhatsappConversationActions({
  leadId,
  onOpenFicha,
}: {
  leadId: string | null;
  onOpenFicha?: () => void;
}) {
  function soon(label: string) {
    toast.message(`${label} ainda não está disponível nesta conversa.`);
  }
  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t bg-background px-2 py-1.5 [scrollbar-width:none]">
      <ActionChip
        icon={Pencil}
        label="Atualizar lead"
        onClick={() => (leadId ? onOpenFicha?.() : soon("Atualizar lead"))}
      />
      {leadId ? (
        <Link
          to="/agenda"
          className={chipClass}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Nova tarefa
        </Link>
      ) : (
        <ActionChip
          icon={CalendarPlus}
          label="Nova tarefa"
          onClick={() => soon("Nova tarefa")}
        />
      )}
      {leadId ? (
        <Link to="/propostas" className={chipClass}>
          <ClipboardList className="h-3.5 w-3.5" />
          Criar proposta
        </Link>
      ) : (
        <ActionChip
          icon={ClipboardList}
          label="Criar proposta"
          onClick={() => soon("Criar proposta")}
        />
      )}
      {leadId ? (
        <Link to="/funil" search={{ lead: leadId }} className={chipClass}>
          <Home className="h-3.5 w-3.5" />
          Vincular imóvel
        </Link>
      ) : (
        <ActionChip
          icon={Home}
          label="Vincular imóvel"
          onClick={() => soon("Vincular imóvel")}
        />
      )}
    </div>
  );
}

const chipClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

function ActionChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={chipClass} onClick={onClick}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function conversationInitials(name: string) {
  return initials(name) || "W";
}

export function WhatsappListFilters({
  value,
  counts,
  onChange,
}: {
  value: InboxFilter;
  counts: Record<InboxFilter, number>;
  onChange: (value: InboxFilter) => void;
}) {
  const items: Array<{ id: InboxFilter; label: string }> = [
    { id: "todas", label: "Todas" },
    { id: "nao_lidas", label: "Não lidas" },
    { id: "sem_resposta", label: "Sem resposta" },
    { id: "aguardando", label: "Aguardando" },
  ];
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium",
            value === item.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted",
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          <span className="opacity-80">{counts[item.id]}</span>
        </button>
      ))}
    </div>
  );
}

export type InboxFilter = "todas" | "nao_lidas" | "sem_resposta" | "aguardando";

export function matchesInboxFilter(
  chat: { unread: number; aiPaused: boolean },
  filter: InboxFilter,
) {
  if (filter === "nao_lidas") return chat.unread > 0;
  if (filter === "aguardando") return chat.aiPaused;
  if (filter === "sem_resposta") return chat.unread > 0 && !chat.aiPaused;
  return true;
}

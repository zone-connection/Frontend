import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarPlus,
  ClipboardList,
  FileText,
  Home,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Sparkles,
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
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
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

  useEffect(() => {
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

  const stageName =
    funnelStages.find((item) => item.id === lead?.stage)?.name ??
    lead?.stage ??
    "—";
  const interesses = interessesAtivos(lead?.interesses);
  const chips = [
    lead?.interesse,
    lead?.orcamentoMax ? `Até ${brl(lead.orcamentoMax)}` : null,
    [lead?.cidade, lead?.bairro].filter(Boolean).join(" · ") || null,
  ].filter(Boolean) as string[];

  return (
    <aside className="flex min-h-0 w-[min(22rem,100%)] shrink-0 flex-col overflow-hidden border-l bg-background">
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
        <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
          Cliente
        </span>
        <span className="px-2 py-1">Imóvel</span>
        <span className="px-2 py-1">Atividades</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {loading && !lead ? (
          <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando ficha…
          </p>
        ) : lead ? (
          <div className="space-y-5 p-4">
            <div className="flex items-start gap-3">
              <WhatsappChatAvatar
                name={lead.nome || name || "Lead"}
                src={avatarUrl}
                className="h-12 w-12 text-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{lead.nome}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FaWhatsapp className="h-3 w-3 text-primary" />
                  {formatPhone(lead.telefone) || lead.telefone}
                </p>
                <span className="mt-1 inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                  {lead.tipo === "cliente" ? "Cliente" : "Lead"}
                </span>
              </div>
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Informações do lead
                </p>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={onOpenFicha}
                >
                  Editar
                </button>
              </div>
              <dl className="space-y-2 text-sm">
                <InfoRow icon={User} label="Nome" value={lead.nome} />
                <InfoRow
                  icon={Phone}
                  label="Telefone"
                  value={formatPhone(lead.telefone) || lead.telefone}
                />
                <InfoRow
                  icon={Mail}
                  label="E-mail"
                  value={displayEmail(lead.email) || "—"}
                />
                <InfoRow
                  icon={ClipboardList}
                  label="Etapa do funil"
                  value={stageName}
                />
                <InfoRow
                  icon={User}
                  label="Corretor responsável"
                  value={lead.corretor || "—"}
                />
                <InfoRow
                  icon={FileText}
                  label="Criado em"
                  value={formatDay(lead.createdAt)}
                />
              </dl>
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Interesses
              </p>
              {chips.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum interesse preenchido.</p>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Imóveis de interesse
                </p>
                <Link
                  to="/funil"
                  search={{ lead: lead.id }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              {interesses.length === 0 && !lead.empreendimento ? (
                <p className="text-xs text-muted-foreground">Nenhum imóvel vinculado.</p>
              ) : (
                <ul className="space-y-2">
                  {lead.empreendimento ? (
                    <li className="rounded-xl border bg-muted/30 p-3">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        {lead.empreendimento.nome}
                      </p>
                      {lead.empreendimento.cidade ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {lead.empreendimento.cidade}
                        </p>
                      ) : null}
                    </li>
                  ) : null}
                  {interesses.slice(0, 3).map((item) => (
                    <li key={item.id} className="rounded-xl border bg-muted/30 p-3">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Home className="h-3.5 w-3.5 text-primary" />
                        {rotuloInteresseAlvo(item)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notas internas
                </p>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={onOpenFicha}
                >
                  Abrir ficha
                </button>
              </div>
              <p className="flex items-start gap-2 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Anotações e triagem ficam na ficha completa do lead.
              </p>
            </section>
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
    toast.message(`${label} entra na IA do CRM em seguida.`);
  }
  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t bg-background px-2 py-1.5 [scrollbar-width:none]">
      <ActionChip
        icon={Sparkles}
        label="Sugerir resposta"
        onClick={() => soon("Sugerir resposta")}
      />
      <ActionChip icon={FileText} label="Resumo" onClick={() => soon("Resumo")} />
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
  icon: typeof Sparkles;
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

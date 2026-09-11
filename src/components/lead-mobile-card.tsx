import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MeuLeadBadge } from "@/components/meu-lead-badge";
import {
  catalogColorBadgeClass,
  catalogColorMatchingTextClass,
  catalogColorTintBadgeStyle,
} from "@/lib/catalog-colors";
import { brl, prioridadeBadgeClass, type Lead } from "@/lib/crm-types";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { cn } from "@/lib/utils";
import {
  Copy,
  Eye,
  FileText,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

function leadInitials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LeadMobileCard({
  lead,
  selected,
  onToggleSelect,
  onOpen,
  selectDisabled,
  showMeuLead,
  stageName,
  stageColor,
  isNovoStage,
  showTeam,
  equipe,
  isPlatformAdmin,
  canContratos,
  canMaps,
  onEdit,
  onWhatsApp,
  onCopyPhone,
  onMaps,
  onContrato,
  onDelete,
}: {
  lead: Lead;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onOpen: () => void;
  selectDisabled?: boolean;
  showMeuLead?: boolean;
  stageName: string;
  stageColor: string;
  isNovoStage?: boolean;
  showTeam?: boolean;
  equipe?: string;
  isPlatformAdmin?: boolean;
  canContratos?: boolean;
  canMaps?: boolean;
  onEdit: () => void;
  onWhatsApp: () => void;
  onCopyPhone: () => void;
  onMaps?: () => void;
  onContrato?: () => void;
  onDelete: () => void;
}) {
  const phone = formatPhone(lead.telefone).trim() || lead.telefone.trim();
  const hasPhone = Boolean(phoneDigits(lead.telefone));
  const canWhatsApp = phoneDigits(lead.telefone).length >= 10;
  const highlight = lead.prioridade === "Alta";

  const meta = isPlatformAdmin
    ? [lead.cidade, lead.prospeccao?.produtoIndicado].filter(Boolean)
    : [
        lead.renda != null ? brl(lead.renda) : null,
        showTeam && !lead.corretor && equipe && equipe !== "—" ? equipe : null,
      ].filter(Boolean);

  return (
    <article
      className={cn(
        SOFT_SURFACE,
        "text-card-foreground",
        selected && "ring-2 ring-primary/25",
        highlight && "border-destructive/20",
      )}
    >
      <div className="flex items-start gap-2.5 p-3.5">
        <div
          className="pt-1"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onToggleSelect(v === true)}
            aria-label={`Selecionar ${lead.nome}`}
            disabled={selectDisabled}
          />
        </div>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onOpen}
        >
          <div className="flex items-start gap-2.5">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="avatar-fallback-brand text-xs">
                {leadInitials(lead.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground">
                  {lead.nome}
                </h3>
                {showMeuLead ? <MeuLeadBadge /> : null}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {phone || "Sem telefone"}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge
              className={cn(
                catalogColorBadgeClass(stageColor),
                !isNovoStage && catalogColorMatchingTextClass(stageColor),
                "w-auto max-w-44",
                isNovoStage && "badge-novo-glow text-brand-dark",
              )}
              style={
                isNovoStage ? undefined : catalogColorTintBadgeStyle(stageColor)
              }
              title={stageName}
            >
              {stageName}
            </Badge>
            <Badge
              className={cn(prioridadeBadgeClass(lead.prioridade), "w-auto")}
            >
              {lead.prioridade}
            </Badge>
          </div>

          <p className="mt-2 truncate text-xs text-muted-foreground">
            Origem:{" "}
            <span className="font-medium text-foreground">
              {lead.origem || "Não informada"}
            </span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {showTeam && lead.corretor ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <User className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{lead.corretor}</span>
              </span>
            ) : null}
            {meta.map((item) => (
              <span key={item} className="truncate">
                {item}
              </span>
            ))}
            <span className="tabular-nums">{lead.updatedAt}</span>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Mais opções"
              aria-label={`Ações de ${lead.nome}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}>
              <Eye className="mr-2 h-4 w-4" /> Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canWhatsApp} onClick={onWhatsApp}>
              <FaWhatsapp className="mr-2 h-4 w-4 text-[#25D366]" /> WhatsApp
            </DropdownMenuItem>
            {canContratos && onContrato ? (
              <DropdownMenuItem onClick={onContrato}>
                <FileText className="mr-2 h-4 w-4" /> Contrato
              </DropdownMenuItem>
            ) : null}
            {isPlatformAdmin && onMaps ? (
              <DropdownMenuItem disabled={!canMaps} onClick={onMaps}>
                <MapPin className="mr-2 h-4 w-4" /> Google Maps
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="grid grid-cols-2 gap-2 border-t border-black/5 px-3.5 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          size="sm"
          className="h-10 w-full bg-[#25D366] text-white hover:bg-[#25D366]/90"
          disabled={!canWhatsApp}
          onClick={onWhatsApp}
        >
          <FaWhatsapp className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
          WhatsApp
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 w-full"
          disabled={!hasPhone}
          onClick={onCopyPhone}
        >
          <Copy className="mr-1.5 h-4 w-4 shrink-0" />
          Copiar número
        </Button>
      </div>
    </article>
  );
}

import { Bot, Check, CheckCheck, Clock, Info, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  isMediaPlaceholder,
  mediaSrc,
  WhatsappAudioBubble,
} from "@/components/whatsapp-chat-look";
import { cn } from "@/lib/utils";
import type { WhatsappDeliveryStatus } from "@/lib/whatsapp-inbox-api";

export type WhatsappBubbleMessage = {
  id: string;
  direction: "in" | "out";
  kind?: "client" | "ai" | "agent" | "follow_up";
  text: string;
  at: string | null;
  mediaType?: string | null;
  mediaUrl?: string | null;
  delivery?: WhatsappDeliveryStatus | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  error?: string | null;
};

function formatWhen(at: string | null) {
  if (!at) return "";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function deliveryLabel(status: WhatsappDeliveryStatus | null | undefined) {
  if (status === "read") return "Lida";
  if (status === "delivered") return "Entregue";
  if (status === "sent") return "Enviada";
  if (status === "pending") return "Enviando";
  if (status === "failed") return "Falhou";
  return "Sem status";
}

function DeliveryTicks({
  status,
  outgoing,
}: {
  status: WhatsappDeliveryStatus | null | undefined;
  outgoing: boolean;
}) {
  if (!outgoing) return null;
  if (status === "failed") {
    return (
      <span title="Falhou" className="inline-flex items-center">
        <Clock className="h-3 w-3 opacity-90" />
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span title="Enviando" className="inline-flex items-center">
        <Clock className="h-3 w-3 opacity-80" />
      </span>
    );
  }
  if (status === "read" || status === "delivered") {
    return (
      <span title={deliveryLabel(status)} className="inline-flex items-center">
        <CheckCheck
          className={cn("h-3.5 w-3.5", status === "read" ? "text-sky-200" : "opacity-80")}
        />
      </span>
    );
  }
  return (
    <span title="Enviada" className="inline-flex items-center">
      <Check className="h-3 w-3 opacity-80" />
    </span>
  );
}

export function WhatsappMessageDetailsDialog({
  message: msg,
  open,
  onOpenChange,
}: {
  message: WhatsappBubbleMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!msg) return null;
  const outgoing = msg.direction === "out";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Detalhes da mensagem</DialogTitle>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{outgoing ? deliveryLabel(msg.delivery) : "Recebida"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Enviada</dt>
            <dd>{formatWhen(msg.at) || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Entregue</dt>
            <dd>{formatWhen(msg.deliveredAt ?? null) || (msg.delivery === "delivered" || msg.delivery === "read" ? "Sim" : "—")}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Lida</dt>
            <dd>{formatWhen(msg.readAt ?? null) || (msg.delivery === "read" ? "Sim" : "—")}</dd>
          </div>
          {msg.error ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Erro</dt>
              <dd className="text-destructive">{msg.error}</dd>
            </div>
          ) : null}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

export function WhatsappMessageEditDialog({
  open,
  value,
  saving,
  onOpenChange,
  onChange,
  onSave,
}: {
  open: boolean;
  value: string;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar mensagem</DialogTitle>
        </DialogHeader>
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving || !value.trim()} onClick={onSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WhatsappMessageBubble({
  message: msg,
  label,
  outgoing,
  canMutate,
  onDetails,
  onEdit,
  onDelete,
}: {
  message: WhatsappBubbleMessage;
  label: string;
  outgoing: boolean;
  canMutate: boolean;
  onDetails: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const remote = Boolean(msg.id) && !msg.id.startsWith("local-") && !msg.id.startsWith("msg-");
  return (
    <div className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "group relative max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          outgoing
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border bg-card",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 text-[10px] font-medium opacity-80">
            {msg.kind === "ai" || msg.kind === "follow_up" ? (
              <Bot className="h-3 w-3" />
            ) : null}
            {label}
            {msg.at ? ` · ${formatWhen(msg.at)}` : ""}
            <DeliveryTicks status={msg.delivery} outgoing={outgoing} />
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "rounded p-0.5 opacity-70 hover:opacity-100",
                  outgoing ? "text-primary-foreground" : "text-muted-foreground",
                )}
                aria-label="Ações da mensagem"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={outgoing ? "end" : "start"} className="w-44">
              <DropdownMenuItem onClick={onDetails}>
                <Info className="h-4 w-4" />
                Ver detalhes
              </DropdownMenuItem>
              {canMutate && remote && onEdit ? (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              ) : null}
              {canMutate && remote && onDelete ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {msg.mediaUrl && msg.mediaType === "image" ? (
          <a
            href={mediaSrc(msg.mediaUrl)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block"
          >
            <img
              src={mediaSrc(msg.mediaUrl)}
              alt=""
              className="max-h-56 rounded-lg"
            />
          </a>
        ) : null}
        {(msg.mediaType?.toLowerCase() === "audio" ||
          (isMediaPlaceholder(msg.text) && /audio/i.test(msg.text))) &&
        msg.mediaUrl ? (
          <WhatsappAudioBubble url={msg.mediaUrl} outgoing={outgoing} />
        ) : null}
        {msg.mediaUrl &&
        msg.mediaType &&
        msg.mediaType !== "image" &&
        msg.mediaType !== "audio" &&
        msg.mediaType !== "text" ? (
          <a
            href={mediaSrc(msg.mediaUrl)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block underline"
          >
            Abrir {msg.mediaType}
          </a>
        ) : null}
        {msg.text && !isMediaPlaceholder(msg.text) ? (
          <p className="mt-0.5 whitespace-pre-wrap break-words">{msg.text}</p>
        ) : null}
      </div>
    </div>
  );
}

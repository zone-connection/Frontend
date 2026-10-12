import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  transcribeWhatsappAudio,
  unwrapWhatsappMediaUrl,
} from "@/lib/whatsapp-inbox-api";
import { cn } from "@/lib/utils";
import chatBgDark from "@/assets/whatsapp-chat-bg.jpg";
import chatBgLight from "@/assets/whatsapp-chat-bg-light.jpg";

export const chatPaneClass =
  "bg-[#f4f9fd] bg-repeat bg-[image:var(--chat-bg)] dark:bg-[#061428] dark:bg-[image:var(--chat-bg-dark)]";

export const chatPaneVars = {
  ["--chat-bg" as string]: `url(${chatBgLight})`,
  ["--chat-bg-dark" as string]: `url(${chatBgDark})`,
  backgroundSize: "420px auto",
};

export function mediaSrc(url: string) {
  return unwrapWhatsappMediaUrl(url) ?? url;
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function WhatsappAudioBubble({
  url,
  outgoing,
}: {
  url: string;
  outgoing?: boolean;
}) {
  const src = mediaSrc(url);
  const [text, setText] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function transcribe() {
    if (working) return;
    setWorking(true);
    try {
      const result = await transcribeWhatsappAudio(src);
      setText(result.text?.trim() || "Não foi possível entender o áudio.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível transcrever o áudio."));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-1 space-y-1.5">
      <audio className="w-full max-w-xs" controls preload="metadata" src={src}>
        <source src={src} type="audio/ogg" />
      </audio>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 text-[11px]",
          outgoing && "text-primary-foreground/90",
        )}
      >
        <a href={src} target="_blank" rel="noreferrer" className="underline">
          Abrir áudio
        </a>
        <button
          type="button"
          className="underline"
          onClick={() => void transcribe()}
          disabled={working}
        >
          {working ? "Transcrevendo…" : "Transcrever"}
        </button>
      </div>
      {text ? (
        <p className="whitespace-pre-wrap break-words text-xs opacity-90">
          {text}
        </p>
      ) : null}
    </div>
  );
}

export function isMediaPlaceholder(text: string) {
  return /^\s*\[?(audio|image|vídeo|video|documento)\]?\s*$/i.test(text);
}

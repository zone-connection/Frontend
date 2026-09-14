import { useRef } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_MAX_BYTES,
} from "@/lib/empreendimentos-api";

type ImageUploadFieldProps = {
  images: string[];
  max: number;
  label: string;
  hint?: string;
  /** Ex.: "1920 × 1080" — aparece no slot vazio para o usuário enviar no tamanho certo. */
  recommendedSize?: string;
  disabled?: boolean;
  busy?: boolean;
  shape?: "cover" | "logo";
  slotLabels?: string[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
};

export function ImageUploadField({
  images,
  max,
  label,
  hint,
  recommendedSize,
  disabled,
  busy,
  shape = "cover",
  slotLabels,
  onAdd,
  onRemove,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = Math.max(0, max - images.length);
  const canAdd = !disabled && !busy && remaining > 0;
  const slotCount =
    max <= 4 ? max : Math.min(max, images.length + (remaining > 0 ? 1 : 0));

  function handleFiles(list: FileList | null) {
    if (!list?.length || !canAdd) return;
    const picked = [...list].slice(0, remaining);
    onAdd(picked);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-[11px] text-muted-foreground">
          {images.length}/{max}
        </span>
      </div>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div
        className={cn(
          "grid gap-2",
          shape === "logo"
            ? "grid-cols-1"
            : max > 4
              ? "grid-cols-2 sm:grid-cols-3"
              : max > 1
                ? "grid-cols-2"
                : "grid-cols-1",
        )}
      >
        {Array.from({ length: Math.max(slotCount, images.length) }, (_, index) => {
          const src = images[index];
          const slotLabel =
            slotLabels?.[index] ?? (max > 1 ? `Foto ${index + 1}` : "Adicionar");
          return (
            <div
              key={src ?? `slot-${index}`}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-muted/40",
                shape === "logo"
                  ? "aspect-video max-w-72 bg-white"
                  : "aspect-video",
              )}
            >
              {src ? (
                <>
                  <img
                    src={src}
                    alt=""
                    className={cn(
                      "h-full w-full",
                      shape === "logo"
                        ? "object-contain p-2"
                        : "object-cover",
                    )}
                  />
                  {!disabled ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-1.5 top-1.5 h-7 w-7"
                      disabled={busy}
                      title="Remover imagem"
                      onClick={() => onRemove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground transition-colors",
                    canAdd
                      ? "hover:bg-primary/10"
                      : "cursor-not-allowed opacity-60",
                    busy && "pointer-events-none opacity-70",
                  )}
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-primary" />
                  )}
                  <span>{busy ? "Enviando…" : slotLabel}</span>
                  {!busy && recommendedSize ? (
                    <span className="mt-0.5 flex flex-col items-center leading-tight">
                      <span className="rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-wide text-foreground">
                        {recommendedSize}
                      </span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground">
                        tamanho ideal
                      </span>
                    </span>
                  ) : null}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        multiple={remaining > 1}
        className="hidden"
        disabled={!canAdd}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

export function assertImageFile(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type) &&
      file.type !== "" &&
      file.type !== "application/octet-stream") {
    return "Envie uma imagem JPG, PNG ou WebP.";
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return "A imagem deve ter no máximo 5 MB.";
  }
  return null;
}

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ArquivoNotaField({
  file,
  onChange,
  atualUrl,
  atualNome,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  atualUrl?: string;
  atualNome?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          onChange(event.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition",
          over
            ? "border-[#079ED4] bg-[#E7F6FC]"
            : "border-[#9DCEF5] bg-[#F4FAFD] hover:border-[#079ED4]",
        )}
      >
        <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#079ED4] shadow-sm">
          {file ? <FileText className="size-5" /> : <Upload className="size-5" />}
        </span>
        <span className="text-sm font-medium text-[#0B3148]">
          {file ? file.name : "Clique para enviar ou arraste o arquivo aqui"}
        </span>
        <span className="text-xs text-[#8B98A3]">PDF ou Word</span>
      </button>
      {file ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            onChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          <X className="size-3.5" />
          Remover arquivo escolhido
        </button>
      ) : null}
      {!file && atualUrl ? (
        <a className="text-xs text-primary underline" href={atualUrl} target="_blank" rel="noreferrer">
          Arquivo atual: {atualNome || "abrir"}
        </a>
      ) : null}
    </div>
  );
}

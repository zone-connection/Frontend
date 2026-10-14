import { Upload } from "lucide-react";
import { DocumentosPanel } from "@/components/documentos-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ArquivoVinculoTipo } from "@/lib/arquivos-api";

export function ArquivosDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  nome,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: ArquivoVinculoTipo;
  entityId: string | null;
  nome?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Arquivos
          </DialogTitle>
          <DialogDescription>
            {nome
              ? `Envie e consulte os arquivos de ${nome}. PDF ou imagem, até 5 MB.`
              : "PDF ou imagem, até 5 MB."}
          </DialogDescription>
        </DialogHeader>
        {open && entityId ? (
          <DocumentosPanel
            entityType={entityType}
            entityId={entityId}
            categoria="outro"
            title="Arquivos"
            allowUpload
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

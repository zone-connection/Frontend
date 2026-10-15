import { Upload } from "lucide-react";
import { DocumentosPanel } from "@/components/documentos-panel";
import { FormDialogShell } from "@/components/form-dialog";
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
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Upload className="size-5" />}
      title="Arquivos"
      description={
        nome
          ? `Envie e consulte os arquivos de ${nome}. PDF ou imagem, até 5 MB.`
          : "PDF ou imagem, até 5 MB."
      }
      contentClassName="px-4 py-5 sm:px-6"
    >
      {open && entityId ? (
        <DocumentosPanel
          embedded
          entityType={entityType}
          entityId={entityId}
          categoria="outro"
          title="Arquivos"
          allowUpload
        />
      ) : null}
    </FormDialogShell>
  );
}

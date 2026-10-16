import { useEffect, useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  downloadArquivoFile,
  fetchArquivos,
  uploadArquivo,
  type ArquivoDocumento,
} from "@/lib/arquivos-api";

type Alvo = {
  entityType: "financeiro_titulo" | "financeiro_comissao";
  entityId: string;
  descricao: string;
};

export function GuardarComprovanteDialog({
  alvo,
  onClose,
}: {
  alvo: Alvo | null;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFile(null);
  }, [alvo?.entityId]);

  async function guardar() {
    if (!alvo || !file) return;
    setSaving(true);
    try {
      await uploadArquivo({
        file,
        entityType: alvo.entityType,
        entityId: alvo.entityId,
        nome: file.name.replace(/\.[^.]+$/, "") || "Comprovante",
        categoria: "outro",
        tagIds: [],
      });
      toast.success("Comprovante guardado.");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível guardar o comprovante.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDialogShell
      open={!!alvo}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      icon={<Paperclip className="size-5" />}
      title="Guardar comprovante?"
      description={
        alvo
          ? `O pagamento de “${alvo.descricao}” foi registrado. Você pode anexar o comprovante agora.`
          : undefined
      }
      footer={
        <FormDialogActions>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Agora não
          </Button>
          <Button type="button" disabled={saving || !file} onClick={() => void guardar()}>
            {saving && <Loader2 className="mr-1 size-4 animate-spin" />}
            Guardar comprovante
          </Button>
        </FormDialogActions>
      }
    >
      <FormDialogBody>
        <div className="space-y-1.5">
          <Label htmlFor="comprovante-arquivo">Arquivo (PDF ou imagem)</Label>
          <input
            id="comprovante-arquivo"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </FormDialogBody>
    </FormDialogShell>
  );
}

export function ComprovantesLista({
  entityType,
  entityId,
}: {
  entityType: Alvo["entityType"];
  entityId: string;
}) {
  const [items, setItems] = useState<ArquivoDocumento[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    void fetchArquivos({ entityType, entityId })
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Comprovantes</p>
      <ul className="space-y-1">
        {items.map((arquivo) => (
          <li key={arquivo.id}>
            <button
              type="button"
              className="text-sm text-primary underline-offset-2 hover:underline"
              onClick={() => {
                void downloadArquivoFile(arquivo.id)
                  .then(({ blob, filename }) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = filename || arquivo.nome;
                    link.click();
                    URL.revokeObjectURL(url);
                  })
                  .catch(() =>
                    toast.error("Não foi possível baixar o comprovante."),
                  );
              }}
            >
              {arquivo.nome}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

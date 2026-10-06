import { Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { copiarLinkPropostaPublica } from "@/lib/proposta-publica-api";
import { toast } from "sonner";

export function PropostaLinkPublicoButton({
  imovelId,
  size = "sm",
}: {
  imovelId: string;
  size?: "sm" | "default";
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void copiarLinkPropostaPublica(imovelId)
          .then(() => toast.success("Link da proposta copiado."))
          .catch((err) => {
            toast.error(
              err instanceof ApiError
                ? err.message
                : "Não foi possível gerar o link.",
            );
          })
          .finally(() => setBusy(false));
      }}
    >
      {busy ? (
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Link2 className="mr-1 h-3.5 w-3.5" />
      )}
      Link da proposta
    </Button>
  );
}

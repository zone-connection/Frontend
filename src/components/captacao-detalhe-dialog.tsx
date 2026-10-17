import type { ReactNode } from "react";
import { Clock, Mail, MapPin, Phone, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FichaDado,
  OPERACAO_FICHA_DIALOG,
  OperacaoFichaView,
  type OperacaoFichaAction,
} from "@/components/operacao-ficha-view";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  formatBrl,
  type Captacao,
} from "@/lib/captacao-api";
import { displayEmail } from "@/lib/email";
import { getWhatsAppUrl } from "@/lib/env";
import { formatDateTimePt } from "@/lib/lead-monitoramento";
import { phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

export type CaptacaoDetalheAction = OperacaoFichaAction & {
  destructive?: boolean;
};

function imovelEndereco(item: Captacao) {
  const { logradouro, numero, bairro, cidade, estado } = item.imovel;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const cidadeUf = [cidade, estado].filter(Boolean).join("/");
  return [rua, bairro, cidadeUf].filter(Boolean).join(" · ") || "—";
}

export function CaptacaoDetalheDialog({
  captacao,
  open,
  onOpenChange,
  sidebarActions,
  stageControl,
  perdaAction,
  stages = [],
}: {
  captacao: Captacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sidebarActions?: CaptacaoDetalheAction[];
  stageControl?: ReactNode;
  perdaAction?: { label: string; onClick: () => void };
  stages?: Array<{ id: string; label: string; papel?: string | null }>;
}) {
  const telefone = captacao?.proprietario.telefone ?? "";
  const telefoneDigits = phoneDigits(telefone);
  const temTelefone = telefoneDigits.length >= 10;
  const email = captacao ? displayEmail(captacao.proprietario.email ?? "") : "";

  function abrirWhatsApp() {
    if (!temTelefone) return;
    const e164 = telefoneDigits.startsWith("55")
      ? telefoneDigits
      : `55${telefoneDigits}`;
    window.open(getWhatsAppUrl(undefined, e164), "_blank", "noopener,noreferrer");
  }

  function ligar() {
    if (!temTelefone) return;
    window.location.href = `tel:+55${telefoneDigits}`;
  }

  const etapas =
    stages.length > 0
      ? stages
      : captacao
        ? [
            {
              id: captacao.funilEtapaId,
              label: captacao.funilEtapa.label,
              papel: captacao.funilEtapa.papel,
            },
          ]
        : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="!top-14 !bottom-0 !left-0 !right-0 md:!left-[var(--app-sidebar,15rem)] bg-background"
        className={cn(OPERACAO_FICHA_DIALOG)}
      >
        {captacao ? (
          <>
            <DialogTitle className="sr-only">{captacao.proprietario.nome}</DialogTitle>
            <DialogDescription className="sr-only">
              Detalhes de {captacao.proprietario.nome}
            </DialogDescription>
            <OperacaoFichaView
              name={captacao.proprietario.nome}
              kind="Captação"
              chips={[
                captacao.funilEtapa.label,
                captacao.origem,
                captacao.exclusividade ? "Exclusividade" : "",
              ].filter(Boolean)}
              corretor={captacao.responsavel.name}
              createdAt={captacao.createdAt}
              onBack={() => onOpenChange(false)}
              temTelefone={temTelefone}
              onCall={ligar}
              onWhatsApp={abrirWhatsApp}
              perdaAction={perdaAction}
              funnelName="Funil de captação"
              stages={etapas}
              currentStageId={captacao.funilEtapaId}
              monitoramento={captacao.monitoramento}
              facts={[
                { icon: Phone, label: "Telefone", value: telefone || "—" },
                { icon: Mail, label: "E-mail", value: email || "—" },
                { icon: Wallet, label: "Pretendido", value: formatBrl(captacao.valorPretendido) },
                { icon: Wallet, label: "Avaliação", value: formatBrl(captacao.valorAvaliacao) },
                { icon: MapPin, label: "Imóvel", value: captacao.imovel.titulo || "—" },
                { icon: Clock, label: "Cadastro", value: formatDateTimePt(captacao.createdAt) },
              ]}
              tabs={["Dados", "Imóvel", "Histórico"]}
              actions={sidebarActions}
              primary={stageControl}
            >
              {(tab) =>
                tab === "Imóvel" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FichaDado label="Título" value={captacao.imovel.titulo || "—"} />
                    <FichaDado label="Tipo" value={CAPTACAO_IMOVEL_TIPO_LABEL[captacao.imovel.tipo]} />
                    <FichaDado label="Endereço" value={imovelEndereco(captacao)} />
                    <FichaDado label="Valor" value={formatBrl(captacao.imovel.valor)} />
                    <FichaDado label="Área" value={captacao.imovel.area != null ? `${captacao.imovel.area} m²` : "—"} />
                    <FichaDado label="Responsável" value={captacao.responsavel.name} />
                  </div>
                ) : tab === "Histórico" ? (
                  (captacao.historicos ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum histórico registrado nesta captação.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {(captacao.historicos ?? []).map((item) => (
                        <li key={item.id} className="flex items-center gap-3 py-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white">
                            <Clock className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{item.texto}</p>
                          </div>
                          <div className="hidden text-right sm:block">
                            <p className="text-xs font-medium">{item.autor?.name ?? "Sistema"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDateTimePt(item.createdAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FichaDado label="Proprietário" value={captacao.proprietario.nome} />
                    <FichaDado label="Telefone" value={telefone || "—"} />
                    <FichaDado label="E-mail" value={email || "—"} />
                    <FichaDado label="Origem" value={captacao.origem || "—"} />
                    <FichaDado label="Valor pretendido" value={formatBrl(captacao.valorPretendido)} />
                    <FichaDado label="Valor de avaliação" value={formatBrl(captacao.valorAvaliacao)} />
                    <FichaDado label="Exclusividade" value={captacao.exclusividade ? "Sim" : "Não"} />
                    <FichaDado label="Etapa" value={captacao.funilEtapa.label} />
                  </div>
                )
              }
            </OperacaoFichaView>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

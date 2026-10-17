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
import { CAPTACAO_IMOVEL_TIPO_LABEL } from "@/lib/captacao-api";
import { displayEmail } from "@/lib/email";
import { getWhatsAppUrl } from "@/lib/env";
import {
  formatBrl,
  VENDA_STATUS_LABEL,
  type VendaUsado,
} from "@/lib/imoveis-usados-api";
import { formatDateTimePt } from "@/lib/lead-monitoramento";
import { phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

function proprietarioContato(venda: VendaUsado) {
  const raw = venda.imovel.proprietario as
    | { id: string; nome: string; telefone?: string; email?: string }
    | undefined;
  return {
    nome: raw?.nome ?? "Proprietário",
    telefone: raw?.telefone ?? "",
    email: raw?.email ?? "",
  };
}

function imovelEndereco(venda: VendaUsado) {
  const { logradouro, numero, bairro, cidade, estado } = venda.imovel;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const cidadeUf = [cidade, estado].filter(Boolean).join("/");
  return [rua, bairro, cidadeUf].filter(Boolean).join(" · ") || "—";
}

export function VendaUsadoDetalheDialog({
  venda,
  open,
  onOpenChange,
  stages = [],
  actions,
  stageControl,
  perdaAction,
}: {
  venda: VendaUsado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages?: Array<{ id: string; label: string; papel?: string | null }>;
  actions?: OperacaoFichaAction[];
  stageControl?: ReactNode;
  perdaAction?: { label: string; onClick: () => void };
}) {
  const contato = venda ? proprietarioContato(venda) : null;
  const telefone = contato?.telefone ?? "";
  const telefoneDigits = phoneDigits(telefone);
  const temTelefone = telefoneDigits.length >= 10;
  const email = contato ? displayEmail(contato.email) : "";

  function abrirWhatsApp() {
    if (!temTelefone) return;
    const e164 = telefoneDigits.startsWith("55") ? telefoneDigits : `55${telefoneDigits}`;
    window.open(getWhatsAppUrl(undefined, e164), "_blank", "noopener,noreferrer");
  }

  function ligar() {
    if (!temTelefone) return;
    window.location.href = `tel:+55${telefoneDigits}`;
  }

  const etapas =
    stages.length > 0
      ? stages
      : venda
        ? [{ id: venda.funilEtapaId, label: venda.funilEtapa.label }]
        : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="!top-14 !bottom-0 !left-0 !right-0 md:!left-[var(--app-sidebar,15rem)] bg-background"
        className={cn(OPERACAO_FICHA_DIALOG)}
      >
        {venda && contato ? (
          <>
            <DialogTitle className="sr-only">{contato.nome}</DialogTitle>
            <DialogDescription className="sr-only">Detalhes de {contato.nome}</DialogDescription>
            <OperacaoFichaView
              name={contato.nome}
              kind="Venda de usado"
              chips={[venda.funilEtapa.label, VENDA_STATUS_LABEL[venda.status]]}
              corretor={venda.responsavel.name}
              createdAt={venda.dataDisponibilizacao}
              onBack={() => onOpenChange(false)}
              temTelefone={temTelefone}
              onCall={ligar}
              onWhatsApp={abrirWhatsApp}
              perdaAction={perdaAction}
              funnelName="Funil de venda de usados"
              stages={etapas}
              currentStageId={venda.funilEtapaId}
              monitoramento={venda.monitoramento}
              facts={[
                { icon: Phone, label: "Telefone", value: telefone || "—" },
                { icon: Mail, label: "E-mail", value: email || "—" },
                { icon: Wallet, label: "Preço", value: formatBrl(venda.precoVenda) },
                { icon: MapPin, label: "Imóvel", value: venda.imovel.titulo || "—" },
                { icon: Wallet, label: "Status", value: VENDA_STATUS_LABEL[venda.status] },
                { icon: Clock, label: "Disponível", value: formatDateTimePt(venda.dataDisponibilizacao) },
              ]}
              tabs={["Dados", "Imóvel", "Atendimento"]}
              actions={actions}
              primary={stageControl}
            >
              {(tab) =>
                tab === "Imóvel" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FichaDado label="Título" value={venda.imovel.titulo || "—"} />
                    <FichaDado label="Tipo" value={CAPTACAO_IMOVEL_TIPO_LABEL[venda.imovel.tipo]} />
                    <FichaDado label="Endereço" value={imovelEndereco(venda)} />
                    <FichaDado label="Área" value={venda.imovel.area != null ? `${venda.imovel.area} m²` : "—"} />
                  </div>
                ) : tab === "Atendimento" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FichaDado label="Responsável" value={venda.responsavel.name} />
                    <FichaDado label="Observações" value={venda.observacoes || "—"} />
                    <FichaDado label="Cidade" value={venda.imovel.cidade || "—"} />
                    <FichaDado label="Atualizado" value={formatDateTimePt(venda.dataDisponibilizacao)} />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FichaDado label="Proprietário" value={contato.nome} />
                    <FichaDado label="Telefone" value={telefone || "—"} />
                    <FichaDado label="E-mail" value={email || "—"} />
                    <FichaDado label="Preço de venda" value={formatBrl(venda.precoVenda)} />
                    <FichaDado label="Valor do imóvel" value={formatBrl(venda.imovel.valor)} />
                    <FichaDado label="Status" value={VENDA_STATUS_LABEL[venda.status]} />
                    <FichaDado label="Etapa" value={venda.funilEtapa.label} />
                    <FichaDado label="Disponibilizado" value={formatDateTimePt(venda.dataDisponibilizacao)} />
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

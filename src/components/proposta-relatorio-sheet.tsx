import { useEffect, useState, type CSSProperties } from "react";
import { brl } from "@/lib/crm-types";
import {
  resolvePropostaVisualPalette,
  type PropostaVisualPalette,
} from "@/lib/proposta-pdf-visual";

export type RelatorioLinha = {
  qtd: string;
  descricao: string;
  valor: string;
  subtotal: string;
};

const ORDEM = [
  "SINAL",
  "PRÉ-CHAVES",
  "PÓS-CHAVES",
  "INTERCALADAS",
  "FGTS",
  "MORA BEM",
  "MCMV",
  "FINANCIAMENTO",
  "PARCELA CAIXA (INFORMATIVO)",
];

export function ordenarLinhasRelatorio(linhas: RelatorioLinha[]) {
  return [...linhas].sort((a, b) => {
    const ia = ORDEM.indexOf(a.descricao);
    const ib = ORDEM.indexOf(b.descricao);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function splitAgencyName(name: string) {
  const trimmed = name.trim() || "Imobiliária";
  const match = trimmed.match(/^(imobili[áa]ria)\s+(.+)$/i);
  if (match?.[1] && match[2]) {
    return {
      kicker: match[1].toUpperCase(),
      display: match[2],
    };
  }
  return { kicker: "IMOBILIÁRIA", display: trimmed };
}

export function PropostaRelatorioSheet({
  companyName,
  logoUrl,
  codigo,
  data,
  clienteNome,
  subtituloImobiliaria,
  linhas,
  total,
  desconto,
  valorNegociado,
  accent,
}: {
  companyName: string;
  logoUrl?: string | null;
  codigo: string;
  data: string;
  clienteNome: string;
  subtituloImobiliaria: string;
  linhas: RelatorioLinha[];
  total: number;
  desconto: number;
  valorNegociado: number;
  accent?: string | null;
}) {
  const visiveis = ordenarLinhasRelatorio(linhas);
  const { kicker, display } = splitAgencyName(companyName);
  const [palette, setPalette] = useState<PropostaVisualPalette | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolvePropostaVisualPalette(logoUrl, accent).then((next) => {
      if (!cancelled) setPalette(next);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl, accent]);

  const tone = palette ?? {
    ink: "#0B3148",
    header: "#05749E",
    accent: "#079ED4",
    accentDeep: "#0689b8",
    mist: "#D3EBF5",
    muted: "#5C6B76",
    wash: "#E7F4FA",
    page: "#F4F7F8",
    line: "#E2E8EC",
    divider: "#079ED4",
  };
  const style = {
    "--pv-ink": tone.ink,
    "--pv-header": tone.header,
    "--pv-accent": tone.accent,
    "--pv-deep": tone.accentDeep,
    "--pv-mist": tone.mist,
    "--pv-muted": tone.muted,
    "--pv-wash": tone.wash,
    "--pv-page": tone.page,
    "--pv-line": tone.line,
    "--pv-divider": tone.divider,
  } as CSSProperties;

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--pv-line)] bg-[var(--pv-page)] text-[var(--pv-ink)] shadow-sm"
      style={style}
    >
      <header className="relative overflow-hidden bg-[var(--pv-header)] px-8 py-8 text-white">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[46%]"
          style={{
            background: `linear-gradient(115deg, transparent 0%, transparent 28%, ${tone.accent} 28%, ${tone.accentDeep} 72%, ${tone.header} 100%)`,
          }}
        />
        <div className="relative flex items-start justify-between gap-6">
          <div className="min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="mb-3 h-10 w-auto rounded-md bg-white object-contain px-2 py-1"
              />
            ) : null}
            <p className="text-[10px] font-medium tracking-[0.42em] text-[var(--pv-mist)]">
              {kicker}
            </p>
            <h2 className="mt-1 font-serif text-[34px] font-normal leading-none tracking-wide">
              {display}
            </h2>
            <p className="mt-5 font-serif text-[13px] italic leading-snug text-[var(--pv-mist)]">
              Mais que imóveis,
              <br />
              realizamos conexões.
            </p>
          </div>
          <div className="relative shrink-0 pt-4 text-right">
            <span
              className="absolute -left-8 top-3 h-16 w-px"
              style={{ backgroundColor: tone.mist, opacity: 0.7 }}
            />
            <p className="text-[10px] font-medium tracking-[0.22em] text-[var(--pv-mist)]">
              TRANSPARÊNCIA
            </p>
            <p className="mt-1 text-[10px] font-medium tracking-[0.22em] text-[var(--pv-mist)]">
              EM CADA ETAPA.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-8 py-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] tracking-[0.28em] text-[var(--pv-muted)]">
              PROPOSTA DE COMPRA
            </p>
            <h3 className="mt-2 font-serif text-[26px] font-normal leading-tight tracking-wide">
              {companyName.toUpperCase()}
            </h3>
            <span className="mt-3 block h-px w-9 bg-[var(--pv-ink)]" />
            <p className="mt-4 text-[10px] tracking-[0.2em] text-[var(--pv-muted)]">
              PROPOSTA COMERCIAL
            </p>
            <p className="mt-1 text-[12px] text-[var(--pv-muted)]">
              {data} · {codigo || "----"}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.18em] text-[var(--pv-muted)]">
              IDENTIFICAÇÃO DA IMOBILIÁRIA
            </p>
            <p className="mt-2 text-[13px] font-semibold uppercase">
              {companyName}
            </p>
            <p className="mt-1 text-[12px] uppercase text-[var(--pv-muted)]">
              {subtituloImobiliaria}
            </p>
            <span className="mt-4 block h-px w-full bg-[var(--pv-line)]" />
            <p className="mt-4 text-[10px] tracking-[0.18em] text-[var(--pv-muted)]">
              PROPONENTE
            </p>
            <p className="mt-1 text-[9px] tracking-[0.12em] text-[var(--pv-muted)]">
              NOME DO CLIENTE
            </p>
            <p className="mt-1 text-[14px] font-semibold uppercase">
              {clienteNome.trim() || "----"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[13px] tracking-[0.22em] text-[var(--pv-ink)]">
            PLANO DE PAGAMENTO
          </p>
          <p className="mt-1 text-[12px] text-[var(--pv-muted)]">
            Condições e valores da proposta
          </p>

          <div className="mt-4 overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[var(--pv-wash)] text-[10px] tracking-[0.14em] text-[var(--pv-muted)]">
                  <th className="w-[12%] px-4 py-3 text-left font-medium">
                    QTD
                  </th>
                  <th className="px-3 py-3 text-left font-medium">
                    DESCRIÇÃO
                  </th>
                  <th className="w-[24%] px-4 py-3 text-right font-medium">
                    VALOR
                  </th>
                  <th className="w-[24%] px-4 py-3 text-right font-medium">
                    SUBTOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {(visiveis.length
                  ? visiveis
                  : [
                      {
                        qtd: "—",
                        descricao: "NENHUMA COMPOSIÇÃO INFORMADA",
                        valor: "—",
                        subtotal: "—",
                      },
                    ]
                ).map((linha, index) => (
                  <tr
                    key={`${linha.descricao}-${linha.qtd}-${index}`}
                    className="border-t border-[var(--pv-line)]"
                  >
                    <td className="px-4 py-3 tabular-nums">{linha.qtd}</td>
                    <td className="px-3 py-3 font-semibold uppercase">
                      {linha.descricao}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {linha.valor}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {linha.subtotal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-[1.1fr_1fr] overflow-hidden rounded-xl bg-[var(--pv-header)] text-white">
          <div className="px-6 py-6">
            <p className="text-[10px] tracking-[0.2em] text-[var(--pv-mist)]">
              TOTAL DA COMPOSIÇÃO
            </p>
            <span className="mt-2 block h-px w-8 bg-[var(--pv-mist)]" />
            <p className="mt-3 font-serif text-[28px] tabular-nums leading-none">
              {brl(total)}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 border-l border-[var(--pv-divider)] px-6 py-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] tracking-[0.14em] text-[var(--pv-mist)]">
                DESCONTO DO IMÓVEL
              </span>
              <span className="text-[13px] tabular-nums">{brl(desconto)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] tracking-[0.14em] text-[var(--pv-mist)]">
                VALOR NEGOCIADO
              </span>
              <span className="text-[14px] font-medium tabular-nums">
                {brl(valorNegociado)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex items-end justify-between gap-4 px-8 pb-6 text-[11px] text-[var(--pv-muted)]">
        <div>
          <p className="tracking-[0.12em]">{companyName.toUpperCase()}</p>
          <p className="font-serif italic">Seu próximo capítulo começa aqui.</p>
        </div>
        <div className="mb-1 flex min-w-0 flex-1 items-center gap-3 px-4">
          <span className="h-px flex-1 bg-[var(--pv-line)]" />
        </div>
        <p className="text-[var(--pv-ink)]">{codigo || "----"}</p>
      </footer>
    </div>
  );
}

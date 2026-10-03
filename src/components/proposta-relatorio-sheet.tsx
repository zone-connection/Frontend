import { brl } from "@/lib/crm-types";

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

  return (
    <div className="overflow-hidden rounded-xl border border-[#ece8f4] bg-[#f7f6fc] text-[#16122a] shadow-sm">
      <header className="relative overflow-hidden bg-[#12102a] px-8 py-8 text-white">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[46%]"
          style={{
            background:
              "linear-gradient(115deg, transparent 0%, transparent 28%, #3e2a76 28%, #241c4e 72%, #1a1638 100%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-6">
          <div className="min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="mb-3 h-8 w-auto object-contain brightness-0 invert"
              />
            ) : null}
            <p className="text-[10px] font-medium tracking-[0.42em] text-[#c4bcd8]">
              {kicker}
            </p>
            <h2 className="mt-1 font-serif text-[34px] font-normal leading-none tracking-wide">
              {display}
            </h2>
            <p className="mt-5 font-serif text-[13px] italic leading-snug text-[#d2cce6]">
              Mais que imóveis,
              <br />
              realizamos conexões.
            </p>
          </div>
          <div className="relative shrink-0 pt-4 text-right">
            <span className="absolute -left-8 top-3 h-16 w-px bg-[#b4aad2]/70" />
            <p className="text-[10px] font-medium tracking-[0.22em] text-[#d2cce6]">
              TRANSPARÊNCIA
            </p>
            <p className="mt-1 text-[10px] font-medium tracking-[0.22em] text-[#d2cce6]">
              EM CADA ETAPA.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-8 py-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] tracking-[0.28em] text-[#787094]">
              PROPOSTA DE COMPRA
            </p>
            <h3 className="mt-2 font-serif text-[26px] font-normal leading-tight tracking-wide">
              {companyName.toUpperCase()}
            </h3>
            <span className="mt-3 block h-px w-9 bg-[#16122a]" />
            <p className="mt-4 text-[10px] tracking-[0.2em] text-[#787094]">
              PROPOSTA COMERCIAL
            </p>
            <p className="mt-1 text-[12px] text-[#5a566e]">
              {data} · {codigo || "----"}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.18em] text-[#787094]">
              IDENTIFICAÇÃO DA IMOBILIÁRIA
            </p>
            <p className="mt-2 text-[13px] font-semibold uppercase">
              {companyName}
            </p>
            <p className="mt-1 text-[12px] uppercase text-[#5a566e]">
              {subtituloImobiliaria}
            </p>
            <span className="mt-4 block h-px w-full bg-[#e2deec]" />
            <p className="mt-4 text-[10px] tracking-[0.18em] text-[#787094]">
              PROPONENTE
            </p>
            <p className="mt-1 text-[9px] tracking-[0.12em] text-[#787094]">
              NOME DO CLIENTE
            </p>
            <p className="mt-1 text-[14px] font-semibold uppercase">
              {clienteNome.trim() || "----"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[13px] tracking-[0.22em] text-[#16122a]">
            PLANO DE PAGAMENTO
          </p>
          <p className="mt-1 text-[12px] text-[#787094]">
            Condições e valores da proposta
          </p>

          <div className="mt-4 overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#ece7f7] text-[10px] tracking-[0.14em] text-[#787094]">
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
                    className="border-t border-[#ece8f4]"
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

        <div className="grid grid-cols-[1.1fr_1fr] overflow-hidden rounded-xl bg-[#12102a] text-white">
          <div className="px-6 py-6">
            <p className="text-[10px] tracking-[0.2em] text-[#c4bcd8]">
              TOTAL DA COMPOSIÇÃO
            </p>
            <span className="mt-2 block h-px w-8 bg-[#c4bcd8]" />
            <p className="mt-3 font-serif text-[28px] tabular-nums leading-none">
              {brl(total)}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 border-l border-[#5a5082] px-6 py-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] tracking-[0.14em] text-[#c4bcd8]">
                DESCONTO DO IMÓVEL
              </span>
              <span className="text-[13px] tabular-nums">{brl(desconto)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] tracking-[0.14em] text-[#c4bcd8]">
                VALOR NEGOCIADO
              </span>
              <span className="text-[14px] font-medium tabular-nums">
                {brl(valorNegociado)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex items-end justify-between gap-4 px-8 pb-6 text-[11px] text-[#787094]">
        <div>
          <p className="tracking-[0.12em]">{companyName.toUpperCase()}</p>
          <p className="font-serif italic">Seu próximo capítulo começa aqui.</p>
        </div>
        <div className="mb-1 flex min-w-0 flex-1 items-center gap-3 px-4">
          <span className="h-px flex-1 bg-[#e2deec]" />
        </div>
        <p className="text-[#16122a]">{codigo || "----"}</p>
      </footer>
    </div>
  );
}

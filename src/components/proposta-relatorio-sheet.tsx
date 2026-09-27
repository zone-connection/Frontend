import { Layers, UserRound, Wallet } from "lucide-react";
import { brl } from "@/lib/crm-types";

export type RelatorioLinha = {
  qtd: string;
  descricao: string;
  valor: string;
  subtotal: string;
};

const ORDEM = [
  "SINAL",
  "APARTADO",
  "PRÉ-CHAVES",
  "PÓS-CHAVES",
  "INTERCALADAS",
  "FGTS",
  "MORA BEM",
  "MCMV",
  "FINANCIAMENTO",
];

export function ordenarLinhasRelatorio(linhas: RelatorioLinha[]) {
  return [...linhas].sort((a, b) => {
    const ia = ORDEM.indexOf(a.descricao);
    const ib = ORDEM.indexOf(b.descricao);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function accentHex(hex: string | null | undefined) {
  const fallback = "#38bdf8";
  if (!hex) return fallback;
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return fallback;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance < 0.42 || luminance > 0.82) return fallback;
  return `#${raw}`;
}

function SkylineMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <rect x="2" y="12" width="5" height="9" rx="0.5" fill="currentColor" />
      <rect x="8.5" y="5" width="7" height="16" rx="0.5" fill="currentColor" />
      <rect x="17" y="9" width="5" height="12" rx="0.5" fill="currentColor" />
      <rect x="10" y="8" width="1.3" height="1.5" fill="white" />
      <rect x="12.4" y="8" width="1.3" height="1.5" fill="white" />
      <rect x="10" y="11" width="1.3" height="1.5" fill="white" />
      <rect x="12.4" y="11" width="1.3" height="1.5" fill="white" />
      <rect x="3.4" y="15" width="1.2" height="1.4" fill="white" />
      <rect x="18.6" y="12" width="1.2" height="1.4" fill="white" />
    </svg>
  );
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
  const cor = accentHex(accent);
  const visiveis = ordenarLinhasRelatorio(linhas);
  const iniciais = companyName.trim().slice(0, 1).toUpperCase() || "I";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f4f6fb] text-[#12182c] shadow-sm">
      <div className="flex min-h-[540px]">
        <aside className="relative flex w-[124px] shrink-0 flex-col overflow-hidden bg-[#0b1220] px-3.5 py-5 text-white">
          <span className="pointer-events-none absolute inset-y-10 right-0 w-px bg-gradient-to-b from-transparent via-sky-300/70 to-transparent" />
          <svg
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[250px] w-full"
            viewBox="0 0 124 280"
            preserveAspectRatio="xMidYMax meet"
            aria-hidden
          >
            <circle cx="92" cy="78" r="22" fill={cor} fillOpacity="0.18" />
            <circle cx="98" cy="74" r="16" fill="#0b1220" />
            <circle cx="84" cy="80" r="9" fill={cor} />
            <circle cx="28" cy="58" r="1.2" fill={cor} />
            <circle cx="48" cy="70" r="0.9" fill="white" fillOpacity="0.8" />
            <circle cx="64" cy="52" r="1.3" fill={cor} />
            <circle cx="108" cy="48" r="0.8" fill="white" />
            <circle cx="36" cy="96" r="0.8" fill="white" fillOpacity="0.7" />
            <circle cx="18" cy="292" r="70" fill="none" stroke={cor} strokeWidth="1.2" />
            <circle cx="8" cy="310" r="96" fill="none" stroke="white" strokeOpacity="0.28" />
            <rect x="8" y="214" width="14" height="58" fill="#243552" />
            <rect x="24" y="178" width="16" height="94" fill="#1b2c49" />
            <rect x="42" y="198" width="12" height="74" fill="#243552" />
            <rect x="56" y="132" width="20" height="140" fill="#16283f" />
            <rect x="78" y="164" width="14" height="108" fill="#1b2c49" />
            <rect x="94" y="148" width="22" height="124" fill="#132238" />
            <rect x="28" y="190" width="2" height="2.4" fill={cor} />
            <rect x="32" y="190" width="2" height="2.4" fill={cor} />
            <rect x="28" y="198" width="2" height="2.4" fill="white" fillOpacity="0.75" />
            <rect x="60" y="146" width="2" height="2.4" fill={cor} />
            <rect x="65" y="146" width="2" height="2.4" fill={cor} />
            <rect x="60" y="154" width="2" height="2.4" fill="white" fillOpacity="0.7" />
            <rect x="65" y="154" width="2" height="2.4" fill={cor} />
            <rect x="60" y="162" width="2" height="2.4" fill={cor} />
            <rect x="82" y="176" width="2" height="2.4" fill={cor} />
            <rect x="86" y="176" width="2" height="2.4" fill="white" fillOpacity="0.7" />
            <rect x="98" y="160" width="2" height="2.4" fill={cor} />
            <rect x="103" y="160" width="2" height="2.4" fill={cor} />
            <rect x="98" y="168" width="2" height="2.4" fill="white" fillOpacity="0.65" />
            <rect x="103" y="176" width="2" height="2.4" fill={cor} />
            <rect x="0" y="272" width="124" height="8" fill="#070d18" />
          </svg>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="relative z-10 max-h-12 w-full object-contain"
            />
          ) : (
            <div
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-[#0c1424]"
              style={{ backgroundColor: cor }}
            >
              {iniciais}
            </div>
          )}
          <p className="relative z-10 mt-3 text-[10px] font-semibold leading-tight">
            {companyName}
          </p>
          <span className="relative z-10 mt-2 h-px w-8" style={{ backgroundColor: cor }} />
          <div className="relative z-10 mt-6 flex items-center gap-2">
            <span className="h-28 w-0.5 shrink-0" style={{ backgroundColor: cor }} />
            <p className="text-[9px] leading-tight text-white/85 [writing-mode:vertical-rl] rotate-180">
              Mais que imóveis, realizamos{" "}
              <span className="font-semibold" style={{ color: cor }}>
                conexões.
              </span>
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
          <div className="pt-1">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-slate-400">
              PROPOSTA DE COMPRA
            </p>
            <h2 className="mt-1 truncate text-lg font-bold leading-tight text-[#162033]">
              {companyName}
            </h2>
            <p className="mt-1 text-[9px] font-semibold tracking-[0.14em] text-slate-500">
              PROPOSTA COMERCIAL
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {data} · {codigo}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2.5 rounded-xl bg-sky-50 px-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-[#162033]">
                <SkylineMark />
              </span>
              <div className="min-w-0">
                <p className="text-[8px] font-semibold tracking-[0.08em] text-slate-400">
                  IDENTIFICAÇÃO DA IMOBILIÁRIA
                </p>
                <p className="truncate text-sm font-bold text-[#162033]">{companyName}</p>
                <p className="truncate text-[11px] text-slate-500">{subtituloImobiliaria}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <UserRound className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[8px] font-semibold tracking-[0.08em] text-slate-400">
                  PROPONENTE
                </p>
                <p className="text-[9px] text-slate-400">NOME DO CLIENTE</p>
                <p className="truncate text-sm font-bold text-[#162033]">
                  {clienteNome.trim() || "----"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)]">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#162033] text-white">
                <Layers className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wide text-[#162033]">
                  PLANO DE PAGAMENTO
                </p>
                <p className="text-[10px] text-slate-400">
                  Condições e valores da proposta
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200/80">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#162033] text-[9px] tracking-[0.08em] text-white">
                    <th className="w-[14%] px-2 py-2 text-center font-semibold">QTD</th>
                    <th className="px-2 py-2 text-left font-semibold">DESCRIÇÃO</th>
                    <th className="w-[24%] px-3 py-2 text-right font-semibold">VALOR</th>
                    <th className="w-[26%] px-3 py-2 text-right font-semibold">
                      SUBTOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.length ? (
                    visiveis.map((linha, index) => (
                      <tr
                        key={`${linha.descricao}-${linha.qtd}-${index}`}
                        className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                      >
                        <td className="px-2 py-2 text-center">
                          <span className="inline-flex min-w-6 justify-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-[#162033]">
                            {linha.qtd}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-semibold text-[#162033]">
                          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sky-400 align-middle" />
                          {linha.descricao}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                          {linha.valor}
                        </td>
                        <td className="px-3 py-2 text-right text-[12px] font-bold tabular-nums text-[#162033]">
                          {linha.subtotal}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-2 py-2 text-center text-slate-400">—</td>
                      <td className="px-2 py-2 text-slate-400">
                        NENHUMA COMPOSIÇÃO INFORMADA
                      </td>
                      <td className="px-2 py-2 text-right text-slate-400">—</td>
                      <td className="px-2 py-2 text-right text-slate-400">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid grid-cols-[1.15fr_1fr] overflow-hidden rounded-xl bg-[#162033] text-white">
              <div className="flex items-center gap-2.5 px-3 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Wallet className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[8px] font-semibold tracking-[0.08em] text-white/60">
                    TOTAL DA COMPOSIÇÃO
                  </p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{brl(total)}</p>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-1.5 bg-white px-3 py-2.5 text-[#162033]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[8px] font-semibold tracking-wide text-slate-400">
                    DESCONTO DO IMÓVEL
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${desconto > 0 ? "bg-rose-50 text-rose-600" : "text-[#162033]"}`}
                  >
                    {desconto > 0 ? `- ${brl(desconto)}` : brl(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
                  <span className="text-[8px] font-semibold tracking-wide text-slate-400">
                    VALOR NEGOCIADO
                  </span>
                  <span className="border-b-2 border-sky-400 text-sm font-bold tabular-nums">
                    {brl(valorNegociado)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-1 text-[9px] text-slate-400">
            <span className="inline-flex items-center gap-2 font-semibold tracking-[0.12em]">
              <span className="h-px w-5 bg-slate-300" />
              {companyName.toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-px w-5 bg-slate-300" />
              Transparência em cada etapa.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

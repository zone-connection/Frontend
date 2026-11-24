import type { Captacao, CaptacaoHistorico } from "@/lib/captacao-api";
import { CAPTACAO_IMOVEL_TIPO_LABEL, imovelCapaUrl } from "@/lib/captacao-api";

export type AcompanhamentoPessoa = {
  nome: string;
  papel: string;
  telefone: string | null;
};

export type AcompanhamentoEvento = {
  id: string;
  at: string;
  titulo: string;
  detalhe: string;
  tom: "critico" | "contato" | "sistema";
};

export type AcompanhamentoTarefa = {
  id: string;
  titulo: string;
  feita: boolean;
  data?: string;
};

export type AcompanhamentoMotivo = {
  titulo: string;
  detalhe: string;
  nivel: "critico" | "atencao" | "info";
};

export type AcompanhamentoItem = {
  id: string;
  fonte: "api" | "demo";
  codigo: string;
  titulo: string;
  fotoUrl: string | null;
  etapa: string;
  pretendido: number | null;
  avaliacao: number | null;
  diasSemMovimento: number;
  ultimoContatoLabel: string;
  origem: string;
  tipoLabel: string;
  endereco: string;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  imovelId: string | null;
  responsavelId: string;
  exclusividade: boolean;
  proprietario: AcompanhamentoPessoa;
  segundaPessoa: AcompanhamentoPessoa;
  historicos: AcompanhamentoEvento[];
  proximosPassosPadrao: string[];
};

const TASKS_KEY = "zone.captacao.acompanhamento.tarefas.v1";
const NOTES_KEY = "zone.captacao.acompanhamento.eventos.v1";

function codigoFromId(id: string, fallback: string) {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  return fallback;
}

export function digitsForWhatsApp(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function gapPretendido(item: Pick<AcompanhamentoItem, "pretendido" | "avaliacao">) {
  if (item.pretendido == null || item.avaliacao == null) return null;
  const delta = item.pretendido - item.avaliacao;
  if (delta <= 0) return { delta: 0, pct: 0 };
  const pct = item.avaliacao > 0 ? (delta / item.avaliacao) * 100 : 0;
  return { delta, pct };
}

export function motivosDaCaptacao(item: AcompanhamentoItem): AcompanhamentoMotivo[] {
  const motivos: AcompanhamentoMotivo[] = [];
  motivos.push({
    titulo: `${item.diasSemMovimento} dias sem contato`,
    detalhe: item.diasSemMovimento >= 14 ? "Crítico" : item.diasSemMovimento >= 7 ? "Atenção" : "Dentro do ritmo",
    nivel: item.diasSemMovimento >= 14 ? "critico" : item.diasSemMovimento >= 7 ? "atencao" : "info",
  });
  const gap = gapPretendido(item);
  if (gap && gap.delta > 0) {
    motivos.push({
      titulo: `Valor ${gap.pct.toFixed(1).replace(".", ",")}% acima da avaliação`,
      detalhe: "Atenção",
      nivel: gap.pct >= 8 ? "atencao" : "info",
    });
  }
  motivos.push({
    titulo: "Etapa atual",
    detalhe: item.etapa,
    nivel: "info",
  });
  return motivos;
}

export function passosPadrao(item: AcompanhamentoItem): AcompanhamentoTarefa[] {
  const gap = gapPretendido(item);
  const titulos = [
    `Entrar em contato com ${item.proprietario.nome.split(" ")[0]}`,
    ...(gap && gap.delta > 0
      ? ["Conversar sobre diferença de avaliação", "Apresentar possibilidade de ajuste no valor"]
      : ["Apresentar novas opções"]),
    "Atualizar negociação",
  ];
  return titulos.map((titulo, i) => ({ id: `d${i}`, titulo, feita: false }));
}

function readStore<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, T>;
  } catch {
    return {};
  }
}

function writeStore<T>(key: string, value: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadTarefas(item: AcompanhamentoItem): AcompanhamentoTarefa[] {
  const all = readStore<AcompanhamentoTarefa[]>(TASKS_KEY);
  return all[item.id]?.length ? all[item.id] : passosPadrao(item);
}

export function saveTarefas(id: string, tarefas: AcompanhamentoTarefa[]) {
  const all = readStore<AcompanhamentoTarefa[]>(TASKS_KEY);
  all[id] = tarefas;
  writeStore(TASKS_KEY, all);
}

export function loadEventosLocais(id: string): AcompanhamentoEvento[] {
  const all = readStore<AcompanhamentoEvento[]>(NOTES_KEY);
  return all[id] ?? [];
}

export function appendEventoLocal(id: string, evento: AcompanhamentoEvento) {
  const all = readStore<AcompanhamentoEvento[]>(NOTES_KEY);
  all[id] = [evento, ...(all[id] ?? [])];
  writeStore(NOTES_KEY, all);
}

function diasFromMs(ms: number) {
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function captacaoToAcompanhamento(c: Captacao): AcompanhamentoItem {
  const lastMs = c.monitoramento?.tempoSemMovimentacaoMs;
  const dias =
    lastMs != null
      ? diasFromMs(lastMs)
      : diasFromMs(Date.now() - new Date(c.updatedAt).getTime());
  const foto = imovelCapaUrl(c.imovel);
  const cidade = [c.imovel.bairro, c.imovel.cidade, c.imovel.estado].filter(Boolean).join(", ");
  const historicos = (c.historicos ?? []).map((h) => historicoToEvento(h));
  if (dias >= 7) {
    historicos.unshift({
      id: `parada-${c.id}`,
      at: new Date().toISOString(),
      titulo: "Captação parada",
      detalhe: `${dias} dias sem contato`,
      tom: "critico",
    });
  }
  return {
    id: c.id,
    fonte: "api",
    codigo: codigoFromId(c.id, "0000"),
    titulo: c.imovel.titulo || "Imóvel sem título",
    fotoUrl: foto,
    etapa: c.funilEtapa.label,
    pretendido: c.valorPretendido,
    avaliacao: c.valorAvaliacao,
    diasSemMovimento: dias,
    ultimoContatoLabel: c.monitoramento?.tempoSemMovimentacaoLabel
      ? `há ${c.monitoramento.tempoSemMovimentacaoLabel}`
      : dias > 0
        ? `há ${dias} dias`
        : "hoje",
    origem: c.origem || "CRM",
    tipoLabel: CAPTACAO_IMOVEL_TIPO_LABEL[c.imovel.tipo] ?? c.imovel.tipo,
    endereco: cidade || "Endereço não informado",
    quartos: c.imovel.quartos,
    banheiros: c.imovel.banheiros,
    vagas: c.imovel.vagas,
    imovelId: c.imovel.id,
    responsavelId: c.responsavel.id,
    exclusividade: c.exclusividade,
    proprietario: {
      nome: c.proprietario.nome,
      papel: "Proprietário",
      telefone: c.proprietario.telefone ?? null,
    },
    segundaPessoa: {
      nome: c.responsavel.name,
      papel: "Corretor",
      telefone: null,
    },
    historicos,
    proximosPassosPadrao: [],
  };
}

function historicoToEvento(h: CaptacaoHistorico): AcompanhamentoEvento {
  const tipo = h.tipo.toLowerCase();
  return {
    id: h.id,
    at: h.createdAt,
    titulo: tipo === "etapa" ? "Etapa" : tipo === "valor" ? "Valor" : "Registro",
    detalhe: h.texto,
    tom: "sistema",
  };
}

export function mergeEventos(item: AcompanhamentoItem): AcompanhamentoEvento[] {
  const locais = loadEventosLocais(item.id);
  return [...locais, ...item.historicos].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export function grupoTimelineLabel(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const same =
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate();
  if (same) return "HOJE";
  return d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "")
    .toUpperCase();
}

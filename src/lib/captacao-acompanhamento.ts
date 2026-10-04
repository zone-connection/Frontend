import type { Captacao, CaptacaoHistorico } from "@/lib/captacao-api";
import { CAPTACAO_IMOVEL_TIPO_LABEL, imovelCapaUrl } from "@/lib/captacao-api";
import type { CaptacaoParada } from "@/lib/demo-operacao-usados";

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
  proprietario: AcompanhamentoPessoa;
  segundaPessoa: AcompanhamentoPessoa;
  historicos: AcompanhamentoEvento[];
  proximosPassosPadrao: string[];
};

const FOTOS_DEMO: Record<string, string> = {
  c1: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  c2: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
  c3: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
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

function defaultTasks(item: AcompanhamentoItem): AcompanhamentoTarefa[] {
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
  return all[item.id]?.length ? all[item.id] : defaultTasks(item);
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

export function paradaToAcompanhamento(p: CaptacaoParada): AcompanhamentoItem {
  const extras = DEMO_EXTRAS[p.id];
  return {
    id: p.id,
    fonte: "demo",
    codigo: extras?.codigo ?? codigoFromId(p.id, "1000"),
    titulo: p.imovel,
    fotoUrl: extras?.fotoUrl ?? FOTOS_DEMO[p.id] ?? null,
    etapa: p.etapa,
    pretendido: p.pretendido,
    avaliacao: p.avaliacao,
    diasSemMovimento: p.diasSemMovimento,
    ultimoContatoLabel: p.ultimoContato,
    origem: extras?.origem ?? "Portal",
    tipoLabel: extras?.tipoLabel ?? "Imóvel",
    endereco: extras?.endereco ?? "",
    quartos: extras?.quartos ?? null,
    banheiros: extras?.banheiros ?? null,
    vagas: extras?.vagas ?? null,
    imovelId: null,
    proprietario: {
      nome: p.proprietario,
      papel: "Proprietário",
      telefone: extras?.telProprietario ?? null,
    },
    segundaPessoa: {
      nome: extras?.segundaNome ?? p.responsavel,
      papel: extras?.segundaPapel ?? "Corretor",
      telefone: extras?.telSegunda ?? null,
    },
    historicos: extras?.historicos ?? [],
    proximosPassosPadrao: extras?.passos ?? [],
  };
}

const DEMO_EXTRAS: Record<
  string,
  {
    codigo: string;
    fotoUrl: string;
    origem: string;
    tipoLabel: string;
    endereco: string;
    quartos: number;
    banheiros: number;
    vagas: number;
    telProprietario: string;
    segundaNome: string;
    segundaPapel: string;
    telSegunda: string;
    passos: string[];
    historicos: AcompanhamentoEvento[];
  }
> = {
  c1: {
    codigo: "4587",
    fotoUrl: FOTOS_DEMO.c1,
    origem: "Portal",
    tipoLabel: "Casa",
    endereco: "Cajuru, Recife - PE",
    quartos: 3,
    banheiros: 2,
    vagas: 2,
    telProprietario: "(81) 98811-4501",
    segundaNome: "Marina Alves",
    segundaPapel: "Interessada",
    telSegunda: "(81) 98722-3309",
    passos: [
      "Entrar em contato com o cliente",
      "Apresentar novas opções",
      "Atualizar no sistema",
    ],
    historicos: [
      {
        id: "c1-p",
        at: new Date().toISOString(),
        titulo: "Captação parada",
        detalhe: "21 dias sem contato",
        tom: "critico",
      },
      {
        id: "c1-w",
        at: "2026-09-21T15:00:00.000Z",
        titulo: "WhatsApp",
        detalhe: "Cliente informou que iria analisar",
        tom: "contato",
      },
      {
        id: "c1-l",
        at: "2026-09-14T14:00:00.000Z",
        titulo: "Ligação",
        detalhe: "Avaliação realizada",
        tom: "contato",
      },
      {
        id: "c1-c",
        at: "2026-09-08T12:00:00.000Z",
        titulo: "Captação criada",
        detalhe: "Origem: Portal",
        tom: "sistema",
      },
    ],
  },
  c2: {
    codigo: "3120",
    fotoUrl: FOTOS_DEMO.c2,
    origem: "Indicação",
    tipoLabel: "Apartamento",
    endereco: "Água Verde, Curitiba - PR",
    quartos: 3,
    banheiros: 2,
    vagas: 2,
    telProprietario: "(41) 99910-2211",
    segundaNome: "Rafael Costa",
    segundaPapel: "Corretor",
    telSegunda: "(41) 98877-1100",
    passos: [
      "Entrar em contato com o cliente",
      "Apresentar novas opções",
      "Atualizar no sistema",
    ],
    historicos: [
      {
        id: "c2-p",
        at: new Date().toISOString(),
        titulo: "Captação parada",
        detalhe: "14 dias sem contato",
        tom: "critico",
      },
      {
        id: "c2-d",
        at: "2026-09-20T11:00:00.000Z",
        titulo: "Documentos",
        detalhe: "Aguardando escritura atualizada",
        tom: "sistema",
      },
      {
        id: "c2-c",
        at: "2026-09-06T12:00:00.000Z",
        titulo: "Captação criada",
        detalhe: "Origem: Indicação",
        tom: "sistema",
      },
    ],
  },
  c3: {
    codigo: "2708",
    fotoUrl: FOTOS_DEMO.c3,
    origem: "Portal",
    tipoLabel: "Sala comercial",
    endereco: "Centro, Recife - PE",
    quartos: 0,
    banheiros: 1,
    vagas: 1,
    telProprietario: "(81) 98765-4410",
    segundaNome: "Camila Souza",
    segundaPapel: "Interessada",
    telSegunda: "(81) 98111-7788",
    passos: [
      "Entrar em contato com o cliente",
      "Apresentar novas opções",
      "Atualizar no sistema",
    ],
    historicos: [
      {
        id: "c3-p",
        at: new Date().toISOString(),
        titulo: "Captação parada",
        detalhe: "9 dias sem contato",
        tom: "critico",
      },
      {
        id: "c3-v",
        at: "2026-09-25T16:00:00.000Z",
        titulo: "Visita técnica",
        detalhe: "Medição e fotos internas",
        tom: "contato",
      },
      {
        id: "c3-c",
        at: "2026-09-18T12:00:00.000Z",
        titulo: "Captação criada",
        detalhe: "Origem: Portal",
        tom: "sistema",
      },
    ],
  },
};

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

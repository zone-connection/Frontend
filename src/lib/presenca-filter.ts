import type {
  PresencaComparativoUsuario,
  PresencaMes,
  PresencaNatureza,
  PresencaResumo,
  PresencaUsuario,
} from "@/lib/presenca-api";

export type PresencaFiltroNatureza =
  | "todos"
  | "veio"
  | "falta"
  | "justificada"
  | "sem_marca";

export const PRESENCA_FILTRO_NATUREZA: {
  id: PresencaFiltroNatureza;
  label: string;
}[] = [
  { id: "todos", label: "Todos os tipos" },
  { id: "veio", label: "Vieram" },
  { id: "falta", label: "Com falta" },
  { id: "justificada", label: "Justificada" },
  { id: "sem_marca", label: "Sem marca" },
];

function veio(natureza: PresencaNatureza) {
  return natureza === "presente" || natureza === "meio_periodo";
}

function peso(natureza: PresencaNatureza) {
  if (natureza === "presente") return 1;
  if (natureza === "meio_periodo") return 0.5;
  return 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function userMatchesNatureza(
  user: PresencaUsuario,
  filtro: PresencaFiltroNatureza,
) {
  const cells = Object.values(user.dias).filter(Boolean);
  if (filtro === "todos") return true;
  if (filtro === "sem_marca") return cells.length === 0;
  if (filtro === "veio") {
    return cells.some((c) => veio(c!.natureza));
  }
  if (filtro === "falta") {
    return cells.some((c) => c!.natureza === "falta");
  }
  if (filtro === "justificada") {
    return cells.some((c) => c!.natureza === "falta_justificada");
  }
  return true;
}

export function buildResumoFromGrid(
  dias: string[],
  usuarios: PresencaUsuario[],
): PresencaResumo {
  const porDia = dias.map((d) => {
    let vieram = 0;
    let equivalente = 0;
    let faltas = 0;
    let justificadas = 0;
    for (const u of usuarios) {
      const cell = u.dias[d];
      if (!cell) continue;
      if (veio(cell.natureza)) vieram += 1;
      equivalente += peso(cell.natureza);
      if (cell.natureza === "falta") faltas += 1;
      if (cell.natureza === "falta_justificada") justificadas += 1;
    }
    return { data: d, vieram, equivalente, faltas, justificadas };
  });
  const n = dias.length || 1;
  return {
    porDia,
    mediaVieram: round2(porDia.reduce((s, x) => s + x.vieram, 0) / n),
    mediaEquivalente: round2(
      porDia.reduce((s, x) => s + x.equivalente, 0) / n,
    ),
    totalVieramDia: porDia.reduce((s, x) => s + x.vieram, 0),
  };
}

function resumoAnteriorFiltrado(
  data: PresencaMes,
  comparativo: PresencaComparativoUsuario[],
) {
  const nAnt = data.resumoAnterior.porDia.length || 1;
  const presentes = comparativo.reduce((s, c) => s + c.anterior.presentes, 0);
  const equivalente = comparativo.reduce(
    (s, c) => s + c.anterior.equivalente,
    0,
  );
  return {
    ...data.resumoAnterior,
    mediaVieram: round2(presentes / nAnt),
    mediaEquivalente: round2(equivalente / nAnt),
    totalVieramDia: presentes,
  };
}

export function applyPresencaFiltros(
  data: PresencaMes,
  userIds: string[],
  natureza: PresencaFiltroNatureza,
): PresencaMes {
  let usuarios = data.usuarios;
  if (userIds.length) {
    const allow = new Set(userIds);
    usuarios = usuarios.filter((u) => allow.has(u.userId));
  }
  usuarios = usuarios.filter((u) => userMatchesNatureza(u, natureza));
  const ids = new Set(usuarios.map((u) => u.userId));
  const comparativoUsuarios = (data.comparativoUsuarios ?? []).filter((c) =>
    ids.has(c.userId),
  );
  return {
    ...data,
    usuarios,
    comparativoUsuarios,
    resumo: buildResumoFromGrid(data.dias, usuarios),
    resumoAnterior: resumoAnteriorFiltrado(data, comparativoUsuarios),
  };
}

export function labelPresencaFiltros(
  data: PresencaMes,
  userIds: string[],
  natureza: PresencaFiltroNatureza,
) {
  const parts: string[] = [];
  if (userIds.length === 1) {
    const nome = data.usuarios.find((u) => u.userId === userIds[0])?.nome;
    parts.push(nome ? `Pessoa: ${nome}` : "1 pessoa");
  } else if (userIds.length > 1) {
    parts.push(`${userIds.length} pessoas`);
  }
  if (natureza !== "todos") {
    const label =
      PRESENCA_FILTRO_NATUREZA.find((n) => n.id === natureza)?.label ??
      natureza;
    parts.push(label);
  }
  return parts.length ? parts.join(" · ") : "Equipe completa";
}

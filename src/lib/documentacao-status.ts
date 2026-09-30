import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";

/** Remove acentos, caixa e caracteres não alfanuméricos. */
export function normalizeDocStatus(
  status: string | null | undefined,
): string {
  if (!status) return "";
  return status
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export type DocStatus1Group =
  | "aprovado"
  | "reprovado"
  | "pre_analise"
  | "analise";
export type DocStatus2Group = "vendido" | "andamento" | "bacen";

export function status1Group(
  status: string | null | undefined,
): DocStatus1Group | null {
  const n = normalizeDocStatus(status);
  if (!n) return null;
  if (n.startsWith("reprov")) return "reprovado";
  // Não agrupa "Aprovado c/ restrição" com "Aprovado" (badge usa docCreditoParecer).
  if (
    n === "aprovado" ||
    n === "aprovada" ||
    n === "aprovados" ||
    n === "aprovadas"
  ) {
    return "aprovado";
  }
  // Antes de "analise": "preanalise" contém a substring "analise".
  if (
    n.startsWith("preanalise") ||
    n.includes("preanalise") ||
    n === "preanalise"
  ) {
    return "pre_analise";
  }
  if (n.includes("analise")) return "analise";
  return null;
}

export function status2Group(
  status: string | null | undefined,
): DocStatus2Group | null {
  const n = normalizeDocStatus(status);
  if (!n) return null;
  if (
    n === "vendido" ||
    n === "venda" ||
    n === "vendidos" ||
    n === "vendida" ||
    n === "vendidas" ||
    n.startsWith("vendid")
  ) {
    return "vendido";
  }
  if (n.includes("andamento")) return "andamento";
  if (n.includes("bacen")) return "bacen";
  return null;
}

export function isStatusVendido(
  status: string | null | undefined,
): boolean {
  return status2Group(status) === "vendido";
}

/** Venda na etapa, ficha vendida ou VGV preenchido não entra na redistribuição. */
export function leadPodeRedistribuir(
  lead: {
    podeRedistribuir?: boolean | null;
    documentacaoStatus2?: string | null;
    documentacaoVgv?: number | null;
  },
  papel?: string | null,
): boolean {
  if (papel === "venda") return false;
  if (isStatusVendido(lead.documentacaoStatus2)) return false;
  if (lead.documentacaoVgv != null) return false;
  if (lead.podeRedistribuir === false) return false;
  return true;
}

export function isStatusAnalise(
  status: string | null | undefined,
): boolean {
  const g = status1Group(status);
  return g === "analise" || g === "pre_analise";
}

export function isStatusPreAnalise(
  status: string | null | undefined,
): boolean {
  return status1Group(status) === "pre_analise";
}

/** Parecer final do Status 1 (aprovado ou reprovado). */
export function isStatusParecerFinal(
  status: string | null | undefined,
): boolean {
  const g = status1Group(status);
  return g === "aprovado" || g === "reprovado";
}

/** Parecer final de crédito (Status 1 da documentação). */
export type DocCreditoParecer =
  | "aprovado"
  | "reprovado"
  | "aprovado_restricao";

export function docCreditoParecer(
  status1: string | null | undefined,
): DocCreditoParecer | null {
  const n = normalizeDocStatus(status1);
  if (!n) return null;
  if (n.startsWith("reprov")) return "reprovado";
  if (
    n.includes("restric") ||
    n.includes("restricao") ||
    n.includes("comrestr")
  ) {
    return "aprovado_restricao";
  }
  if (n.startsWith("aprov")) return "aprovado";
  return null;
}

export const DOC_CREDITO_PARECER_LABEL: Record<DocCreditoParecer, string> = {
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  aprovado_restricao: "Aprovado c/ restrição",
};

export function docCreditoParecerBadgeClass(
  parecer: DocCreditoParecer,
): string {
  const size = STATUS_CHIP_CLASS;
  if (parecer === "aprovado") {
    return `${size} border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
  }
  if (parecer === "reprovado") {
    return `${size} border-destructive/40 bg-destructive/10 text-destructive`;
  }
  return `${size} border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200`;
}

/** Badge do Status 1 no card do funil (qualquer valor da ficha). */
export function docStatus1BadgeClass(
  status1: string | null | undefined,
): string {
  const parecer = docCreditoParecer(status1);
  if (parecer) return docCreditoParecerBadgeClass(parecer);
  const size = STATUS_CHIP_CLASS;
  const group = status1Group(status1);
  if (group === "analise" || group === "pre_analise") {
    return `${size} border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300`;
  }
  return `${size} border-border bg-muted/60 text-muted-foreground`;
}

/** Classes da tag compacta (pill + bolinha) do Status 1 no funil. */
export function docStatus1FunilTagClasses(status1: string): {
  wrap: string;
  dot: string;
} {
  const parecer = docCreditoParecer(status1);
  const group = status1Group(status1);
  if (parecer === "aprovado") {
    return {
      wrap: "border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }
  if (parecer === "reprovado") {
    return {
      wrap: "border-destructive/40 bg-destructive/10 text-destructive",
      dot: "bg-destructive",
    };
  }
  if (parecer === "aprovado_restricao") {
    return {
      wrap: "border-amber-500/45 bg-amber-500/10 text-amber-800 dark:text-amber-200",
      dot: "bg-amber-500",
    };
  }
  if (group === "analise" || group === "pre_analise") {
    return {
      wrap: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
      dot: "bg-violet-500",
    };
  }
  return {
    wrap: "border-border bg-muted/60 text-muted-foreground",
    dot: "bg-muted-foreground",
  };
}

/** Status 1 de documentação aprovado (inclui "Aprovado c/ restrição"). */
export function isStatusAprovadoDoc(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  const raw = status
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return raw.startsWith("aprov");
}

/** Compara status considerando variantes semânticas (VENDIDO/venda, etc.). */
export function statusesMatch(a: string, b: string): boolean {
  const na = normalizeDocStatus(a);
  const nb = normalizeDocStatus(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const g1a = status1Group(a);
  const g1b = status1Group(b);
  if (g1a && g1b && g1a === g1b) return true;
  const g2a = status2Group(a);
  const g2b = status2Group(b);
  if (g2a && g2b && g2a === g2b) return true;
  return false;
}

export function canonicalizeStatus1(status: string): string {
  const g = status1Group(status);
  if (g === "aprovado") return "Aprovado";
  if (g === "reprovado") return "Reprovado";
  if (g === "pre_analise") return "Pré-análise";
  if (g === "analise") return "Em análise";
  return status.trim();
}

export function canonicalizeStatus2(status: string): string {
  const g = status2Group(status);
  if (g === "vendido") return "Vendido";
  if (g === "andamento") return "Andamento";
  if (g === "bacen") return "Bacen";
  return status.trim();
}

export type DocPipelineStatus = "aprovado" | "reprovado" | "analise";

/** Mesmo critério dos cards de pipeline (dashboard / documentação). */
export function matchesDocPipelineStatus(
  status1: string | null | undefined,
  pipeline: DocPipelineStatus,
): boolean {
  const raw = (status1 ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!raw) return false;
  if (pipeline === "reprovado") return raw.startsWith("reprov");
  if (pipeline === "aprovado") return raw.startsWith("aprov");
  return raw.includes("analise");
}

export function docPipelineFromStatus1(
  status1: string | null | undefined,
): DocPipelineStatus | null {
  if (!status1 || status1 === "__all__") return null;
  if (isStatusAprovadoDoc(status1)) return "aprovado";
  if (status1Group(status1) === "reprovado") return "reprovado";
  if (isStatusAnalise(status1)) return "analise";
  return null;
}

/** Primeiro rótulo do catálogo que bate com a preferência, senão o primeiro item. */
export function pickCatalogLabel(
  options: readonly string[],
  preferred: readonly string[],
): string {
  for (const want of preferred) {
    const key = normalizeDocStatus(want);
    const found = options.find((item) => normalizeDocStatus(item) === key);
    if (found) return found.trim();
  }
  return options[0]?.trim() ?? "";
}

/** Deduplica só grafias iguais. Não junta “Aprovado” com “Aprovado c/ restrição”. */
export function dedupeStatusOptions(
  labels: string[],
  _kind: "status1" | "status2",
): string[] {
  const byKey = new Map<string, string>();
  for (const label of labels) {
    if (!label?.trim()) continue;
    const key = normalizeDocStatus(label);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, label.trim());
  }
  return [...byKey.values()];
}

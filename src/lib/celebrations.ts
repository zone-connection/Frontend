import { toast } from "sonner";
import { getSession, type Role } from "@/lib/auth";
import { isCorretorLike } from "@/lib/permissions";
import { fetchDocumentacoes } from "@/lib/documentacao-api";
import { isStatusVendido } from "@/lib/documentacao-status";
import { fetchMetas, META_TIPO_LABEL, type Meta } from "@/lib/metas-api";

const MILESTONE_STEP = 3;
const TOAST_MS = 9000;

type CelebrateOpts = {
  /** Corretor creditado na ficha. */
  corretorId?: string | null;
  /** Nova ficha (conta para milestone/meta de documentações). */
  docCreated?: boolean;
  /** Acabou de marcar status2 como vendido. */
  becameVendido?: boolean;
};

function storageKey(part: string) {
  return `crm-celebrate:${part}`;
}

function alreadyCelebrated(key: string) {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(storageKey(key)) === "1";
  } catch {
    return false;
  }
}

function markCelebrated(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(key), "1");
  } catch {
    /* ignore quota */
  }
}

function celebrateToast(title: string, description: string) {
  toast.success(title, {
    description,
    duration: TOAST_MS,
  });
}

function shouldRunForRole(role: Role): boolean {
  return (
    role === "corretor" ||
    role === "treinee" ||
    role === "gerente" ||
    role === "admin"
  );
}

/** Meta pessoal do corretor, ou meta ampla da imobiliária. */
function metaRelevant(
  meta: Meta,
  corretorId: string,
  role: Role,
): boolean {
  if (meta.escopo === "corretor") {
    return meta.corretorId === corretorId;
  }
  if (meta.escopo === "imobiliaria") {
    return true;
  }
  // Meta de gerente/equipe: gerente e admin veem; corretor da equipe também.
  if (meta.escopo === "gerente") {
    return role === "gerente" || role === "admin" || isCorretorLike(role);
  }
  return false;
}

/**
 * Após criar/atualizar documentação (ou marcar venda), verifica
 * milestones 3/6/9… e metas batidas, e exibe toast de parabéns.
 */
export async function celebrateAfterDocumentacao(
  opts: CelebrateOpts,
): Promise<void> {
  const session = getSession();
  if (!session || !shouldRunForRole(session.role)) return;
  if (!opts.docCreated && !opts.becameVendido) return;

  const corretorId =
    opts.corretorId?.trim() ||
    (isCorretorLike(session.role) ? session.id : "");
  if (!corretorId) return;

  // Corretor só celebra o próprio progresso.
  if (isCorretorLike(session.role) && corretorId !== session.id) return;

  try {
    const docs = await fetchDocumentacoes(corretorId);
    const docCount = docs.length;
    const vendaCount = docs.filter((d) => isStatusVendido(d.status2)).length;

    const messages: Array<{ title: string; description: string }> = [];

    if (opts.docCreated && docCount > 0 && docCount % MILESTONE_STEP === 0) {
      const key = `docs:${corretorId}:${docCount}`;
      if (!alreadyCelebrated(key)) {
        markCelebrated(key);
        messages.push({
          title: "Parabéns!",
          description: `Você chegou a ${docCount} documentações. Continue assim!`,
        });
      }
    }

    if (
      opts.becameVendido &&
      vendaCount > 0 &&
      vendaCount % MILESTONE_STEP === 0
    ) {
      const key = `vendas:${corretorId}:${vendaCount}`;
      if (!alreadyCelebrated(key)) {
        markCelebrated(key);
        messages.push({
          title: "Parabéns pela venda!",
          description: `Você chegou a ${vendaCount} vendas. Excelente resultado!`,
        });
      }
    }

    const metas = await fetchMetas();
    for (const meta of metas) {
      if (meta.percentual < 100) continue;
      if (!metaRelevant(meta, corretorId, session.role)) continue;
      if (meta.tipo === "documentacoes" && !opts.docCreated) continue;
      if (meta.tipo === "vendas" && !opts.becameVendido) continue;
      if (meta.tipo === "vgv" && !opts.becameVendido) continue;

      const key = `meta:${meta.id}:${meta.inicio}`;
      if (alreadyCelebrated(key)) continue;
      markCelebrated(key);

      const tipoLabel = META_TIPO_LABEL[meta.tipo];
      const nome = meta.titulo?.trim() || tipoLabel;
      messages.push({
        title: "Meta batida!",
        description: `Parabéns! Você atingiu a meta “${nome}”.`,
      });
    }

    messages.forEach((msg, i) => {
      window.setTimeout(() => {
        celebrateToast(msg.title, msg.description);
      }, i * 700);
    });
  } catch {
    // Celebração é best-effort; não bloqueia o fluxo principal.
  }
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { DocumentosPanel } from "@/components/documentos-panel";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  downloadArquivoFile,
  fetchArquivos,
  saveBlob,
  type ArquivoDocumento,
} from "@/lib/arquivos-api";
import { formatPhone } from "@/lib/phone";
import {
  PROCESSO_ETAPA_LABEL,
  type Processo,
  type ProcessoPendencia,
} from "@/lib/processos-api";
import { SOFT_BTN } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
} from "lucide-react";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function isImageMime(mime?: string, nome?: string) {
  const m = (mime || "").toLowerCase();
  const n = (nome || "").toLowerCase();
  return m.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(n);
}

function isPdfMime(mime?: string, nome?: string) {
  const m = (mime || "").toLowerCase();
  const n = (nome || "").toLowerCase();
  return m.includes("pdf") || n.endsWith(".pdf");
}

function canPreview(mime?: string, nome?: string) {
  return isPdfMime(mime, nome) || isImageMime(mime, nome);
}

function origemArquivo(
  id: string,
  processo: Processo,
  item?: ArquivoDocumento,
): string {
  for (const p of processo.pendencias ?? []) {
    if (p.arquivoIds.includes(id)) {
      return `Anexo da análise · ${p.titulo}`;
    }
    for (const c of p.correcoes) {
      if (c.arquivoIds.includes(id)) {
        return `Correção de retrabalho · ${p.titulo}`;
      }
    }
  }
  if (item?.categoria === "ficha") return "Documentação original";
  if (item?.categoria === "outro") return "Documento complementar";
  return "Documento do processo";
}

export function ProcessoArquivoAcoes({
  arquivoId,
  nome,
  mime,
}: {
  arquivoId: string;
  nome?: string;
  mime?: string;
}) {
  const [busy, setBusy] = useState<"ver" | "baixar" | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    kind: "pdf" | "image";
    title: string;
  } | null>(null);

  async function baixar() {
    setBusy("baixar");
    try {
      const { blob, filename } = await downloadArquivoFile(arquivoId);
      saveBlob(blob, filename || nome || "documento");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha no download.");
    } finally {
      setBusy(null);
    }
  }

  async function ver() {
    setBusy("ver");
    try {
      const { blob, filename } = await downloadArquivoFile(arquivoId);
      const kind = isImageMime(mime || blob.type, filename || nome)
        ? "image"
        : "pdf";
      if (!canPreview(mime || blob.type, filename || nome)) {
        saveBlob(blob, filename || nome || "documento");
        toast.message("Formato sem visualização interna. O download foi iniciado.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setPreview({ url, kind, title: filename || nome || "Documento" });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível abrir o arquivo.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex w-full flex-col items-end gap-2">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={SOFT_BTN}
          disabled={busy !== null}
          onClick={() => void ver()}
        >
          {busy === "ver" ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="mr-1 h-3.5 w-3.5" />
          )}
          Visualizar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={SOFT_BTN}
          disabled={busy !== null}
          onClick={() => void baixar()}
        >
          {busy === "baixar" ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1 h-3.5 w-3.5" />
          )}
          Baixar
        </Button>
      </div>
      {preview ? (
        <div className="w-full min-w-[min(100%,42rem)] space-y-2 rounded-xl border border-primary/15 bg-muted/30 p-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="truncate text-xs font-medium">{preview.title}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
            >
              Fechar
            </Button>
          </div>
          {preview.kind === "image" ? (
            <img
              src={preview.url}
              alt={preview.title}
              className="mx-auto max-h-[28rem] w-auto max-w-full rounded-lg object-contain"
            />
          ) : (
            <iframe
              title={preview.title}
              src={preview.url}
              className="h-[28rem] w-full rounded-lg border bg-white"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function HeaderCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#D3EBF5] bg-white px-3 py-2 dark:border-[#079ED4]/25 dark:bg-[#141a22]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#05749E] dark:text-[#7DD3FC]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-[#0B3148] dark:text-[#f8fafc]">
        {value.trim() || "Não informado"}
      </p>
    </div>
  );
}

export function ProcessoDossie({
  processo,
  allowUpload,
  uploadNonce,
}: {
  processo: Processo;
  allowUpload: boolean;
  uploadNonce: number;
}) {
  const [arquivos, setArquivos] = useState<ArquivoDocumento[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setArquivos(
        await fetchArquivos({ entityType: "processo", entityId: processo.id }),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os documentos.",
      );
    } finally {
      setLoading(false);
    }
  }, [processo.id]);

  useEffect(() => {
    void load();
  }, [load, uploadNonce, processo.pendencias, processo.updatedAt]);

  const porId = useMemo(
    () => new Map(arquivos.map((a) => [a.id, a])),
    [arquivos],
  );

  const originais = arquivos.filter((a) => a.categoria === "ficha");
  const idsPendencia = new Set(
    (processo.pendencias ?? []).flatMap((p) => [
      ...p.arquivoIds,
      ...p.correcoes.flatMap((c) => c.arquivoIds),
    ]),
  );
  const complementares = arquivos.filter(
    (a) => a.categoria !== "ficha" && !idsPendencia.has(a.id),
  );

  const historicoDocs = useMemo(() => {
    const rows: {
      key: string;
      when: string;
      titulo: string;
      detalhe: string;
      ids: string[];
    }[] = [];
    for (const a of originais) {
      rows.push({
        key: `orig-${a.id}`,
        when: a.createdAt,
        titulo: "Documentação original",
        detalhe: `${a.nome}${a.uploadedBy ? ` · ${a.uploadedBy.name}` : ""}`,
        ids: [a.id],
      });
    }
    for (const p of processo.pendencias ?? []) {
      if (p.arquivoIds.length) {
        rows.push({
          key: `pend-${p.id}`,
          when: p.createdAt,
          titulo: `Pendência · ${p.titulo}`,
          detalhe: `${p.autor.name} anexou ${p.arquivoIds.length} arquivo(s)`,
          ids: p.arquivoIds,
        });
      }
      for (const c of p.correcoes) {
        rows.push({
          key: `corr-${c.id}`,
          when: c.createdAt,
          titulo: `Correção · ${p.titulo}`,
          detalhe: `${c.autor.name}${c.comentario ? ` · ${c.comentario}` : ""}`,
          ids: c.arquivoIds,
        });
      }
    }
    return rows.sort(
      (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime(),
    );
  }, [originais, processo.pendencias]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#D3EBF5] bg-gradient-to-br from-white via-[#F3FAFD] to-[#E7F4FA] p-4 dark:border-[#079ED4]/25 dark:from-[#141a22] dark:via-[#102838] dark:to-[#0f1c24]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#05749E] dark:text-[#7DD3FC]">
          Cabeçalho do processo
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Dados enviados no cadastro e no encaminhamento, reunidos para a análise.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <HeaderCell label="Nome" value={processo.nome} />
          <HeaderCell
            label="Tipo"
            value={processo.lead?.tipo === "cliente" ? "Cliente" : "Lead"}
          />
          <HeaderCell label="Fonte" value={processo.fonte} />
          <HeaderCell
            label="Telefone"
            value={formatPhone(processo.telefone) || processo.telefone}
          />
          <HeaderCell label="E-mail" value={processo.email} />
          <HeaderCell label="Estado civil" value={processo.estadoCivil} />
          <HeaderCell label="Tipo de renda" value={processo.tipoRenda} />
          <HeaderCell label="Cotista" value={processo.cotista ? "Sim" : "Não"} />
          <HeaderCell
            label="Dependente"
            value={processo.dependente ? "Sim" : "Não"}
          />
          <HeaderCell
            label="Empreendimento"
            value={processo.empreendimento?.nome ?? ""}
          />
          <HeaderCell label="Corretor" value={processo.corretor?.name ?? ""} />
          <HeaderCell label="Gerente" value={processo.gerente?.name ?? ""} />
          <HeaderCell
            label="Etapa atual"
            value={PROCESSO_ETAPA_LABEL[processo.etapa]}
          />
          <HeaderCell
            label="Cadastrado em"
            value={formatWhen(processo.createdAt)}
          />
          <HeaderCell
            label="Enviado em"
            value={processo.enviadoAt ? formatWhen(processo.enviadoAt) : ""}
          />
        </div>
      </div>

      <DocumentosPanel
        entityType="processo"
        entityId={processo.id}
        extraVinculo={{
          entityType: "lead",
          entityId: processo.leadId,
        }}
        related={{
          entityType: "lead",
          entityId: processo.leadId,
          label: "ficha do lead/cliente",
        }}
        title="Documentação completa"
        allowUpload={allowUpload}
        uploadNonce={uploadNonce}
      />

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Organizando arquivos do
          fluxo…
        </p>
      ) : (
        <>
          {complementares.length > 0 ? (
            <ArquivoGrupo
              titulo="Documentos complementares"
              descricao="Arquivos enviados fora da ficha original, inclusive retornos da análise."
              itens={complementares}
              processo={processo}
            />
          ) : null}

          {(processo.pendencias?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Pendências e correções</p>
              {(processo.pendencias as ProcessoPendencia[]).map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-primary/10 bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{p.titulo}</p>
                    <span className="text-xs text-muted-foreground">
                      {p.autor.name} · {formatWhen(p.createdAt)}
                    </span>
                  </div>
                  {p.descricao ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm">{p.descricao}</p>
                  ) : null}
                  {p.textoComplementar ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.textoComplementar}
                    </p>
                  ) : null}
                  <ArquivoLista
                    ids={p.arquivoIds}
                    porId={porId}
                    processo={processo}
                    rotulo="Anexos da solicitação"
                  />
                  {p.correcoes.map((c) => (
                    <div
                      key={c.id}
                      className="mt-3 rounded-lg border border-dashed border-primary/20 p-3"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        Correção · {c.autor.name} · {formatWhen(c.createdAt)}
                      </p>
                      {c.comentario ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {c.comentario}
                        </p>
                      ) : null}
                      <ArquivoLista
                        ids={c.arquivoIds}
                        porId={porId}
                        processo={processo}
                        rotulo="Arquivos desta correção"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {historicoDocs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Histórico documental</p>
              <p className="text-xs text-muted-foreground">
                Originais e envios posteriores permanecem no processo, identificados
                por etapa e responsável.
              </p>
              <div className="space-y-2">
                {historicoDocs.map((row) => (
                  <div
                    key={row.key}
                    className="rounded-xl border border-black/5 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{row.titulo}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatWhen(row.when)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{row.detalhe}</p>
                    <ArquivoLista
                      ids={row.ids}
                      porId={porId}
                      processo={processo}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ArquivoGrupo({
  titulo,
  descricao,
  itens,
  processo,
}: {
  titulo: string;
  descricao: string;
  itens: ArquivoDocumento[];
  processo: Processo;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="text-xs text-muted-foreground">{descricao}</p>
      <ul className="space-y-2">
        {itens.map((item) => (
          <ArquivoLinha
            key={item.id}
            item={item}
            origem={origemArquivo(item.id, processo, item)}
          />
        ))}
      </ul>
    </div>
  );
}

function ArquivoLista({
  ids,
  porId,
  processo,
  rotulo,
}: {
  ids: string[];
  porId: Map<string, ArquivoDocumento>;
  processo: Processo;
  rotulo?: string;
}) {
  if (ids.length === 0) return null;
  return (
    <div className={cn(rotulo ? "mt-2 space-y-2" : "mt-2 space-y-2")}>
      {rotulo ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </p>
      ) : null}
      {ids.map((id) => {
        const item = porId.get(id);
        return (
          <ArquivoLinha
            key={id}
            arquivoId={id}
            item={item}
            origem={origemArquivo(id, processo, item)}
          />
        );
      })}
    </div>
  );
}

function ArquivoLinha({
  item,
  arquivoId,
  origem,
}: {
  item?: ArquivoDocumento;
  arquivoId?: string;
  origem: string;
}) {
  const id = item?.id ?? arquivoId;
  if (!id) return null;
  const nome = item?.nome || item?.nomeOriginal || "Arquivo";
  const Icon = isImageMime(item?.mime, nome) ? ImageIcon : FileText;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/10 bg-card px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {nome}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {origem}
            {item?.createdAt ? ` · ${formatWhen(item.createdAt)}` : ""}
            {item?.uploadedBy ? ` · ${item.uploadedBy.name}` : ""}
          </p>
        </div>
      </div>
      <ProcessoArquivoAcoes
        arquivoId={id}
        nome={nome}
        mime={item?.mime}
      />
    </div>
  );
}

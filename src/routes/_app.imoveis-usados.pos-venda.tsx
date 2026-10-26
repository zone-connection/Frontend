import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  FunilScrollControls,
  OperationFunnelBoard,
} from "@/components/operation-funnel-board";
import { SkeletonKanban } from "@/components/skeletons";
import { useDeferredLoading } from "@/hooks/use-deferred-loading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createDocumentoTag,
  deleteArquivo,
  fetchArquivos,
  fetchDocumentoTags,
  previewArquivo,
  uploadArquivo,
  type ArquivoDocumento,
  type DocumentoTag,
} from "@/lib/arquivos-api";
import {
  encaminharPosVendaUsado,
  fetchPosVendasUsado,
  fetchVendasUsado,
  formatBrl,
  moverPosVendaEtapa,
  updatePosVendaUsado,
  type PosVendaUsado,
  type VendaUsado,
} from "@/lib/imoveis-usados-api";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import {
  addFunilEtapa,
  ativarFunil,
  createFunil,
  deleteFunil,
  deleteFunilEtapa,
  fetchFunilAtivo,
  fetchFunis,
  installFunilEtapasPadrao,
  updateFunilEtapa,
  type Funil,
} from "@/lib/funis-api";
import { canViewTeamData } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/pos-venda")({
  component: PosVendaFunilPage,
});

function imovelLabel(item: PosVendaUsado) {
  const imovel = item.venda?.imovel;
  if (!imovel) return "Imóvel";
  const parts = [
    imovel.logradouro,
    imovel.numero,
    imovel.bairro,
    imovel.cidade,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : (imovel.tipo ?? "Imóvel");
}

function PosVendaFunilPage() {
  const user = getSession();
  const isCorretor = user ? !canViewTeamData(user.role) : true;
  const [funil, setFunil] = useState<Funil | null>(null);
  const [items, setItems] = useState<PosVendaUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const showKanbanSkeleton = useDeferredLoading(loading && items.length === 0);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const scrollBoard = useRef<((direction: -1 | 1) => void) | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const onScrollChange = useCallback(
    (state: { left: boolean; right: boolean }) => {
      setCanScroll(state);
    },
    [],
  );

  async function load() {
    setLoading(true);
    try {
      const [funilAtivo, posVendas] = await Promise.all([
        fetchFunilAtivo("pos_venda"),
        fetchPosVendasUsado(),
      ]);
      setFunil(funilAtivo);
      setItems(posVendas);
    } catch (err) {
      setFunil(null);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o funil de pós-venda.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stages = useMemo(
    () =>
      (funil?.etapas ?? [])
        .filter((etapa) => etapa.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((etapa) => ({
          id: etapa.id,
          label: etapa.label,
          color: etapa.color,
        })),
    [funil],
  );

  const visibleItems = useMemo(() => {
    if (!isCorretor || !user) return items;
    return items.filter((item) => item.responsavel.id === user.id);
  }, [items, isCorretor, user]);

  async function moveCard(cardId: string, etapaId: string) {
    const card = items.find((item) => item.id === cardId);
    const vendaId = card?.vendaUsadoId ?? card?.venda?.id;
    if (!card || !vendaId) return;
    if (card.funilEtapaId === etapaId) return;

    const previous = items;
    setMovingId(cardId);
    setItems((current) =>
      current.map((item) =>
        item.id === cardId ? { ...item, funilEtapaId: etapaId } : item,
      ),
    );
    try {
      const updated = await moverPosVendaEtapa(vendaId, etapaId);
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setItems(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover o processo.",
      );
    } finally {
      setMovingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de pós-venda"
        description="Acompanhe leads e vendas encaminhadas após a conclusão."
        actionsClassName="lg:max-w-none"
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isCorretor ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full"
                    onClick={() => setEditorOpen(true)}
                  >
                    Editar funil
                  </Button>
                  <Button
                    size="sm"
                    className={cn("h-8 rounded-full", BRAND_GRADIENT_BTN)}
                    style={BRAND_GRADIENT_STYLE}
                    onClick={() => setPickerOpen(true)}
                  >
                    Incluir venda
                  </Button>
                </>
              ) : null}
            </div>
            <FunilScrollControls
              canScrollLeft={canScroll.left}
              canScrollRight={canScroll.right}
              onScroll={(direction) => scrollBoard.current?.(direction)}
            />
          </div>
        }
      />
      {showKanbanSkeleton ? (
        <SkeletonKanban />
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Não há funil de pós-venda ativo com etapas. O administrador pode criar
          ou ativar um funil em Configurações → Funis.
        </p>
      ) : (
        <OperationFunnelBoard
          stages={stages}
          movingId={movingId}
          onMove={(cardId, etapaId) => void moveCard(cardId, etapaId)}
          onCardClick={setAbertoId}
          onScrollChange={onScrollChange}
          scrollApiRef={scrollBoard}
          cards={visibleItems
            .filter((item) => item.funilEtapaId)
            .map((item) => ({
              id: item.id,
              etapaId: item.funilEtapaId!,
              title: item.lead?.nome ?? item.interessado.nome,
              subtitle: imovelLabel(item),
              details: [
                item.venda?.corretor?.name
                  ? `Corretor: ${item.venda.corretor.name}`
                  : `Responsável: ${item.responsavel.name}`,
                item.venda?.dataVenda
                  ? `Venda: ${new Date(item.venda.dataVenda).toLocaleDateString("pt-BR")}`
                  : "",
                item.proprietario?.nome
                  ? `Proprietário: ${item.proprietario.nome}`
                  : "",
              ].filter(Boolean),
              tags: (item.tags ?? []).map((label) => ({ label })),
              phone: item.lead?.telefone ?? undefined,
              meta:
                item.venda?.valor != null
                  ? formatBrl(Number(item.venda.valor))
                  : undefined,
              value:
                item.venda?.valor != null ? Number(item.venda.valor) : 0,
              href: `/imoveis-usados/vendas/${item.vendaUsadoId ?? item.venda?.id ?? ""}`,
              footer: item.responsavel.name.split(" ")[0],
              updatedAt: item.encaminhadoEm
                ? new Date(item.encaminhadoEm).toLocaleDateString("pt-BR")
                : undefined,
              actionLabel: "Abrir venda",
              priority:
                item.status === "aguardando_pendencia"
                  ? "alta"
                  : item.status === "em_andamento"
                    ? "media"
                    : "baixa",
            }))}
        />
      )}
      <PosVendaCardDialog
        item={items.find((item) => item.id === abertoId) ?? null}
        onClose={() => setAbertoId(null)}
        onChange={(updated) =>
          setItems((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          )
        }
      />
      {!isCorretor ? (
        <>
          <IncluirVendaDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            jaIncluidas={
              new Set(
                items
                  .map((item) => item.vendaUsadoId ?? item.venda?.id)
                  .filter((id): id is string => Boolean(id)),
              )
            }
            onIncluida={(criada) =>
              setItems((current) => [criada, ...current])
            }
          />
          <EditarFunilDialog
            open={editorOpen}
            onOpenChange={setEditorOpen}
            funil={funil}
            onChange={(next) => {
              setFunil(next);
            }}
          />
        </>
      ) : null}
    </>
  );
}

function vendaLabel(venda: VendaUsado) {
  const imovel = venda.imovel;
  const parts = [imovel.logradouro, imovel.numero, imovel.bairro].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : (imovel.tipo ?? "Imóvel");
}

function IncluirVendaDialog({
  open,
  onOpenChange,
  jaIncluidas,
  onIncluida,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jaIncluidas: Set<string>;
  onIncluida: (item: PosVendaUsado) => void;
}) {
  const [vendas, setVendas] = useState<VendaUsado[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchVendasUsado({ status: "vendido" })
      .then((rows) => {
        if (!cancelled) setVendas(rows);
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível listar as vendas.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const disponiveis = vendas.filter((venda) => !jaIncluidas.has(venda.id));

  async function incluir(vendaId: string) {
    setBusyId(vendaId);
    try {
      const criada = await encaminharPosVendaUsado(vendaId);
      onIncluida(criada);
      toast.success("Venda incluída no funil de pós-venda.");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível incluir a venda.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Incluir venda existente</DialogTitle>
          <DialogDescription>
            Escolha uma venda já concluída para acompanhar no pós-venda.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando vendas…</p>
        ) : disponiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Não há vendas concluídas fora deste funil.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {disponiveis.map((venda) => (
              <li
                key={venda.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {vendaLabel(venda)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {venda.responsavel.name}
                    {venda.precoVenda != null
                      ? ` · ${formatBrl(Number(venda.precoVenda))}`
                      : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={busyId != null}
                  onClick={() => void incluir(venda.id)}
                >
                  {busyId === venda.id ? "Incluindo…" : "Incluir"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditarFunilDialog({
  open,
  onOpenChange,
  funil,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funil: Funil | null;
  onChange: (funil: Funil) => void;
}) {
  const [lista, setLista] = useState<Funil[]>([]);
  const [nome, setNome] = useState("");
  const [etapa, setEtapa] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchFunis("pos_venda")
      .then(setLista)
      .catch(() => setLista(funil ? [funil] : []));
  }, [open, funil]);

  async function run(action: () => Promise<Funil | void>, ok: string) {
    setBusy(true);
    try {
      const next = await action();
      if (next) onChange(next);
      const atualizada = await fetchFunis("pos_venda");
      setLista(atualizada);
      const ativo = atualizada.find((item) => item.ativo) ?? atualizada[0];
      if (ativo) onChange(ativo);
      toast.success(ok);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Funil de pós-venda</DialogTitle>
          <DialogDescription>
            O sistema já oferece um funil padrão. Você pode ajustar as etapas,
            criar o seu e excluir o funil que criou.
          </DialogDescription>
        </DialogHeader>
        {funil ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">{funil.name}</p>
            <ul className="flex flex-col gap-2">
              {funil.etapas
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <Input
                      defaultValue={item.label}
                      disabled={busy}
                      onBlur={(event) => {
                        const label = event.target.value.trim();
                        if (!label || label === item.label) return;
                        void run(
                          () => updateFunilEtapa(funil.id, item.id, { label }),
                          "Etapa atualizada.",
                        );
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || funil.etapas.length <= 1}
                      onClick={() =>
                        void run(
                          () => deleteFunilEtapa(funil.id, item.id),
                          "Etapa excluída.",
                        )
                      }
                    >
                      Excluir
                    </Button>
                  </li>
                ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={etapa}
                placeholder="Nova etapa"
                onChange={(event) => setEtapa(event.target.value)}
              />
              <Button
                disabled={busy || !etapa.trim()}
                onClick={() => {
                  const label = etapa.trim();
                  setEtapa("");
                  void run(
                    () => addFunilEtapa(funil.id, { label }),
                    "Etapa adicionada.",
                  );
                }}
              >
                Adicionar
              </Button>
            </div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(
                  () => installFunilEtapasPadrao(funil.id),
                  "Funil padrão restaurado.",
                )
              }
            >
              Restaurar funil padrão
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-2 border-t pt-3">
          <p className="text-sm font-medium">Seu funil</p>
          <div className="flex gap-2">
            <Input
              value={nome}
              placeholder="Nome do funil"
              onChange={(event) => setNome(event.target.value)}
            />
            <Button
              disabled={busy || !nome.trim()}
              onClick={() => {
                const name = nome.trim();
                setNome("");
                void run(
                  () => createFunil({ name, tipo: "pos_venda", ativar: true }),
                  "Funil criado.",
                );
              }}
            >
              Criar
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {lista.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {item.name}
                  {item.ativo ? " · em uso" : ""}
                </span>
                <span className="flex gap-2">
                  {!item.ativo ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(() => ativarFunil(item.id), "Funil ativado.")
                      }
                    >
                      Usar
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || item.ativo || lista.length <= 1}
                    onClick={() =>
                      void run(async () => {
                        await deleteFunil(item.id);
                      }, "Funil excluído.")
                    }
                  >
                    Excluir
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            O funil em uso permanece. Para excluir o seu, ative outro antes. O
            último funil do pós-venda não pode ser removido: o sistema mantém o
            padrão.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PosVendaCardDialog({
  item,
  onClose,
  onChange,
}: {
  item: PosVendaUsado | null;
  onClose: () => void;
  onChange: (item: PosVendaUsado) => void;
}) {
  const [obs, setObs] = useState("");
  const [tagNome, setTagNome] = useState("");
  const [catalogo, setCatalogo] = useState<DocumentoTag[]>([]);
  const [arquivos, setArquivos] = useState<ArquivoDocumento[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const vendaId = item?.vendaUsadoId ?? item?.venda?.id ?? "";

  useEffect(() => {
    setObs(item?.observacoes ?? "");
  }, [item?.id, item?.observacoes]);

  useEffect(() => {
    if (!item || !vendaId) return;
    let cancelled = false;
    void Promise.all([
      fetchDocumentoTags(),
      fetchArquivos({ entityType: "venda_usado", entityId: vendaId }),
    ])
      .then(async ([tags, files]) => {
        if (cancelled) return;
        setCatalogo(tags);
        setArquivos(files);
        const imagens = files.filter((file) => file.mime?.startsWith("image/"));
        const urls = await Promise.all(
          imagens.map(async (file) => {
            try {
              const preview = await previewArquivo(file.id);
              return [file.id, preview.url] as const;
            } catch {
              return [file.id, ""] as const;
            }
          }),
        );
        if (!cancelled) {
          setPreviews(Object.fromEntries(urls.filter(([, url]) => url)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogo([]);
          setArquivos([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [item, vendaId]);

  if (!item) return null;
  const tags = item.tags ?? [];
  const imagens = arquivos.filter((file) => file.mime?.startsWith("image/"));
  const documentos = arquivos.filter((file) => !file.mime?.startsWith("image/"));

  async function salvarObs() {
    if (!vendaId) return;
    setBusy(true);
    try {
      onChange(await updatePosVendaUsado(vendaId, { observacoes: obs }));
      toast.success("Observações salvas.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function definirTags(next: string[]) {
    if (!vendaId) return;
    setBusy(true);
    try {
      onChange(await updatePosVendaUsado(vendaId, { tags: next }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar a tag.");
    } finally {
      setBusy(false);
    }
  }

  async function criarTag() {
    const nome = tagNome.trim();
    if (!nome) return;
    setBusy(true);
    try {
      const criada = await createDocumentoTag(nome);
      setCatalogo((current) => [...current, criada]);
      setTagNome("");
      if (!tags.some((tag) => tag.toLowerCase() === criada.nome.toLowerCase())) {
        onChange(
          await updatePosVendaUsado(vendaId, { tags: [...tags, criada.nome] }),
        );
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível criar a tag.");
    } finally {
      setBusy(false);
    }
  }

  async function enviar(file: File) {
    if (!vendaId) return;
    setBusy(true);
    try {
      const criado = await uploadArquivo({
        file,
        entityType: "venda_usado",
        entityId: vendaId,
        nome: file.name,
        categoria: "outro",
        tagIds: [],
      });
      setArquivos((current) => [criado, ...current]);
      if (criado.mime?.startsWith("image/")) {
        const preview = await previewArquivo(criado.id);
        setPreviews((current) => ({ ...current, [criado.id]: preview.url }));
      }
      toast.success("Arquivo enviado.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.lead?.nome ?? item.interessado.nome}</DialogTitle>
          <DialogDescription>{imovelLabel(item)}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Valor</dt>
            <dd>
              {item.venda?.valor != null
                ? formatBrl(Number(item.venda.valor))
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Corretor</dt>
            <dd>{item.venda?.corretor?.name ?? item.responsavel.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Proprietário</dt>
            <dd>{item.proprietario.nome}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Venda</dt>
            <dd>
              {item.venda?.dataVenda
                ? new Date(item.venda.dataVenda).toLocaleDateString("pt-BR")
                : "—"}
            </dd>
          </div>
        </dl>
        <a
          className="text-sm font-medium underline"
          href={`/imoveis-usados/vendas/${vendaId}`}
        >
          Abrir ficha da venda
        </a>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-1">
            {catalogo.map((tag) => {
              const ativa = tags.some(
                (itemTag) => itemTag.toLowerCase() === tag.nome.toLowerCase(),
              );
              return (
                <button
                  key={tag.id}
                  type="button"
                  disabled={busy}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    ativa
                      ? "bg-violet-600 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                  onClick={() =>
                    void definirTags(
                      ativa
                        ? tags.filter(
                            (itemTag) =>
                              itemTag.toLowerCase() !== tag.nome.toLowerCase(),
                          )
                        : [...tags, tag.nome],
                    )
                  }
                >
                  {tag.nome}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagNome}
              placeholder="Nova tag"
              onChange={(event) => setTagNome(event.target.value)}
            />
            <Button disabled={busy || !tagNome.trim()} onClick={() => void criarTag()}>
              Criar
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Observações</p>
          <Textarea
            value={obs}
            rows={4}
            onChange={(event) => setObs(event.target.value)}
          />
          <Button variant="outline" disabled={busy} onClick={() => void salvarObs()}>
            Salvar observações
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Imagens</p>
          <Input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void enviar(file);
            }}
          />
          <div className="grid grid-cols-3 gap-2">
            {imagens.map((file) => (
              <div key={file.id} className="relative">
                {previews[file.id] ? (
                  <img
                    src={previews[file.id]}
                    alt={file.nome}
                    className="h-20 w-full rounded-md object-cover"
                  />
                ) : (
                  <p className="truncate text-xs">{file.nome}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 h-7 w-full"
                  disabled={busy}
                  onClick={() =>
                    void deleteArquivo(file.id, "venda_usado", vendaId).then(() =>
                      setArquivos((current) =>
                        current.filter((itemFile) => itemFile.id !== file.id),
                      ),
                    )
                  }
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Documentos</p>
          <Input
            type="file"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void enviar(file);
            }}
          />
          <ul className="flex flex-col gap-1 text-sm">
            {documentos.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{file.nome}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void deleteArquivo(file.id, "venda_usado", vendaId).then(() =>
                      setArquivos((current) =>
                        current.filter((itemFile) => itemFile.id !== file.id),
                      ),
                    )
                  }
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  createCaptacaoImovel,
  deleteCaptacaoImovel,
  deleteCaptacaoImovelFoto,
  fetchCaptacaoImoveis,
  fetchProprietarios,
  formatBrl,
  imovelFotoItens,
  updateCaptacaoImovel,
  uploadCaptacaoImovelFoto,
  type CaptacaoImovelTipo,
  type Imovel,
  type Proprietario,
} from "@/lib/captacao-api";
import {
  createVendaUsado,
  fetchUsadosResponsaveis,
  fetchVendasUsado,
  updateVendaUsado,
  VENDA_STATUS_LABEL,
  type VendaUsado,
  type VendaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import { fetchFunis, type Funil } from "@/lib/funis-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ImovelFichaFields } from "@/components/imovel-ficha-fields";
import { ImovelFotoThumb } from "@/components/imovel-foto-thumb";
import { RowIconButton, TableRowActions } from "@/components/table-row-actions";
import {
  emptyImovelFicha,
  fichaToPayload,
  imovelToFicha,
} from "@/lib/imovel-ficha";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import { cn } from "@/lib/utils";
import { Building2, Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  proprietarioId: "",
  tipo: "apartamento" as CaptacaoImovelTipo,
  cep: "",
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  fotoUrl: "" as string,
  fotos: [] as Array<{ id: string; url: string; sortOrder: number }>,
  ...emptyImovelFicha(),
};

const STATUS_OPTS: VendaUsadoStatus[] = [
  "disponivel",
  "reservado",
  "vendido",
  "indisponivel",
];

export function CatalogUnidadeImoveis({
  search = "",
  vista = "cards",
  proprietarioId,
  createTick = 0,
  editRequest,
  deleteRequest,
  hideList = false,
  onChanged,
}: {
  search?: string;
  vista?: "cards" | "tabela";
  proprietarioId?: string;
  createTick?: number;
  editRequest?: { id: string; tick: number } | null;
  deleteRequest?: { id: string; tick: number } | null;
  hideList?: boolean;
  onChanged?: () => void;
}) {
  const me = getSession();
  const [items, setItems] = useState<Imovel[]>([]);
  const [vendas, setVendas] = useState<VendaUsado[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [responsaveis, setResponsaveis] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Imovel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [listarUsados, setListarUsados] = useState(false);
  const [precoUsados, setPrecoUsados] = useState("");
  const [statusUsados, setStatusUsados] = useState<VendaUsadoStatus>("disponivel");
  const [funilUsadosId, setFunilUsadosId] = useState("");
  const [responsavelUsadosId, setResponsavelUsadosId] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Imovel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingFotos, setPendingFotos] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [fotoBusy, setFotoBusy] = useState(false);

  const vendaByImovel = useMemo(() => {
    const map = new Map<string, VendaUsado>();
    for (const venda of vendas) map.set(venda.imovel.id, venda);
    return map;
  }, [vendas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      if (proprietarioId && item.proprietarioId !== proprietarioId) return false;
      if (!q) return true;
      const hay = [
        item.titulo,
        item.cidade,
        item.bairro,
        item.logradouro,
        item.proprietario?.nome,
        CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo],
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return hay.includes(q);
    });
  }, [items, proprietarioId, search]);
  const pager = useTablePager(filtered, `${search}|${proprietarioId}`);

  async function load() {
    setLoading(true);
    try {
      const [list, props, vendasList, funilList, resp] = await Promise.all([
        fetchCaptacaoImoveis(
          proprietarioId ? { proprietarioId } : undefined,
        ).catch(() => [] as Imovel[]),
        fetchProprietarios().catch(() => [] as Proprietario[]),
        fetchVendasUsado().catch(() => [] as VendaUsado[]),
        fetchFunis("venda_usados").catch(() => [] as Funil[]),
        fetchUsadosResponsaveis().catch(
          () => [] as Array<{ id: string; name: string }>,
        ),
      ]);
      setItems(list);
      setProprietarios(props);
      setVendas(vendasList);
      setFunis(funilList);
      setResponsaveis(resp);
      const ativo = funilList.find((f) => f.ativo) ?? funilList[0];
      if (ativo) setFunilUsadosId((current) => current || ativo.id);
      if (me?.id) setResponsavelUsadosId((current) => current || me.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível listar os imóveis.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proprietarioId]);

  useEffect(() => {
    if (createTick > 0) {
      setEditing(null);
      clearPendingFoto();
      setForm({ ...emptyForm, proprietarioId: proprietarioId ?? "" });
      setListarUsados(false);
      setPrecoUsados("");
      setStatusUsados("disponivel");
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createTick]);

  useEffect(() => {
    if (!editRequest?.id || editRequest.tick <= 0) return;
    const item = items.find((imovel) => imovel.id === editRequest.id);
    if (item) openEdit(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequest?.tick, editRequest?.id, items]);

  useEffect(() => {
    if (!deleteRequest?.id || deleteRequest.tick <= 0) return;
    const item = items.find((imovel) => imovel.id === deleteRequest.id);
    if (item) setPendingDelete(item);
  }, [deleteRequest?.tick, deleteRequest?.id, items]);

  function clearPendingFoto() {
    setPendingFotos([]);
    setPendingPreviews((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  }

  function openEdit(item: Imovel) {
    clearPendingFoto();
    setEditing(item);
    setForm({
      proprietarioId: item.proprietarioId,
      tipo: item.tipo,
      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      bairro: item.bairro,
      cidade: item.cidade,
      estado: item.estado,
      fotoUrl: item.fotoUrl ?? "",
      fotos: item.fotos ?? [],
      ...imovelToFicha(item),
    });
    const venda = vendaByImovel.get(item.id);
    setListarUsados(Boolean(venda));
    setPrecoUsados(
      venda?.precoVenda != null ? formatMoneyInput(venda.precoVenda) : "",
    );
    setStatusUsados(venda?.status ?? "disponivel");
    setFunilUsadosId(venda?.funil.id ?? funilUsadosId);
    setResponsavelUsadosId(venda?.responsavel.id ?? me?.id ?? "");
    setOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.proprietarioId) {
      toast.error("Selecione o proprietário.");
      return;
    }
    setSaving(true);
    try {
      const ficha = fichaToPayload(form);
      const body = {
        proprietarioId: form.proprietarioId,
        tipo: form.tipo,
        cep: form.cep,
        logradouro: form.logradouro,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        ...ficha,
      };
      let saved: Imovel;
      if (editing) {
        saved = await updateCaptacaoImovel(editing.id, body);
        toast.success("Imóvel atualizado.");
      } else {
        saved = await createCaptacaoImovel(body);
        for (const file of pendingFotos) {
          saved = await uploadCaptacaoImovelFoto(saved.id, file);
        }
        toast.success("Imóvel cadastrado.");
      }

      const venda = vendaByImovel.get(saved.id);
      if (listarUsados) {
        const payload = {
          imovelId: saved.id,
          funilId: funilUsadosId || undefined,
          responsavelId: responsavelUsadosId || undefined,
          precoVenda: parseOptionalMoneyInput(precoUsados),
          status: statusUsados,
        };
        if (venda) {
          await updateVendaUsado(venda.id, {
            precoVenda: payload.precoVenda,
            status: payload.status,
            funilId: payload.funilId,
            responsavelId: payload.responsavelId,
          });
        } else {
          await createVendaUsado(payload);
        }
      }

      clearPendingFoto();
      setOpen(false);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCaptacaoImovel(pendingDelete.id);
      toast.success("Imóvel excluído.");
      setPendingDelete(null);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!hideList && loading && items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando imóveis de captação…
      </div>
    );
  }

  return (
    <div className={hideList ? "" : "mt-8 space-y-3"}>
      {hideList ? null : (
      <div>
        <h2 className="text-base font-semibold">Captação e usados</h2>
        <p className="text-sm text-muted-foreground">
          Unidades de proprietários — a mesma ficha da captação e da venda de
          usados.
        </p>
      </div>
      )}
      {hideList ? null : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum imóvel de captação neste recorte.
        </p>
      ) : vista === "tabela" ? (
        <div className="overflow-x-auto overflow-y-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3">Imóvel</th>
                <th className="p-3">Proprietário</th>
                <th className="p-3">Origem</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 w-28 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((item) => {
                const venda = vendaByImovel.get(item.id);
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      <Link
                        to="/captacao/imoveis/$id"
                        params={{ id: item.id }}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <ImovelFotoThumb src={item.fotoUrl} alt="" />
                        {item.titulo}
                      </Link>
                    </td>
                    <td className="p-3">{item.proprietario?.nome ?? "—"}</td>
                    <td className="p-3">
                      <Badge className={STATUS_CHIP_CLASS}>
                        {venda ? "Usados" : "Captação"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {formatBrl(venda?.precoVenda ?? item.valor)}
                    </td>
                    <td className="p-3 text-right">
                      <TableRowActions>
                        <RowIconButton title="Ver" asChild>
                          {venda ? (
                            <Link
                              to="/imoveis-usados/vendas/$id"
                              params={{ id: venda.id }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <Link
                              to="/captacao/imoveis/$id"
                              params={{ id: item.id }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </RowIconButton>
                        <RowIconButton title="Editar" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </RowIconButton>
                        <RowIconButton
                          title="Excluir"
                          destructive
                          onClick={() => setPendingDelete(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </RowIconButton>
                      </TableRowActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <TablePager
            page={pager.page}
            totalPages={pager.totalPages}
            total={pager.total}
            onPageChange={pager.setPage}
          />
        </div>
      ) : (
        <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pager.pageItems.map((item) => {
            const venda = vendaByImovel.get(item.id);
            return (
              <Card key={item.id} className="overflow-hidden border-primary/15">
                <CardContent className="p-0">
                  {item.fotoUrl ? (
                    <img
                      src={item.fotoUrl}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-muted text-muted-foreground">
                      <Building2 className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.proprietario?.nome ?? "Sem proprietário"}
                          {item.cidade ? ` · ${item.cidade}` : ""}
                        </p>
                      </div>
                      <Badge className={STATUS_CHIP_CLASS}>
                        {venda ? "Usados" : "Captação"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium tabular-nums">
                      {formatBrl(venda?.precoVenda ?? item.valor)}
                    </p>
                    <div className="flex justify-end">
                      <TableRowActions>
                        <RowIconButton title="Ver" asChild>
                          {venda ? (
                            <Link
                              to="/imoveis-usados/vendas/$id"
                              params={{ id: venda.id }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <Link
                              to="/captacao/imoveis/$id"
                              params={{ id: item.id }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </RowIconButton>
                        <RowIconButton title="Editar" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </RowIconButton>
                        <RowIconButton
                          title="Excluir"
                          destructive
                          onClick={() => setPendingDelete(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </RowIconButton>
                      </TableRowActions>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <TablePager
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          onPageChange={pager.setPage}
        />
        </>
      )}

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        className="max-w-3xl"
        icon={<Building2 className="h-5 w-5" />}
        title={editing ? "Editar imóvel" : "Novo imóvel de captação"}
        description="Ficha da unidade: captação, venda de usados e portal do proprietário."
      >
        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <FormDialogBody>
            <ImovelFichaFields
              resetKey={`${open}-${editing?.id ?? "new"}`}
              value={form}
              onChange={(ficha) => setForm({ ...form, ...ficha })}
              cadastro={{
                proprietarioId: form.proprietarioId,
                tipo: form.tipo,
                cep: form.cep,
                logradouro: form.logradouro,
                numero: form.numero,
                bairro: form.bairro,
                cidade: form.cidade,
                estado: form.estado,
                proprietarios,
                onChange: (patch) => setForm({ ...form, ...patch }),
              }}
              foto={{
                items: imovelFotoItens({
                  fotos: form.fotos,
                  fotoUrl: form.fotoUrl,
                }),
                previewUrls: pendingPreviews,
                busy: fotoBusy,
                onAdd: (file) => {
                  if (editing) {
                    setFotoBusy(true);
                    void uploadCaptacaoImovelFoto(editing.id, file)
                      .then((next) => {
                        setForm((current) => ({
                          ...current,
                          fotoUrl: next.fotoUrl ?? "",
                          fotos: next.fotos ?? [],
                        }));
                        setEditing(next);
                        toast.success("Foto enviada.");
                      })
                      .catch((err) => {
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível enviar a foto.",
                        );
                      })
                      .finally(() => setFotoBusy(false));
                    return;
                  }
                  setPendingFotos((current) => [...current, file].slice(0, 4));
                  setPendingPreviews((current) =>
                    [...current, URL.createObjectURL(file)].slice(0, 4),
                  );
                },
                onRemove: (index, fotoId) => {
                  if (editing) {
                    setFotoBusy(true);
                    void deleteCaptacaoImovelFoto(editing.id, fotoId)
                      .then((next) => {
                        setForm((current) => ({
                          ...current,
                          fotoUrl: next.fotoUrl ?? "",
                          fotos: next.fotos ?? [],
                        }));
                        setEditing(next);
                        toast.success("Foto removida.");
                      })
                      .catch((err) => {
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível remover a foto.",
                        );
                      })
                      .finally(() => setFotoBusy(false));
                    return;
                  }
                  const savedCount = imovelFotoItens({
                    fotos: form.fotos,
                    fotoUrl: form.fotoUrl,
                  }).length;
                  const pendingIndex = index - savedCount;
                  if (pendingIndex >= 0) {
                    setPendingFotos((current) =>
                      current.filter((_, i) => i !== pendingIndex),
                    );
                    setPendingPreviews((current) => {
                      const url = current[pendingIndex];
                      if (url) URL.revokeObjectURL(url);
                      return current.filter((_, i) => i !== pendingIndex);
                    });
                  }
                },
              }}
            />
            <div className="mt-4 space-y-3 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={listarUsados}
                  onCheckedChange={(v) => setListarUsados(v === true)}
                />
                Disponibilizar na venda de usados
              </label>
              {listarUsados ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Preço de venda</Label>
                    <Input
                      value={precoUsados}
                      onChange={(e) =>
                        setPrecoUsados(maskMoneyInput(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="h-9 w-full rounded-md border px-2 text-sm"
                      value={statusUsados}
                      onChange={(e) =>
                        setStatusUsados(e.target.value as VendaUsadoStatus)
                      }
                    >
                      {STATUS_OPTS.map((s) => (
                        <option key={s} value={s}>
                          {VENDA_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Funil</Label>
                    <select
                      className="h-9 w-full rounded-md border px-2 text-sm"
                      value={funilUsadosId}
                      onChange={(e) => setFunilUsadosId(e.target.value)}
                    >
                      {funis.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <select
                      className="h-9 w-full rounded-md border px-2 text-sm"
                      value={responsavelUsadosId}
                      onChange={(e) => setResponsavelUsadosId(e.target.value)}
                    >
                      {responsaveis.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
            </div>
          </FormDialogBody>
          <FormDialogActions hint="Salva a unidade e, se marcado, cria ou atualiza a listagem de usados.">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Excluir imóvel?"
        description={
          pendingDelete
            ? `O imóvel “${pendingDelete.titulo}” e as captações ligadas a ele serão removidos. Venda de usados impede a exclusão.`
            : ""
        }
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canViewRankingVendas } from "@/lib/permissions";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import {
  fetchEmpreendimentos,
  updateEmpreendimento,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { Checkbox } from "@/components/ui/checkbox";
import { CorPicker } from "@/components/cor-picker";
import {
  assertImageFile,
  ImageUploadField,
} from "@/components/image-upload-field";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { ConstrutoraVendasTable } from "@/components/vendas-resumo-dialog";
import { useCatalog } from "@/lib/catalog-store";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import {
  construtoraBadgeStyle,
  CONSTRUTORA_MAX_IMAGES,
  createConstrutora,
  deleteConstrutora,
  deleteConstrutoraLogo,
  fetchConstrutoraVendas,
  fetchConstrutoras,
  updateConstrutora,
  uploadConstrutoraLogo,
  type Construtora,
  type ConstrutoraVenda,
} from "@/lib/construtoras-api";
import {
  createLocalidade,
  deleteLocalidade,
  fetchLocalidades,
  updateLocalidade,
  type Localidade,
} from "@/lib/localidades-api";
import {
  Building,
  Building2,
  Plus,
  Search,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  Phone,
  MapPin,
  Palette,
  User,
  FolderOpen,
  Check,
  X,
  Wallet,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FILTER_BAR_SURFACE,
  FILTER_CONTROL,
  FILTER_LABEL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import {
  formatPhone,
  isValidPhone,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";

type ConstrutorasTab = "books" | "lista" | "vendas" | "visibilidade";
type ConstrutorasSearch = {
  tab?: ConstrutorasTab;
  id?: string;
};

function parseConstrutorasTab(value: unknown): ConstrutorasTab | undefined {
  if (
    value === "books" ||
    value === "lista" ||
    value === "vendas" ||
    value === "visibilidade"
  ) {
    return value;
  }
  return undefined;
}

export const Route = createFileRoute("/_app/construtoras")({
  head: () => ({ meta: [{ title: "Construtoras — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): ConstrutorasSearch => ({
    tab: parseConstrutorasTab(search.tab),
    id: typeof search.id === "string" && search.id ? search.id : undefined,
  }),
  component: ConstrutorasPage,
});
type FormTab =
  | "identidade"
  | "contato"
  | "viabilizador"
  | "book"
  | "localidades"
  | "empreendimentos";

type FormState = {
  nome: string;
  cor: string;
  contato: string;
  endereco: string;
  viabilizadorNome: string;
  viabilizadorContato: string;
  cca: string;
  driveFolderUrl: string;
};

const emptyForm = (): FormState => ({
  nome: "",
  cor: "",
  contato: "",
  endereco: "",
  viabilizadorNome: "",
  viabilizadorContato: "",
  cca: "",
  driveFolderUrl: "",
});

function construtoraIniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ConstrutoraNomeChip({
  nome,
  cor,
}: {
  nome: string;
  cor?: string | null;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(STATUS_CHIP_CLASS, "border-transparent font-bold")}
      style={cor ? construtoraBadgeStyle(cor) : undefined}
      title={nome}
    >
      {nome}
    </Badge>
  );
}

function uniqueLocalidades(items: Construtora[]) {
  const map = new Map<string, { id: string; nome: string }>();
  for (const item of items) {
    for (const localidade of item.localidades ?? []) {
      map.set(localidade.id, {
        id: localidade.id,
        nome: localidade.nome,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ConstrutorasPage() {
  const routeSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const canViewVendas = canViewRankingVendas(user);
  const canManage =
    isAdmin ||
    user?.role === "gerente" ||
    user?.role === "analista" ||
    user?.role === "treinee" ||
    user?.role === "corretor";
  const canDelete = isAdmin || user?.role === "treinee";
  const canCreate = canManage;
  const canSeeViabilizadorContato = user?.role !== "corretor";
  const { catalog } = useCatalog();
  const ccas = catalog.cca ?? [];

  const [items, setItems] = useState<Construtora[]>([]);
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [selectedEmpreendimentos, setSelectedEmpreendimentos] = useState<
    string[]
  >([]);
  const [loadingEmpreendimentos, setLoadingEmpreendimentos] = useState(false);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [newLocalidadeNome, setNewLocalidadeNome] = useState("");
  const [matrixCidadeNome, setMatrixCidadeNome] = useState("");
  const [savingLocalidade, setSavingLocalidade] = useState(false);
  const [savingMatrixCidade, setSavingMatrixCidade] = useState(false);
  const [editingLocalidadeId, setEditingLocalidadeId] = useState<string | null>(
    null,
  );
  const [editingLocalidadeNome, setEditingLocalidadeNome] = useState("");
  const [savingLocalidadeEdit, setSavingLocalidadeEdit] = useState(false);
  const [deleteLocalidadeId, setDeleteLocalidadeId] = useState<string | null>(
    null,
  );
  const [deletingLocalidade, setDeletingLocalidade] = useState(false);
  const [driveFilterLocalidadeId, setDriveFilterLocalidadeId] = useState("");
  const [tab, setTab] = useState<ConstrutorasTab>(
    routeSearch.tab ?? "lista",
  );
  const [formTab, setFormTab] = useState<FormTab>("identidade");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(
    null,
  );
  const [logoBusy, setLogoBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [vendasConstrutoraId, setVendasConstrutoraId] = useState(
    routeSearch.id ?? "",
  );
  const [vendas, setVendas] = useState<ConstrutoraVenda[]>([]);
  const [vendasTotais, setVendasTotais] = useState({
    vendas: 0,
    vgv: 0,
    corretores: 0,
  });
  const [loadingVendas, setLoadingVendas] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [construtoras, locs] = await Promise.all([
        fetchConstrutoras(),
        fetchLocalidades(),
      ]);
      setItems(construtoras);
      setLocalidades(locs);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as construtoras.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!canViewVendas) {
      setTab((current) => (current === "vendas" ? "lista" : current));
      setVendasConstrutoraId("");
      return;
    }
    if (routeSearch.tab) setTab(routeSearch.tab);
    if (routeSearch.id) {
      setVendasConstrutoraId(routeSearch.id);
      setTab("vendas");
    }
  }, [canViewVendas, routeSearch.tab, routeSearch.id]);

  useEffect(() => {
    if (!canViewVendas || !vendasConstrutoraId) {
      setVendas([]);
      setVendasTotais({ vendas: 0, vgv: 0, corretores: 0 });
      return;
    }
    let cancelled = false;
    setLoadingVendas(true);
    void fetchConstrutoraVendas(vendasConstrutoraId)
      .then((data) => {
        if (cancelled) return;
        setVendas(data.items);
        setVendasTotais(data.totais);
      })
      .catch((err) => {
        if (cancelled) return;
        setVendas([]);
        setVendasTotais({ vendas: 0, vgv: 0, corretores: 0 });
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as vendas da construtora.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingVendas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canViewVendas, vendasConstrutoraId]);

  const searchQuery = search.trim().toLocaleLowerCase("pt-BR");

  const matchingItems = useMemo(() => {
    return items.filter((item) => {
      if (
        searchQuery &&
        !item.nome.toLocaleLowerCase("pt-BR").includes(searchQuery)
      ) {
        return false;
      }
      if (driveFilterLocalidadeId) {
        return (item.localidades ?? []).some(
          (localidade) => localidade.id === driveFilterLocalidadeId,
        );
      }
      return true;
    });
  }, [items, searchQuery, driveFilterLocalidadeId]);

  const filterLocalidades = useMemo(
    () => uniqueLocalidades(items),
    [items],
  );

  const driveHubItems = useMemo(
    () =>
      matchingItems.filter((item) => Boolean(item.driveFolderUrl?.trim())),
    [matchingItems],
  );

  const sortedItems = useMemo(
    () =>
      sortByTableOrder(
        matchingItems,
        sort,
        (item) => item.nome,
        (item) => item.createdAt,
      ),
    [matchingItems, sort],
  );

  const vendasConstrutoras = useMemo(
    () =>
      [...items].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [items],
  );
  const vendasConstrutoraSelecionada = vendasConstrutoras.find(
    (item) => item.id === vendasConstrutoraId,
  );

  const sortedDriveItems = useMemo(
    () =>
      sortByTableOrder(
        driveHubItems,
        sort,
        (item) => item.nome,
        (item) => item.createdAt,
      ),
    [driveHubItems, sort],
  );
  const construtorasPager = useTablePager(sortedItems, sort);
  const drivePager = useTablePager(sortedDriveItems, sort);

  const visibilityCities = useMemo(() => {
    let rows = [...localidades].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
    if (driveFilterLocalidadeId) {
      rows = rows.filter(
        (localidade) => localidade.id === driveFilterLocalidadeId,
      );
    }
    return rows;
  }, [localidades, driveFilterLocalidadeId]);

  useEffect(() => {
    if (
      driveFilterLocalidadeId &&
      !filterLocalidades.some(
        (localidade) => localidade.id === driveFilterLocalidadeId,
      )
    ) {
      setDriveFilterLocalidadeId("");
    }
  }, [driveFilterLocalidadeId, filterLocalidades]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadLocalidades(selectedIds: string[] = []) {
    setSelectedLocalidades(selectedIds);
    setLoadingLocalidades(true);
    try {
      setLocalidades(await fetchLocalidades());
    } catch {
      setLocalidades([]);
      toast.error("Não foi possível carregar as localidades.");
    } finally {
      setLoadingLocalidades(false);
    }
  }

  function resetLogoState(url: string | null = null) {
    if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
    setLogoUrl(url);
    setPendingLogo(null);
    setPendingLogoPreview(null);
    setLogoBusy(false);
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    resetLogoState();
    setEmpreendimentos([]);
    setSelectedEmpreendimentos([]);
    setNewLocalidadeNome("");
    setEditingLocalidadeId(null);
    setEditingLocalidadeNome("");
    setDeleteLocalidadeId(null);
    setFormTab("identidade");
    setOpen(true);
    void loadLocalidades([]);
  }

  function openView(item: Construtora) {
    setFormMode("view");
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      cor: item.cor ?? "",
      contato: item.contato ? formatPhone(item.contato) : "",
      endereco: item.endereco ?? "",
      viabilizadorNome: item.viabilizadorNome ?? "",
      viabilizadorContato: item.viabilizadorContato
        ? formatPhone(item.viabilizadorContato)
        : "",
      cca: item.cca ?? "",
      driveFolderUrl: item.driveFolderUrl ?? "",
    });
    resetLogoState(item.logoUrl);
    setNewLocalidadeNome("");
    setEditingLocalidadeId(null);
    setEditingLocalidadeNome("");
    setDeleteLocalidadeId(null);
    setFormTab("identidade");
    void loadLocalidades((item.localidades ?? []).map((loc) => loc.id));
    setLoadingEmpreendimentos(true);
    void fetchEmpreendimentos()
      .then((result) => {
        setEmpreendimentos(result);
        setSelectedEmpreendimentos(
          result
            .filter(
              (empreendimento) => empreendimento.construtoraId === item.id,
            )
            .map((empreendimento) => empreendimento.id),
        );
      })
      .catch(() => toast.error("Não foi possível carregar os empreendimentos."))
      .finally(() => setLoadingEmpreendimentos(false));
    setOpen(true);
  }

  function openEdit(item: Construtora) {
    openView(item);
    setFormMode("edit");
  }

  function openDriveFolder(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formMode === "view") return;
    if (formMode === "create" && !canCreate) return;
    if (formMode === "edit" && !canManage) return;
    if (form.nome.trim().length < 2) {
      setFormTab("identidade");
      toast.error("Informe o nome da construtora.");
      return;
    }

    if (form.contato.trim() && !isValidPhone(form.contato)) {
      setFormTab("contato");
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (
      form.viabilizadorContato.trim() &&
      !isValidPhone(form.viabilizadorContato)
    ) {
      setFormTab("viabilizador");
      toast.error("Contato do viabilizador inválido. " + PHONE_INVALID_MESSAGE);
      return;
    }

    const driveFolderUrl = form.driveFolderUrl.trim();
    if (driveFolderUrl && !/^https:\/\//i.test(driveFolderUrl)) {
      setFormTab("book");
      toast.error("A pasta do Drive deve ser uma URL https válida.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      cor: form.cor.trim() || null,
      contato: form.contato.trim() || null,
      endereco: form.endereco.trim() || null,
      viabilizadorNome: form.viabilizadorNome.trim() || null,
      ...(canSeeViabilizadorContato
        ? { viabilizadorContato: form.viabilizadorContato.trim() || null }
        : {}),
      cca: form.cca.trim() || null,
      driveFolderUrl: driveFolderUrl || null,
      localidadeIds: selectedLocalidades,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        const created = await createConstrutora({
          nome: payload.nome,
          cor: payload.cor,
          contato: payload.contato ?? undefined,
          endereco: payload.endereco ?? undefined,
          viabilizadorNome: payload.viabilizadorNome ?? undefined,
          ...(canSeeViabilizadorContato
            ? {
                viabilizadorContato:
                  form.viabilizadorContato.trim() || undefined,
              }
            : {}),
          cca: payload.cca,
          driveFolderUrl: payload.driveFolderUrl,
          localidadeIds: payload.localidadeIds,
        });
        if (pendingLogo) {
          try {
            await uploadConstrutoraLogo(created.id, pendingLogo);
          } catch (uploadErr) {
            toast.error(
              uploadErr instanceof ApiError
                ? uploadErr.message
                : "Construtora cadastrada, mas a logo não foi enviada.",
            );
            setOpen(false);
            resetLogoState();
            await loadItems();
            return;
          }
        }
        toast.success("Construtora cadastrada.");
        setTab("lista");
      } else if (editingId) {
        await updateConstrutora(editingId, payload);
        const selected = new Set(selectedEmpreendimentos);
        await Promise.all(
          empreendimentos
            .filter(
              (empreendimento) =>
                (selected.has(empreendimento.id) &&
                  empreendimento.construtoraId !== editingId) ||
                (!selected.has(empreendimento.id) &&
                  empreendimento.construtoraId === editingId),
            )
            .map((empreendimento) =>
              updateEmpreendimento(empreendimento.id, {
                construtoraId: selected.has(empreendimento.id)
                  ? editingId
                  : null,
              }),
            ),
        );
        toast.success("Construtora atualizada.");
      }
      setOpen(false);
      resetLogoState();
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId || !canDelete) return;
    try {
      await deleteConstrutora(deleteId);
      toast.success("Construtora excluída.");
      setDeleteId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    }
  }

  const readOnly =
    formMode === "view" ||
    (formMode === "edit" && !canManage) ||
    (formMode === "create" && !canCreate);

  const displayedLogo = pendingLogoPreview || logoUrl;

  async function handleAddLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    const error = assertImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    if (editingId && formMode !== "create") {
      setLogoBusy(true);
      try {
        const updated = await uploadConstrutoraLogo(editingId, file);
        setLogoUrl(updated.logoUrl);
        setItems((prev) =>
          prev.map((item) =>
            item.id === updated.id
              ? { ...item, logoUrl: updated.logoUrl }
              : item,
          ),
        );
        toast.success("Logo enviada.");
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível enviar a logo.",
        );
      } finally {
        setLogoBusy(false);
      }
      return;
    }
    if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
    setPendingLogo(file);
    setPendingLogoPreview(URL.createObjectURL(file));
  }

  async function handleRemoveLogo() {
    if (editingId && formMode !== "create" && logoUrl && !pendingLogo) {
      setLogoBusy(true);
      try {
        const updated = await deleteConstrutoraLogo(editingId);
        setLogoUrl(updated.logoUrl);
        setItems((prev) =>
          prev.map((item) =>
            item.id === updated.id
              ? { ...item, logoUrl: updated.logoUrl }
              : item,
          ),
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível remover a logo.",
        );
      } finally {
        setLogoBusy(false);
      }
      return;
    }
    if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
    setPendingLogo(null);
    setPendingLogoPreview(null);
  }

  function toggleLocalidade(id: string, checked: boolean) {
    setSelectedLocalidades((previous) =>
      checked ? [...previous, id] : previous.filter((itemId) => itemId !== id),
    );
  }

  async function handleCreateLocalidade() {
    if (!canManage) return;
    const nome = newLocalidadeNome.trim();
    if (nome.length < 2) {
      toast.error("Informe o nome da localidade.");
      return;
    }
    const already = localidades.find(
      (item) => item.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (already) {
      setSelectedLocalidades((previous) =>
        previous.includes(already.id) ? previous : [...previous, already.id],
      );
      setNewLocalidadeNome("");
      return;
    }
    setSavingLocalidade(true);
    try {
      const created = await createLocalidade(nome);
      setLocalidades((previous) =>
        [...previous, created].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      setSelectedLocalidades((previous) =>
        previous.includes(created.id) ? previous : [...previous, created.id],
      );
      setNewLocalidadeNome("");
      toast.success("Localidade cadastrada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar a localidade.",
      );
    } finally {
      setSavingLocalidade(false);
    }
  }

  async function handleAddMatrixCidade() {
    if (!canManage) return;
    const nome = matrixCidadeNome.trim();
    if (nome.length < 2) {
      toast.error("Informe o nome da cidade.");
      return;
    }
    const already = localidades.find(
      (item) =>
        item.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (already) {
      setMatrixCidadeNome("");
      toast.success("Cidade já cadastrada.");
      return;
    }
    setSavingMatrixCidade(true);
    try {
      const created = await createLocalidade(nome);
      setLocalidades((previous) =>
        [...previous, created].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      setMatrixCidadeNome("");
      toast.success("Cidade cadastrada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar a cidade.",
      );
    } finally {
      setSavingMatrixCidade(false);
    }
  }

  function startEditLocalidade(localidade: Localidade) {
    setEditingLocalidadeId(localidade.id);
    setEditingLocalidadeNome(localidade.nome);
  }

  function cancelEditLocalidade() {
    setEditingLocalidadeId(null);
    setEditingLocalidadeNome("");
  }

  function syncLocalidadeNome(id: string, nome: string) {
    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        localidades: (item.localidades ?? []).map((localidade) =>
          localidade.id === id ? { ...localidade, nome } : localidade,
        ),
      })),
    );
  }

  function removeLocalidadeFromItems(id: string) {
    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        localidades: (item.localidades ?? []).filter(
          (localidade) => localidade.id !== id,
        ),
      })),
    );
    setSelectedLocalidades((previous) =>
      previous.filter((itemId) => itemId !== id),
    );
    if (driveFilterLocalidadeId === id) {
      setDriveFilterLocalidadeId("");
    }
  }

  async function handleUpdateLocalidade() {
    if (!canManage || !editingLocalidadeId) return;
    const nome = editingLocalidadeNome.trim();
    if (nome.length < 2) {
      toast.error("Informe o nome da localidade.");
      return;
    }
    const duplicate = localidades.find(
      (item) =>
        item.id !== editingLocalidadeId &&
        item.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (duplicate) {
      toast.error("Já existe uma localidade com esse nome.");
      return;
    }
    setSavingLocalidadeEdit(true);
    try {
      const updated = await updateLocalidade(editingLocalidadeId, nome);
      setLocalidades((previous) =>
        [...previous.filter((item) => item.id !== updated.id), updated].sort(
          (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      syncLocalidadeNome(updated.id, updated.nome);
      cancelEditLocalidade();
      toast.success("Localidade atualizada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a localidade.",
      );
    } finally {
      setSavingLocalidadeEdit(false);
    }
  }

  async function handleDeleteLocalidade() {
    if (!canManage || !deleteLocalidadeId) return;
    setDeletingLocalidade(true);
    try {
      const id = deleteLocalidadeId;
      await deleteLocalidade(id);
      setLocalidades((previous) => previous.filter((item) => item.id !== id));
      removeLocalidadeFromItems(id);
      if (editingLocalidadeId === id) {
        cancelEditLocalidade();
      }
      setDeleteLocalidadeId(null);
      toast.success("Localidade excluída.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a localidade.",
      );
    } finally {
      setDeletingLocalidade(false);
    }
  }

  const localidadeToDelete = localidades.find(
    (item) => item.id === deleteLocalidadeId,
  );

  function toggleEmpreendimento(id: string, checked: boolean) {
    setSelectedEmpreendimentos((previous) =>
      checked ? [...previous, id] : previous.filter((itemId) => itemId !== id),
    );
  }

  function openVendas(item: Construtora) {
    if (!canViewVendas) {
      openView(item);
      return;
    }
    setVendasConstrutoraId(item.id);
    setTab("vendas");
    void navigate({
      search: { tab: "vendas", id: item.id },
      replace: true,
    });
  }

  return (
    <div>
      <PageHeader
        title="Construtoras"
        description={
          canViewVendas
            ? "Cadastro, books e vendas por construtora."
            : "Cadastro, books e visibilidade por construtora."
        }
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Nova construtora
            </Button>
          ) : undefined
        }
      />

      <div
        className={cn(
          "mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
          FILTER_BAR_SURFACE,
        )}
      >
        <div>
          <Label htmlFor="buscar-construtora" className={FILTER_LABEL}>
            Buscar
          </Label>
          <div className="relative">
            <Search className={FILTER_SEARCH_ICON} />
            <Input
              id="buscar-construtora"
              placeholder="Nome da construtora…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn("pl-9", FILTER_CONTROL)}
            />
          </div>
        </div>
        <div>
          <Label className={FILTER_LABEL}>Localidade</Label>
          <Select
            value={driveFilterLocalidadeId || "__all__"}
            onValueChange={(value) =>
              setDriveFilterLocalidadeId(value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger className={FILTER_CONTROL}>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {filterLocalidades.map((localidade) => (
                <SelectItem key={localidade.id} value={localidade.id}>
                  {localidade.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterLocalidades.length === 0 && canManage ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Vincule localidades nas construtoras para filtrar.
            </p>
          ) : null}
        </div>
        <div>
          <Label className={FILTER_LABEL}>Ordenar</Label>
          <TableSortSelect
            value={sort}
            onChange={setSort}
            className={cn("w-full", FILTER_CONTROL)}
          />
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = value as ConstrutorasTab;
          if (next === "vendas" && !canViewVendas) return;
          setTab(next);
          void navigate({
            search: {
              tab: next,
              id:
                next === "vendas"
                  ? vendasConstrutoraId || undefined
                  : undefined,
            },
            replace: true,
          });
        }}
      >
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted p-1 sm:w-auto">
          <TabsTrigger value="lista" className="gap-1.5 rounded-full px-4">
            <Building className="h-3.5 w-3.5" />
            Lista
          </TabsTrigger>
          {canViewVendas ? (
            <TabsTrigger value="vendas" className="gap-1.5 rounded-full px-4">
              <Wallet className="h-3.5 w-3.5" />
              Vendas
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="books" className="gap-1.5 rounded-full px-4">
            <FolderOpen className="h-3.5 w-3.5" />
            Books
          </TabsTrigger>
          <TabsTrigger value="visibilidade" className="gap-1.5 rounded-full px-4">
            <MapPin className="h-3.5 w-3.5" />
            Visibilidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Books das construtoras</CardTitle>
              <p className="text-sm text-muted-foreground">
                Clique na construtora para abrir o book no Google Drive.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando…
                </div>
              ) : sortedDriveItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery || driveFilterLocalidadeId
                    ? "Nenhum book encontrado para estes filtros."
                    : "Nenhuma pasta do Drive cadastrada."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {drivePager.pageItems.map((item) => {
                    const bg = item.cor || "#079ED4";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openDriveFolder(item.driveFolderUrl!)}
                        className={cn(
                          "group flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-card p-4 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] transition-colors",
                          "hover:border-[#079ED4]/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079ED4]/35",
                        )}
                        title={`Abrir Drive de ${item.nome}`}
                      >
                        {item.logoUrl ? (
                          <span className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-black/5">
                            <img
                              src={item.logoUrl}
                              alt=""
                              className="max-h-full max-w-full object-contain"
                            />
                          </span>
                        ) : (
                          <span
                            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold tracking-wide text-white shadow-sm"
                            style={{ backgroundColor: bg }}
                          >
                            {construtoraIniciais(item.nome) || (
                              <FolderOpen className="h-6 w-6" />
                            )}
                          </span>
                        )}
                        <span className="line-clamp-2 text-sm font-medium text-foreground">
                          {item.nome}
                        </span>
                        {item.localidades && item.localidades.length > 0 ? (
                          <span className="line-clamp-1 text-[11px] text-muted-foreground">
                            {item.localidades.map((loc) => loc.nome).join(", ")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lista" className="mt-0">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lista de construtoras</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cadastro, contato, localidades e documentos de cada parceira.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando…
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Building className="h-8 w-8 opacity-40" />
                  <p>Nenhuma construtora cadastrada.</p>
                </div>
              ) : matchingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Building className="h-8 w-8 opacity-40" />
                  <p>Nenhuma construtora encontrada.</p>
                </div>
              ) : (
                <>
                <Table className="[&_th]:px-4 [&_td]:px-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CCA</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Viabilizador</TableHead>
                      <TableHead className="text-center">Empreend.</TableHead>
                      {canViewVendas ? (
                        <>
                          <TableHead className="text-center">Vendas</TableHead>
                          <TableHead className="text-right">VGV</TableHead>
                        </>
                      ) : null}
                      <TableHead className="text-center">Docs</TableHead>
                      <TableHead className="w-30" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {construtorasPager.pageItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {canViewVendas ? (
                            <button
                              type="button"
                              className="text-left hover:opacity-90"
                              onClick={() => openVendas(item)}
                              title="Ver vendas"
                            >
                              <ConstrutoraNomeChip
                                nome={item.nome}
                                cor={item.cor}
                              />
                            </button>
                          ) : (
                            <ConstrutoraNomeChip
                              nome={item.nome}
                              cor={item.cor}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.cca ? (
                            <Badge
                              className={catalogColorBadgeClass(
                                ccas.find((c) => c.label === item.cca)?.color,
                              )}
                              style={catalogColorBadgeStyle(
                                ccas.find((c) => c.label === item.cca)?.color,
                              )}
                              title={item.cca}
                            >
                              {item.cca}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{item.contato || "—"}</TableCell>
                        <TableCell>
                          {item.viabilizadorNome ? (
                            <div className="space-y-0.5">
                              <div>{item.viabilizadorNome}</div>
                              {canSeeViabilizadorContato &&
                                item.viabilizadorContato && (
                                  <div className="text-xs text-muted-foreground">
                                    {item.viabilizadorContato}
                                  </div>
                                )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {item._count?.empreendimentos ?? 0}
                          </Badge>
                        </TableCell>
                        {canViewVendas ? (
                          <>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto px-2 py-0.5"
                                onClick={() => openVendas(item)}
                                title="Ver vendas"
                              >
                                <Badge variant="secondary">
                                  {item.vendas ?? 0}
                                </Badge>
                              </Button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(item.vgv ?? 0)}
                            </TableCell>
                          </>
                        ) : null}
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {item._count?.documentacoes ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openView(item)}
                              title="Ver"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(item)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(item.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePager
                  page={construtorasPager.page}
                  totalPages={construtorasPager.totalPages}
                  total={construtorasPager.total}
                  onPageChange={construtorasPager.setPage}
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canViewVendas ? (
        <TabsContent value="vendas" className="mt-0 space-y-4">
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="bg-linear-to-br from-primary/10 via-background to-background pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-base">Vendas por construtora</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Selecione a construtora para ver as vendas feitas nela.
                  </p>
                </div>
                <div className="w-full max-w-md">
                  <Label className="mb-1.5 block text-xs">Construtora</Label>
                  <Select
                    value={vendasConstrutoraId || "__none__"}
                    onValueChange={(value) => {
                      const nextId = value === "__none__" ? "" : value;
                      setVendasConstrutoraId(nextId);
                      void navigate({
                        search: {
                          tab: "vendas",
                          id: nextId || undefined,
                        },
                        replace: true,
                      });
                    }}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Selecione a construtora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione…</SelectItem>
                      {vendasConstrutoras.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome}
                          {typeof item.vendas === "number"
                            ? ` · ${item.vendas} venda${item.vendas === 1 ? "" : "s"}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {vendasConstrutoraSelecionada ? (
                <div className="pt-1">
                  {vendasConstrutoraSelecionada.cor ? (
                    <Badge
                      variant="secondary"
                      className="border-transparent"
                      style={construtoraBadgeStyle(vendasConstrutoraSelecionada.cor)}
                    >
                      {vendasConstrutoraSelecionada.nome}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {vendasConstrutoraSelecionada.nome}
                    </Badge>
                  )}
                </div>
              ) : null}
            </CardHeader>
            {vendasConstrutoraId ? (
              <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
                <FinanceKpiCard
                  label="Vendas"
                  value={vendasTotais.vendas}
                  icon={Wallet}
                  tone="blue-1"
                  format="number"
                />
                <FinanceKpiCard
                  label="VGV"
                  value={vendasTotais.vgv}
                  icon={Wallet}
                  tone="blue-3"
                  format="money"
                />
                <FinanceKpiCard
                  label="Corretores"
                  value={vendasTotais.corretores}
                  icon={UsersRound}
                  tone="blue-4"
                  format="number"
                />
              </CardContent>
            ) : null}
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {!vendasConstrutoraId ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm">
                    Selecione uma construtora para ver as vendas.
                  </p>
                </div>
              ) : loadingVendas ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando vendas…
                </div>
              ) : vendas.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Wallet className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="text-sm">Nenhuma venda nesta construtora.</p>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-hidden">
                  <ConstrutoraVendasTable items={vendas} detailed />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        ) : null}

        <TabsContent value="visibilidade" className="mt-0">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Visibilidade por cidade
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    V quando a construtora já tem a localidade cadastrada; X
                    quando não tem.
                  </p>
                </div>
                {canManage ? (
                  <form
                    className="flex w-full gap-2 sm:max-w-sm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleAddMatrixCidade();
                    }}
                  >
                    <Input
                      placeholder="Nova cidade…"
                      value={matrixCidadeNome}
                      onChange={(event) =>
                        setMatrixCidadeNome(event.target.value)
                      }
                      maxLength={80}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={savingMatrixCidade}
                      className="shrink-0"
                    >
                      {savingMatrixCidade ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-1 h-4 w-4" />
                      )}
                      Cidade
                    </Button>
                  </form>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando…
                </div>
              ) : sortedItems.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Cadastre construtoras para ver a visibilidade por cidade.
                </p>
              ) : visibilityCities.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  {canManage
                    ? "Nenhuma cidade cadastrada. Adicione uma cidade para começar."
                    : "Nenhuma cidade cadastrada."}
                </p>
              ) : (
                <div className="overflow-x-auto overflow-y-hidden">
                  <Table className="min-w-max [&_th]:px-3 [&_td]:px-3">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="sticky left-0 z-20 min-w-44">
                          Construtora
                        </TableHead>
                        {visibilityCities.map((cidade) => (
                          <TableHead
                            key={cidade.id}
                            className="min-w-24 max-w-36 px-2 text-center"
                            title={cidade.nome}
                          >
                            <span className="line-clamp-2 text-xs font-medium leading-tight">
                              {cidade.nome}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {construtorasPager.pageItems.map((item, index) => {
                        const linkedIds = new Set(
                          (item.localidades ?? []).map(
                            (localidade) => localidade.id,
                          ),
                        );
                        return (
                          <TableRow
                            key={item.id}
                            className={cn(
                              "hover:bg-transparent",
                              index % 2 === 1 ? "bg-muted/40" : "bg-background",
                            )}
                          >
                            <TableCell
                              className={cn(
                                "sticky left-0 z-10 font-medium",
                                index % 2 === 1
                                  ? "bg-muted/40"
                                  : "bg-background",
                              )}
                            >
                              {item.nome}
                            </TableCell>
                            {visibilityCities.map((cidade) => {
                              const present = linkedIds.has(cidade.id);
                              return (
                                <TableCell
                                  key={cidade.id}
                                  className="px-2 text-center"
                                >
                                  {present ? (
                                    <Check
                                      className="mx-auto h-5 w-5 text-emerald-600"
                                      strokeWidth={2.75}
                                      aria-label={`${item.nome} atua em ${cidade.nome}`}
                                    />
                                  ) : (
                                    <X
                                      className="mx-auto h-5 w-5 text-red-500"
                                      strokeWidth={2.75}
                                      aria-label={`${item.nome} sem localidade em ${cidade.nome}`}
                                    />
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <TablePager
                    page={construtorasPager.page}
                    totalPages={construtorasPager.totalPages}
                    total={construtorasPager.total}
                    onPageChange={construtorasPager.setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialogShell
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetLogoState();
        }}
        className="max-w-3xl"
        icon={<Building className="w-5 h-5" />}
        title={
          formMode === "create"
            ? "Nova construtora"
            : formMode === "edit"
              ? "Editar construtora"
              : "Construtora"
        }
        description={
          formMode === "view"
            ? "Dados, book, cidades de atuação e empreendimentos vinculados."
            : "Preencha cada seção: identidade, contato, book no Drive e cidades."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody className="bg-muted/40">
            <Tabs
              value={formTab}
              onValueChange={(value) => setFormTab(value as FormTab)}
            >
              <TabsList className="mb-1 flex h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted p-1">
                <TabsTrigger
                  value="identidade"
                  className="gap-1.5 rounded-full px-3"
                >
                  <Palette className="h-3.5 w-3.5" />
                  Identidade
                </TabsTrigger>
                <TabsTrigger
                  value="contato"
                  className="gap-1.5 rounded-full px-3"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Contato
                </TabsTrigger>
                <TabsTrigger
                  value="viabilizador"
                  className="gap-1.5 rounded-full px-3"
                >
                  <User className="h-3.5 w-3.5" />
                  Viabilizador
                </TabsTrigger>
                <TabsTrigger value="book" className="gap-1.5 rounded-full px-3">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Book
                </TabsTrigger>
                <TabsTrigger
                  value="localidades"
                  className="gap-1.5 rounded-full px-3"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Cidades
                </TabsTrigger>
                {formMode !== "create" ? (
                  <TabsTrigger
                    value="empreendimentos"
                    className="gap-1.5 rounded-full px-3"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Empreend.
                  </TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="identidade" className="mt-4">
            <FormSection
              icon={<Palette className="h-4 w-4" />}
              title="Identidade"
              description="Nome, logo e cor que aparecem nos cards, na lista e nos books."
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm",
                    displayedLogo
                      ? "h-16 w-36 bg-white p-1.5 ring-1 ring-black/5"
                      : "h-16 w-16 text-lg font-bold tracking-wide text-white",
                  )}
                  style={
                    displayedLogo
                      ? undefined
                      : { backgroundColor: form.cor || "#079ED4" }
                  }
                >
                  {displayedLogo ? (
                    <img
                      src={displayedLogo}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    construtoraIniciais(form.nome) || (
                      <Building className="h-6 w-6" />
                    )
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-4">
                  {!readOnly || displayedLogo ? (
                    <ImageUploadField
                      images={displayedLogo ? [displayedLogo] : []}
                      max={CONSTRUTORA_MAX_IMAGES}
                      label="Logo"
                      hint="Tamanho ideal: 1920 × 1080 px (16:9). JPG, PNG ou WebP, máx. 5 MB."
                      recommendedSize="1920 × 1080"
                      disabled={readOnly}
                      busy={logoBusy}
                      shape="logo"
                      onAdd={(files) => void handleAddLogo(files)}
                      onRemove={() => void handleRemoveLogo()}
                    />
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={form.nome}
                      onChange={(e) => setField("nome", e.target.value)}
                      disabled={readOnly}
                      placeholder="Ex.: Usina de Obras"
                    />
                  </div>
                  <CorPicker
                    value={form.cor}
                    onChange={(hex) => setField("cor", hex)}
                    disabled={readOnly}
                  />
                  <div className="space-y-2">
                    <Label>CCA</Label>
                    <Select
                      value={form.cca || "__none__"}
                      onValueChange={(value) =>
                        setField("cca", value === "__none__" ? "" : value)
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione o CCA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem CCA</SelectItem>
                        {form.cca && !ccas.some((c) => c.label === form.cca) ? (
                          <SelectItem value={form.cca}>{form.cca}</SelectItem>
                        ) : null}
                        {ccas.map((item) => (
                          <SelectItem key={item.id} value={item.label}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.cca ? (
                      <Badge
                        className={catalogColorBadgeClass(
                          ccas.find((c) => c.label === form.cca)?.color,
                        )}
                        style={catalogColorBadgeStyle(
                          ccas.find((c) => c.label === form.cca)?.color,
                        )}
                        title={form.cca}
                      >
                        {form.cca}
                      </Badge>
                    ) : null}
                    {!readOnly && ccas.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Cadastre CCAs em Configurações para selecionar aqui.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </FormSection>
              </TabsContent>

              <TabsContent value="contato" className="mt-4">
            <FormSection
              icon={<Phone className="h-4 w-4" />}
              title="Contato"
              description="Telefone e endereço da construtora."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contato">Telefone</Label>
                  <Input
                    id="contato"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={PHONE_PLACEHOLDER}
                    value={form.contato}
                    onChange={(e) =>
                      setField("contato", formatPhone(e.target.value))
                    }
                    disabled={readOnly}
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={form.endereco}
                    onChange={(e) => setField("endereco", e.target.value)}
                    disabled={readOnly}
                    placeholder="Cidade, bairro ou endereço"
                  />
                </div>
              </div>
            </FormSection>
              </TabsContent>

              <TabsContent value="viabilizador" className="mt-4">
            <FormSection
              icon={<User className="h-4 w-4" />}
              title="Viabilizador"
              description="Pessoa de referência para viabilizar propostas nesta construtora."
            >
              <div
                className={
                  canSeeViabilizadorContato
                    ? "grid gap-4 sm:grid-cols-2"
                    : "grid gap-4"
                }
              >
                <div className="space-y-2">
                  <Label htmlFor="viabilizadorNome">Nome</Label>
                  <Input
                    id="viabilizadorNome"
                    value={form.viabilizadorNome}
                    onChange={(e) =>
                      setField("viabilizadorNome", e.target.value)
                    }
                    disabled={readOnly}
                  />
                </div>
                {canSeeViabilizadorContato ? (
                  <div className="space-y-2">
                    <Label htmlFor="viabilizadorContato">Telefone</Label>
                    <Input
                      id="viabilizadorContato"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={PHONE_PLACEHOLDER}
                      value={form.viabilizadorContato}
                      onChange={(e) =>
                        setField(
                          "viabilizadorContato",
                          formatPhone(e.target.value),
                        )
                      }
                      disabled={readOnly}
                      maxLength={15}
                    />
                  </div>
                ) : null}
              </div>
            </FormSection>
              </TabsContent>

              <TabsContent value="book" className="mt-4">
            <FormSection
              icon={<FolderOpen className="h-4 w-4" />}
              title="Book no Drive"
              description="Pasta da construtora no Google Drive. Aparece na aba Books."
            >
              <div className="space-y-2">
                <Label htmlFor="driveFolderUrl">Link da pasta</Label>
                <Input
                  id="driveFolderUrl"
                  type="text"
                  inputMode="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={form.driveFolderUrl}
                  onChange={(e) => setField("driveFolderUrl", e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </FormSection>
              </TabsContent>

              <TabsContent value="localidades" className="mt-4">
            <FormSection
              icon={<MapPin className="h-4 w-4" />}
              title="Localidades"
              description="Marque as cidades de atuação. Você também pode cadastrar, editar ou excluir o nome da região."
            >
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={newLocalidadeNome}
                    onChange={(e) => setNewLocalidadeNome(e.target.value)}
                    placeholder="Nova localidade (ex.: Recife)"
                    className="h-9 min-w-50 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreateLocalidade();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={savingLocalidade}
                    onClick={() => void handleCreateLocalidade()}
                  >
                    {savingLocalidade ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
                    Cadastrar região
                  </Button>
                </div>
              ) : null}
              {loadingLocalidades ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando localidades…
                </div>
              ) : localidades.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                  Nenhuma localidade cadastrada.
                </p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                  {localidades.map((localidade) => {
                    const checked = selectedLocalidades.includes(localidade.id);
                    const isEditing = editingLocalidadeId === localidade.id;
                    return (
                      <div
                        key={localidade.id}
                        className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleLocalidade(localidade.id, value === true)
                          }
                          disabled={readOnly}
                          aria-label={`Atua em ${localidade.nome}`}
                        />
                        {isEditing ? (
                          <Input
                            value={editingLocalidadeNome}
                            onChange={(e) =>
                              setEditingLocalidadeNome(e.target.value)
                            }
                            className="h-8 flex-1"
                            autoFocus
                            maxLength={80}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleUpdateLocalidade();
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditLocalidade();
                              }
                            }}
                          />
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {localidade.nome}
                          </span>
                        )}
                        {canManage ? (
                          <div className="flex shrink-0 items-center">
                            {isEditing ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Salvar nome"
                                  disabled={savingLocalidadeEdit}
                                  onClick={() => void handleUpdateLocalidade()}
                                >
                                  {savingLocalidadeEdit ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Cancelar"
                                  disabled={savingLocalidadeEdit}
                                  onClick={cancelEditLocalidade}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Editar nome"
                                  onClick={() =>
                                    startEditLocalidade(localidade)
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Excluir localidade"
                                  onClick={() =>
                                    setDeleteLocalidadeId(localidade.id)
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>
              </TabsContent>

            {formMode !== "create" && (
              <TabsContent value="empreendimentos" className="mt-4">
              <FormSection
                icon={<Building2 className="h-4 w-4" />}
                title="Empreendimentos vinculados"
                description="Selecione os empreendimentos desta construtora."
              >
                {loadingEmpreendimentos ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando empreendimentos…
                  </div>
                ) : empreendimentos.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">
                    Nenhum empreendimento disponível.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                    {empreendimentos.map((empreendimento) => {
                      const checked = selectedEmpreendimentos.includes(
                        empreendimento.id,
                      );
                      return (
                        <label
                          key={empreendimento.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-2 py-2 hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              toggleEmpreendimento(
                                empreendimento.id,
                                value === true,
                              )
                            }
                            disabled={readOnly}
                          />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm">
                              {empreendimento.nome}
                            </span>
                            {empreendimento.cidade && (
                              <span className="text-xs text-muted-foreground">
                                {empreendimento.cidade}
                              </span>
                            )}
                          </span>
                          {empreendimento.construtora &&
                            empreendimento.construtoraId !== editingId && (
                              <span className="text-xs text-muted-foreground">
                                {empreendimento.construtora.nome}
                              </span>
                            )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </FormSection>
              </TabsContent>
            )}
            </Tabs>
          </FormDialogBody>
          <FormDialogActions
            hint={
              selectedLocalidades.length
                ? `${selectedLocalidades.length} cidade${selectedLocalidades.length === 1 ? "" : "s"} selecionada${selectedLocalidades.length === 1 ? "" : "s"}`
                : undefined
            }
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            )}
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir construtora?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Documentações vinculadas
              permanecerão sem construtora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteLocalidadeId}
        onOpenChange={(v) => !v && !deletingLocalidade && setDeleteLocalidadeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir localidade?</AlertDialogTitle>
            <AlertDialogDescription>
              {localidadeToDelete
                ? `A cidade “${localidadeToDelete.nome}” será removida de todas as construtoras.`
                : "Esta localidade será removida de todas as construtoras."}
              {localidadeToDelete?._count?.construtoras
                ? ` Hoje ela está vinculada a ${localidadeToDelete._count.construtoras} construtora${localidadeToDelete._count.construtoras === 1 ? "" : "s"}.`
                : ""}{" "}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLocalidade}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingLocalidade}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteLocalidade();
              }}
            >
              {deletingLocalidade ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

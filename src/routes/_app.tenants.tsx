import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
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
import type { UserStatus } from "@/lib/auth";
import {
  createMetaConnection,
  createOzapConnection,
  createTenant,
  createTenantInitialAdmin,
  deleteMetaConnection,
  deleteOzapConnection,
  deleteTenant,
  fetchTenant,
  fetchTenants,
  populateTenantDemoData,
  resetTenantAdminPassword,
  slugifyTenantName,
  updateMetaConnection,
  updateOzapConnection,
  updateTenant,
  updateTenantAdmin,
  type PopulateDemoDataResult,
  type Tenant,
  type TenantAdminUser,
  type TenantDetail,
  type TenantMetaConnection,
  type TenantOzapConnection,
  type TenantOruloConnection,
} from "@/lib/tenants-api";
import {
  deleteTenantOruloConnection,
  updateTenantOruloConnection,
  upsertTenantOruloConnection,
} from "@/lib/orulo-api";
import {
  adminGroupEnabled,
  modulesFromTenantJson,
  modulesPresetForPlano,
  normalizeModulesForPlano,
  PLANO_LABELS,
  PLANO_MAX_USUARIOS,
  setAdminGroupEnabled,
  TENANT_MODULE_GROUPS,
  type TenantModuleKey,
  type TenantPlano,
} from "@/lib/tenant-modules";
import { formatCpfCnpj } from "@/lib/utils";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Check,
  Copy,
  DatabaseZap,
  KeyRound,
  Link2,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tenants")({
  head: () => ({ meta: [{ title: "Clientes — Zone Connection" }] }),
  component: TenantsPage,
});

type TenantForm = {
  name: string;
  slug: string;
  documento: string;
  status: UserStatus;
  logoUrl: string;
  plano: TenantPlano;
  usuariosExtras: number;
  iaBotEnabled: boolean;
  isTest: boolean;
  modules: Record<TenantModuleKey, boolean>;
};

type TenantListFilter = "reais" | "teste" | "todos";

const emptyTenantForm = (): TenantForm => ({
  name: "",
  slug: "",
  documento: "",
  status: "ativo",
  logoUrl: "",
  plano: "bronze",
  usuariosExtras: 0,
  iaBotEnabled: false,
  isTest: false,
  modules: modulesPresetForPlano("bronze"),
});

function connectionLabels(item: Tenant): string[] {
  const labels: string[] = [];
  if (item.iaBotEnabled || item.hasOzapConnection) labels.push("IA");
  if (item.hasMetaConnection) labels.push("Meta");
  return labels;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOGO_URL_REGEX = /^https?:\/\/.+/i;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

function TenantsPage() {
  const [items, setItems] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [listFilter, setListFilter] = useState<TenantListFilter>("reais");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [tenantFormTab, setTenantFormTab] = useState("dados");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyTenantForm());
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [metaPageId, setMetaPageId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [ozapInstanceId, setOzapInstanceId] = useState("");
  const [oruloClientId, setOruloClientId] = useState("");
  const [oruloClientSecret, setOruloClientSecret] = useState("");
  const [savingConnection, setSavingConnection] = useState(false);

  const [savingAdmin, setSavingAdmin] = useState(false);

  const [deleteMeta, setDeleteMeta] = useState<TenantMetaConnection | null>(
    null,
  );
  const [deleteOzap, setDeleteOzap] = useState<TenantOzapConnection | null>(
    null,
  );
  const [deleteOrulo, setDeleteOrulo] = useState<TenantOruloConnection | null>(
    null,
  );
  const [deleteTenantTarget, setDeleteTenantTarget] = useState<Tenant | null>(
    null,
  );
  const [deletingTenant, setDeletingTenant] = useState(false);
  const [demoTarget, setDemoTarget] = useState<Tenant | null>(null);
  const [demoLimparAntes, setDemoLimparAntes] = useState(false);
  const [populatingDemo, setPopulatingDemo] = useState(false);
  const [demoResult, setDemoResult] = useState<PopulateDemoDataResult | null>(
    null,
  );

  const [editingAdmin, setEditingAdmin] = useState<TenantAdminUser | null>(
    null,
  );
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [editingUserCount, setEditingUserCount] = useState<number | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    slug: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(
    null,
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchTenants());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os tenants.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const activeItems = useMemo(
    () => items.filter((item) => item.status === "ativo"),
    [items],
  );
  const realCount = activeItems.filter((item) => !item.isTest).length;
  const testCount = activeItems.filter((item) => item.isTest).length;
  const visibleItems = useMemo(() => {
    if (listFilter === "reais")
      return activeItems.filter((item) => !item.isTest);
    if (listFilter === "teste")
      return activeItems.filter((item) => item.isTest);
    return activeItems;
  }, [activeItems, listFilter]);
  const pager = useTablePager(visibleItems, listFilter);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setEditingAdmin(null);
    setEditingUserCount(null);
    setForm(emptyTenantForm());
    setSlugTouched(false);
    setTenantFormTab("dados");
    setFormOpen(true);
  }

  async function openEdit(item: Tenant) {
    setFormMode("edit");
    setEditingId(item.id);
    setEditingAdmin(item.admin);
    setAdminName(item.admin?.name ?? "");
    setAdminEmail(item.admin?.email ?? "");
    setEditingUserCount(null);
    setTenantFormTab("dados");
    setForm({
      name: item.name,
      slug: item.slug,
      documento: formatCpfCnpj(item.documento ?? ""),
      status: item.status,
      logoUrl: item.logoUrl ?? "",
      plano: item.plano ?? "bronze",
      usuariosExtras: item.usuariosExtras ?? 0,
      iaBotEnabled: Boolean(item.iaBotEnabled),
      isTest: Boolean(item.isTest),
      modules: modulesFromTenantJson(item.modules),
    });
    setSlugTouched(true);
    setFormOpen(true);
    try {
      const detail = await fetchTenant(item.id);
      setEditingAdmin(detail.admin);
      setAdminName(detail.admin?.name ?? "");
      setAdminEmail(detail.admin?.email ?? "");
      setEditingUserCount(detail.userCount);
      setForm({
        name: detail.name,
        slug: detail.slug,
        documento: formatCpfCnpj(detail.documento ?? ""),
        status: detail.status,
        logoUrl: detail.logoUrl ?? "",
        plano: detail.plano ?? "bronze",
        usuariosExtras: detail.usuariosExtras ?? 0,
        iaBotEnabled: Boolean(detail.iaBotEnabled),
        isTest: Boolean(detail.isTest),
        modules: modulesFromTenantJson(detail.modules),
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar todos os dados do tenant.",
      );
    }
  }

  async function copyText(value: string, field: "email" | "password") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function handleResetAdminPassword() {
    if (!editingId || !editingAdmin) return;
    setResettingPassword(true);
    try {
      const result = await resetTenantAdminPassword(editingId);
      setCredentials({
        name: result.user.name,
        email: result.user.email,
        password: result.temporaryPassword,
        slug: form.slug,
      });
      setEditingAdmin({
        ...editingAdmin,
        ...result.user,
      });
      toast.success("Senha temporária gerada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao gerar senha temporária.",
      );
    } finally {
      setResettingPassword(false);
    }
  }

  async function openDetail(item: Tenant) {
    setDetailOpen(true);
    setDetail(null);
    setMetaPageId("");
    setMetaToken("");
    setOzapInstanceId("");
    setDetailLoading(true);
    try {
      setDetail(await fetchTenant(item.id));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o tenant.",
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function reloadDetail(tenantId: string) {
    setDetail(await fetchTenant(tenantId));
    await loadItems();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const slug = form.slug.trim().toLowerCase();

    if (name.length < 2) {
      toast.error("Informe o nome da imobiliária.");
      return;
    }
    if (formMode === "create" && !SLUG_REGEX.test(slug)) {
      toast.error(
        "Slug inválido. Use letras minúsculas, números e hífens (ex.: new-palace).",
      );
      return;
    }

    const logoUrl = form.logoUrl.trim();
    if (logoUrl && !LOGO_URL_REGEX.test(logoUrl)) {
      toast.error("A URL do logo deve começar com http:// ou https://.");
      return;
    }

    const modules = normalizeModulesForPlano(form.plano, form.modules);

    if (formMode === "create") {
      setSaving(true);
      try {
        const created = await createTenant({
          name,
          slug,
          documento: form.documento,
          status: form.status,
          logoUrl: logoUrl || null,
          plano: form.plano,
          usuariosExtras: form.usuariosExtras,
          iaBotEnabled: form.iaBotEnabled,
          isTest: form.isTest,
          modules,
        });
        setFormOpen(false);
        setCredentials({
          name: created.admin.name,
          email: created.admin.email,
          password: created.temporaryPassword,
          slug: created.slug,
        });
        toast.success("Tenant criado com administrador.");
        await loadItems();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Falha ao salvar o tenant.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!editingId) return;

    let nextAdmin: { name: string; email: string } | null = null;
    if (editingAdmin) {
      const nextName = adminName.trim();
      const nextEmail = adminEmail.trim().toLowerCase();
      if (nextName.length < 2) {
        toast.error("Informe o nome do administrador.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        toast.error("Informe um e-mail de login válido.");
        return;
      }
      nextAdmin = { name: nextName, email: nextEmail };
    }

    setSaving(true);
    try {
      await updateTenant(editingId, {
        name,
        documento: form.documento,
        status: form.status,
        logoUrl: logoUrl || null,
        plano: form.plano,
        usuariosExtras: form.usuariosExtras,
        iaBotEnabled: form.iaBotEnabled,
        isTest: form.isTest,
        modules,
      });
      if (
        editingAdmin &&
        nextAdmin &&
        (nextAdmin.name !== editingAdmin.name ||
          nextAdmin.email !== editingAdmin.email)
      ) {
        const updatedAdmin = await updateTenantAdmin(editingId, nextAdmin);
        setEditingAdmin({ ...editingAdmin, ...updatedAdmin });
      }
      toast.success("Tenant atualizado.");
      setFormOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao salvar o tenant.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateInitialAdmin(tenantId: string, slug: string) {
    setSavingAdmin(true);
    try {
      const result = await createTenantInitialAdmin(tenantId);
      setCredentials({
        name: result.user.name,
        email: result.user.email,
        password: result.temporaryPassword,
        slug,
      });
      if (editingId === tenantId) {
        setEditingAdmin(result.user);
        setAdminName(result.user.name);
        setAdminEmail(result.user.email);
      }
      toast.success("Administrador gerado.");
      if (detail?.id === tenantId) {
        await reloadDetail(tenantId);
      } else {
        await loadItems();
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao criar o administrador.",
      );
    } finally {
      setSavingAdmin(false);
    }
  }

  async function confirmDeleteTenant() {
    if (!deleteTenantTarget) return;
    setDeletingTenant(true);
    try {
      await deleteTenant(deleteTenantTarget.id);
      toast.success(`Tenant "${deleteTenantTarget.name}" removido.`);
      setDeleteTenantTarget(null);
      if (editingId === deleteTenantTarget.id) {
        setFormOpen(false);
      }
      if (detail?.id === deleteTenantTarget.id) {
        setDetailOpen(false);
        setDetail(null);
      }
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao remover o tenant.",
      );
    } finally {
      setDeletingTenant(false);
    }
  }

  async function confirmPopulateDemo() {
    if (!demoTarget) return;
    setPopulatingDemo(true);
    try {
      const result = await populateTenantDemoData(demoTarget.id, {
        limparAntes: demoLimparAntes,
      });
      setDemoTarget(null);
      setDemoLimparAntes(false);
      setDemoResult(result);
      toast.success(
        `Dados de demonstração gerados em "${result.tenantName}".`,
      );
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao gerar os dados de demonstração.",
      );
    } finally {
      setPopulatingDemo(false);
    }
  }

  async function handleAddMeta(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const pageId = metaPageId.trim();
    const pageAccessToken = metaToken.trim();
    if (!pageId || !pageAccessToken) {
      toast.error("Informe page ID e page access token.");
      return;
    }

    setSavingConnection(true);
    try {
      await createMetaConnection(detail.id, { pageId, pageAccessToken });
      setMetaPageId("");
      setMetaToken("");
      toast.success("Conexão Meta adicionada.");
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao adicionar conexão Meta.",
      );
    } finally {
      setSavingConnection(false);
    }
  }

  async function handleAddOzap(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const instanceId = Number(ozapInstanceId.trim());
    if (!Number.isInteger(instanceId) || instanceId <= 0) {
      toast.error("Informe um instance ID válido.");
      return;
    }

    setSavingConnection(true);
    try {
      await createOzapConnection(detail.id, { instanceId });
      setOzapInstanceId("");
      toast.success("Conexão OZap adicionada.");
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao adicionar conexão OZap.",
      );
    } finally {
      setSavingConnection(false);
    }
  }

  async function toggleMeta(connection: TenantMetaConnection) {
    if (!detail) return;
    try {
      await updateMetaConnection(detail.id, connection.id, {
        ativo: !connection.ativo,
      });
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao atualizar conexão Meta.",
      );
    }
  }

  async function toggleOzap(connection: TenantOzapConnection) {
    if (!detail) return;
    try {
      await updateOzapConnection(detail.id, connection.id, {
        ativo: !connection.ativo,
      });
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao atualizar conexão OZap.",
      );
    }
  }

  async function confirmDeleteMeta() {
    if (!detail || !deleteMeta) return;
    try {
      await deleteMetaConnection(detail.id, deleteMeta.id);
      toast.success("Conexão Meta removida.");
      setDeleteMeta(null);
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao remover conexão Meta.",
      );
    }
  }

  async function handleAddOrulo(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    if (!oruloClientId.trim() || !oruloClientSecret.trim()) {
      toast.error("Informe Client ID e Secret da Órulo.");
      return;
    }
    setSavingConnection(true);
    try {
      await upsertTenantOruloConnection(detail.id, {
        clientId: oruloClientId.trim(),
        clientSecret: oruloClientSecret.trim(),
      });
      setOruloClientId("");
      setOruloClientSecret("");
      toast.success("Órulo conectada. A sincronização começou.");
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao conectar a Órulo.",
      );
    } finally {
      setSavingConnection(false);
    }
  }

  async function toggleOrulo(connection: TenantOruloConnection) {
    if (!detail) return;
    try {
      await updateTenantOruloConnection(detail.id, { ativo: !connection.ativo });
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao atualizar conexão Órulo.",
      );
    }
  }

  async function confirmDeleteOzap() {
    if (!detail || !deleteOzap) return;
    try {
      await deleteOzapConnection(detail.id, deleteOzap.id);
      toast.success("Conexão OZap removida.");
      setDeleteOzap(null);
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao remover conexão OZap.",
      );
    }
  }

  async function confirmDeleteOrulo() {
    if (!detail || !deleteOrulo) return;
    try {
      await deleteTenantOruloConnection(detail.id);
      toast.success("Conexão Órulo removida.");
      setDeleteOrulo(null);
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao remover conexão Órulo.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Separe clientes reais dos ambientes de teste. Plano, documento e conexões."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        }
      />

      <Tabs
        value={listFilter}
        onValueChange={(value) => setListFilter(value as TenantListFilter)}
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted p-1 sm:w-auto">
          <TabsTrigger value="reais" className="rounded-full px-4">
            Reais
            <span className="ml-1.5 text-[11px] text-muted-foreground">
              {realCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="teste" className="rounded-full px-4">
            Teste
            <span className="ml-1.5 text-[11px] text-muted-foreground">
              {testCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="todos" className="rounded-full px-4">
            Todos
            <span className="ml-1.5 text-[11px] text-muted-foreground">
              {activeItems.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando tenants…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 opacity-40" />
              <p>Nenhum cliente cadastrado.</p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Criar primeiro cliente
              </Button>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 opacity-40" />
              <p>
                {listFilter === "teste"
                  ? "Nenhum cliente de teste."
                  : "Nenhum cliente real nesta lista."}
              </p>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Conexão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[240px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pager.pageItems.map((item) => {
                  const conexoes = connectionLabels(item);
                  return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                          {item.logoUrl ? (
                            <img
                              src={item.logoUrl}
                              alt=""
                              className="h-full w-full object-contain p-0.5"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-medium truncate">{item.name}</div>
                            {item.isTest ? (
                              <Badge
                                variant="secondary"
                                className="shrink-0 text-[10px]"
                              >
                                Teste
                              </Badge>
                            ) : null}
                          </div>
                          <code className="text-[11px] text-muted-foreground">
                            {item.slug}
                          </code>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {item.documento
                        ? formatCpfCnpj(item.documento)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {PLANO_LABELS[item.plano] ?? item.plano ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {conexoes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {conexoes.map((c) => (
                            <Badge
                              key={c}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {c}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "ativo" ? "default" : "secondary"
                        }
                        className={STATUS_CHIP_CLASS}
                        title={item.status === "ativo" ? "Ativo" : "Inativo"}
                      >
                        {item.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Conexões Meta / OZap"
                          onClick={() => void openDetail(item)}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => void openEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Popular com dados de demonstração"
                          disabled={populatingDemo}
                          onClick={() => {
                            setDemoLimparAntes(false);
                            setDemoTarget(item);
                          }}
                        >
                          <DatabaseZap className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTenantTarget(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePager
              page={pager.page}
              totalPages={pager.totalPages}
              total={pager.total}
              onPageChange={pager.setPage}
            />
            </>
          )}
        </CardContent>
      </Card>

      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={<Building2 className="w-5 h-5" />}
        title={formMode === "create" ? "Novo cliente" : "Editar cliente"}
        description={
          formMode === "create"
            ? "Cadastre o cliente (imobiliária), documento, plano e módulos. O admin é gerado automaticamente."
            : "Atualize documento, plano, cota, logo, módulos e o e-mail de login deste cliente."
        }
        className={
          formMode === "edit" || formMode === "create" ? "max-w-2xl" : undefined
        }
      >
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <FormDialogBody>
            <Tabs
              value={tenantFormTab}
              onValueChange={setTenantFormTab}
              className="gap-4"
            >
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="plano">Plano</TabsTrigger>
                <TabsTrigger value="identidade">Identidade</TabsTrigger>
                <TabsTrigger value="modulos">Módulos</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="mt-0 space-y-0">
                <FormSection title="Dados do cliente">
                  <div className="space-y-2">
                    <Label htmlFor="tenant-name">Cliente (nome)</Label>
                    <Input
                      id="tenant-name"
                      value={form.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          name,
                          slug:
                            formMode === "create" && !slugTouched
                              ? slugifyTenantName(name)
                              : prev.slug,
                        }));
                      }}
                      placeholder="New Palace"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-documento">Documento (CPF/CNPJ)</Label>
                    <Input
                      id="tenant-documento"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.documento}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          documento: formatCpfCnpj(e.target.value),
                        }))
                      }
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-slug">Slug</Label>
                    <Input
                      id="tenant-slug"
                      value={form.slug}
                      disabled={formMode === "edit"}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setForm((prev) => ({
                          ...prev,
                          slug: e.target.value.toLowerCase(),
                        }));
                      }}
                      placeholder="new-palace"
                      required={formMode === "create"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Identificador único na URL/login (ex.: new-palace).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          status: value as UserStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={form.isTest}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          isTest: checked === true,
                        }))
                      }
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        Cliente de teste
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Aparece na aba Teste, separado dos clientes reais.
                      </span>
                    </span>
                  </label>
                </FormSection>
              </TabsContent>

              <TabsContent value="plano" className="mt-0 space-y-0">
                <FormSection title="Plano e cotas">
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select
                      value={form.plano}
                      onValueChange={(value) => {
                        const plano = value as TenantPlano;
                        setForm((prev) => ({
                          ...prev,
                          plano,
                          modules: modulesPresetForPlano(plano),
                          iaBotEnabled:
                            plano === "ouro" ? true : prev.iaBotEnabled,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PLANO_LABELS) as TenantPlano[]).map(
                          (p) => (
                            <SelectItem key={p} value={p}>
                              {PLANO_LABELS[p]} ({PLANO_MAX_USUARIOS[p]} users)
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Cota base: {PLANO_MAX_USUARIOS[form.plano]} usuário
                      {PLANO_MAX_USUARIOS[form.plano] === 1 ? "" : "s"}.
                      Extras liberam além do limite
                      {form.plano === "solo"
                        ? " (ex.: um assistente)."
                        : " para o admin da imobiliária."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="tenant-extras">Usuários extras</Label>
                      <Input
                        id="tenant-extras"
                        type="number"
                        min={0}
                        value={form.usuariosExtras}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            usuariosExtras: Math.max(
                              0,
                              Number(e.target.value) || 0,
                            ),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Limite total:{" "}
                        {PLANO_MAX_USUARIOS[form.plano] + form.usuariosExtras}
                        {editingUserCount != null
                          ? ` · ${editingUserCount} em uso`
                          : ""}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Bot de IA</Label>
                      <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.iaBotEnabled}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              iaBotEnabled: e.target.checked,
                            }))
                          }
                        />
                        Conexão com bot de IA liberada
                      </label>
                    </div>
                  </div>
                </FormSection>
              </TabsContent>

              <TabsContent value="identidade" className="mt-0 space-y-0">
                <FormSection title="Logo">
                  <p className="text-xs text-muted-foreground -mt-1">
                    URL da logo da imobiliária. Se vazio, usa a logo da Zone
                    Connection.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-logo">URL do logo</Label>
                    <Input
                      id="tenant-logo"
                      value={form.logoUrl}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          logoUrl: e.target.value,
                        }))
                      }
                      placeholder="https://..."
                    />
                  </div>
                  {form.logoUrl.trim() ? (
                    <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                      <img
                        src={form.logoUrl.trim()}
                        alt="Prévia do logo"
                        className="h-10 w-10 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        Prévia (se a URL for válida)
                      </span>
                    </div>
                  ) : null}
                </FormSection>
              </TabsContent>

              <TabsContent value="modulos" className="mt-0 space-y-0">
                <FormSection title="Módulos">
                  <p className="text-xs text-muted-foreground -mt-1">
                    {form.plano === "solo"
                      ? "Solo tem recorte fixo: CRM com Funil (sem Clientes, usuários e permissões no menu), fechamento, metas e financeiro enxuto. Usuário extra cadastra em Configurações."
                      : form.plano === "bronze"
                      ? "Bronze inclui o CRM operacional, Usuários, Configurações e um cadastro simples de vendas (sem Documentação)."
                      : form.plano === "prata"
                        ? "Prata: escolha Administrativo ou Financeiro (não os dois). Analista só com Administrativo."
                        : "Marque os módulos ativos para este tenant. Desmarcados ficam ocultos no menu."}
                  </p>
                  <div className="space-y-4">
                    {TENANT_MODULE_GROUPS.map((group) => {
                      const adminOn =
                        group.id === "administrativo" &&
                        adminGroupEnabled(form.modules);
                      const bronzeLocked =
                        form.plano === "bronze" &&
                        (group.id === "administrativo" ||
                          group.id === "financeiro");
                      const soloLocked = form.plano === "solo";
                      const prataFinanceLockedByAdmin =
                        form.plano === "prata" &&
                        group.id === "financeiro" &&
                        adminGroupEnabled(form.modules);
                      const prataAdminLockedByFinance =
                        form.plano === "prata" &&
                        group.id === "administrativo" &&
                        form.modules.financeiro === true &&
                        !adminGroupEnabled(form.modules);

                      return (
                        <div
                          key={group.id}
                          className="rounded-lg border bg-muted/20 p-3 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">
                              {group.label}
                            </p>
                            {group.id === "administrativo" &&
                            form.plano !== "bronze" &&
                            form.plano !== "solo" ? (
                              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <span className="text-muted-foreground">
                                  {adminOn ? "Ativo" : "Desativado"}
                                </span>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={adminOn}
                                  disabled={prataAdminLockedByFinance}
                                  onChange={(e) =>
                                    setForm((prev) => ({
                                      ...prev,
                                      modules: normalizeModulesForPlano(
                                        prev.plano,
                                        {
                                          ...setAdminGroupEnabled(
                                            prev.modules,
                                            e.target.checked,
                                          ),
                                          ...(e.target.checked &&
                                          prev.plano === "prata"
                                            ? { financeiro: false }
                                            : {}),
                                        },
                                      ),
                                    }))
                                  }
                                />
                                <span className="font-medium">
                                  Todo o administrativo
                                </span>
                              </label>
                            ) : null}
                          </div>
                          {bronzeLocked ? (
                            <p className="text-[11px] text-muted-foreground">
                              Indisponível no plano Bronze.
                            </p>
                          ) : null}
                          {group.id === "administrativo" &&
                          !adminOn &&
                          form.plano !== "bronze" &&
                          form.plano !== "solo" ? (
                            <p className="text-[11px] text-muted-foreground">
                              Desativar o administrativo oculta estes módulos
                              (exceto Usuários e Configurações) e remove o perfil
                              Analista.
                            </p>
                          ) : null}
                          {prataFinanceLockedByAdmin ? (
                            <p className="text-[11px] text-muted-foreground">
                              Com Administrativo ativo no Prata, o Financeiro
                              fica desligado.
                            </p>
                          ) : null}
                          <div className="grid gap-2 sm:grid-cols-2 text-sm">
                            {group.modules.map((mod) => {
                              const lockedOff =
                                bronzeLocked ||
                                prataFinanceLockedByAdmin ||
                                (group.id === "administrativo" &&
                                  !adminOn &&
                                  !mod.keepOnAdminBulkOff) ||
                                (prataAdminLockedByFinance &&
                                  !mod.keepOnAdminBulkOff);
                              return (
                                <label
                                  key={mod.key}
                                  className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                                    lockedOff ||
                                    (soloLocked && group.id !== "operacoes")
                                      ? "opacity-60 bg-muted/40"
                                      : "bg-background"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      group.id === "operacoes"
                                        ? form.modules[mod.key] === true
                                        : form.modules[mod.key] !== false
                                    }
                                    disabled={
                                      lockedOff ||
                                      bronzeLocked ||
                                      (soloLocked && group.id !== "operacoes")
                                    }
                                    onChange={(e) =>
                                      setForm((prev) => {
                                        let modules = {
                                          ...prev.modules,
                                          [mod.key]: e.target.checked,
                                        };
                                        if (
                                          prev.plano === "prata" &&
                                          mod.key === "financeiro" &&
                                          e.target.checked
                                        ) {
                                          modules = setAdminGroupEnabled(
                                            modules,
                                            false,
                                          );
                                          modules.financeiro = true;
                                        }
                                        return {
                                          ...prev,
                                          modules: normalizeModulesForPlano(
                                            prev.plano,
                                            modules,
                                          ),
                                        };
                                      })
                                    }
                                  />
                                  <span>{mod.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </FormSection>
              </TabsContent>

              <TabsContent value="admin" className="mt-0 space-y-0">
                {formMode === "edit" ? (
                  <FormSection title="Administrador">
                    {editingAdmin ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="tenant-admin-name">Nome</Label>
                          <Input
                            id="tenant-admin-name"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            placeholder="Admin da imobiliária"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tenant-admin-email">
                            E-mail de login
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="tenant-admin-email"
                              type="email"
                              value={adminEmail}
                              onChange={(e) =>
                                setAdminEmail(e.target.value.toLowerCase())
                              }
                              placeholder="admin@imobiliaria.com"
                              className="font-mono text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={!adminEmail.trim()}
                              onClick={() =>
                                void copyText(adminEmail.trim(), "email")
                              }
                            >
                              {copiedField === "email" ? (
                                <Check className="w-3.5 h-3.5 mr-1" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 mr-1" />
                              )}
                              Copiar
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Este e-mail pertence só a este tenant (
                            <code className="rounded bg-muted px-1">
                              {form.slug}
                            </code>
                            ). Alterar não muda o login do cliente original.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={resettingPassword}
                          onClick={() => void handleResetAdminPassword()}
                        >
                          {resettingPassword ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Gerando…
                            </>
                          ) : (
                            "Gerar nova senha temporária"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum administrador encontrado para este cliente.
                      </p>
                    )}
                  </FormSection>
                ) : (
                  <FormSection title="Administrador">
                    <p className="text-sm text-muted-foreground">
                      Ao criar o tenant, um admin é gerado automaticamente
                      (e-mail{" "}
                      <code className="rounded bg-muted px-1">
                        admin@
                        {(form.slug || "slug").replace(/-/g, "")}
                        .com
                      </code>{" "}
                      e senha temporária). As credenciais aparecem na tela
                      seguinte.
                    </p>
                  </FormSection>
                )}
              </TabsContent>
            </Tabs>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : formMode === "create" ? (
                "Criar tenant"
              ) : (
                "Salvar"
              )}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={detailOpen}
        onOpenChange={setDetailOpen}
        icon={<Link2 className="w-5 h-5" />}
        title={detail ? `Conexões — ${detail.name}` : "Conexões"}
        description="Vincule Meta Lead Ads, OZap e o catálogo da Órulo a este tenant."
      >
        <FormDialogBody>
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando…
            </div>
          ) : (
            <div className="space-y-6">
              {detail.userCount === 0 && (
                <FormSection title="Administrador">
                  <p className="text-xs text-muted-foreground -mt-1">
                    Este tenant ainda não tem usuários. Gere o admin para
                    liberar o login em /login (slug:{" "}
                    <code className="rounded bg-muted px-1">{detail.slug}</code>
                    ).
                  </p>
                  <Button
                    type="button"
                    disabled={savingAdmin}
                    onClick={() =>
                      void handleCreateInitialAdmin(detail.id, detail.slug)
                    }
                  >
                    {savingAdmin ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando…
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Gerar administrador
                      </>
                    )}
                  </Button>
                </FormSection>
              )}

              <FormSection title="Meta Lead Ads">
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={(e) => void handleAddMeta(e)}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-page">Page ID</Label>
                    <Input
                      id="meta-page"
                      value={metaPageId}
                      onChange={(e) => setMetaPageId(e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-token">Page Access Token</Label>
                    <Input
                      id="meta-token"
                      type="password"
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder="EAA..."
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={savingConnection}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </form>

                {detail.metaConnections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma página Meta vinculada.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.metaConnections.map((connection) => (
                      <li
                        key={connection.id}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Share2 className="h-4 w-4 shrink-0 text-blue-600" />
                            <span className="truncate font-medium">
                              {connection.pageName ?? connection.pageId}
                            </span>
                            <Badge
                              variant={
                                connection.ativo ? "default" : "secondary"
                              }
                              className={STATUS_CHIP_CLASS}
                            >
                              {connection.ativo ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {connection.pageName ? `${connection.pageId} · ` : ""}
                            Token {connection.pageAccessToken}
                            {connection.adAccountName
                              ? ` · ${connection.adAccountName}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void toggleMeta(connection)}
                          >
                            {connection.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteMeta(connection)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>

              <FormSection title="OZap / WhatsApp">
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_auto]"
                  onSubmit={(e) => void handleAddOzap(e)}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="ozap-instance">Instance ID</Label>
                    <Input
                      id="ozap-instance"
                      value={ozapInstanceId}
                      onChange={(e) => setOzapInstanceId(e.target.value)}
                      placeholder="1143"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={savingConnection}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </form>

                {detail.ozapConnections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma instância OZap vinculada.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.ozapConnections.map((connection) => (
                      <li
                        key={connection.id}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium">
                            Instância {connection.instanceId}
                          </span>
                          <Badge
                            variant={connection.ativo ? "default" : "secondary"}
                            className={STATUS_CHIP_CLASS}
                          >
                            {connection.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void toggleOzap(connection)}
                          >
                            {connection.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteOzap(connection)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>

              <FormSection title="Órulo">
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={(e) => void handleAddOrulo(e)}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="orulo-client">Client ID</Label>
                    <Input
                      id="orulo-client"
                      value={oruloClientId}
                      onChange={(e) => setOruloClientId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="orulo-secret">Client Secret</Label>
                    <Input
                      id="orulo-secret"
                      type="password"
                      value={oruloClientSecret}
                      onChange={(e) => setOruloClientSecret(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={savingConnection}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </form>

                {(detail.oruloConnections ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma credencial Órulo vinculada.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.oruloConnections.map((connection) => (
                      <li
                        key={connection.id}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-amber-700" />
                            <span className="truncate font-medium">
                              {connection.clientId}
                            </span>
                            <Badge
                              variant={
                                connection.ativo ? "default" : "secondary"
                              }
                              className={STATUS_CHIP_CLASS}
                            >
                              {connection.ativo ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          {connection.lastError ? (
                            <p className="truncate text-xs text-destructive">
                              {connection.lastError}
                            </p>
                          ) : connection.syncing ? (
                            <p className="text-xs text-muted-foreground">
                              Sincronizando catálogo…
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void toggleOrulo(connection)}
                          >
                            {connection.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteOrulo(connection)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>
            </div>
          )}
        </FormDialogBody>
        <FormDialogActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDetailOpen(false)}
          >
            Fechar
          </Button>
        </FormDialogActions>
      </FormDialogShell>

      <FormDialogShell
        open={!!credentials}
        onOpenChange={(o) => !o && setCredentials(null)}
        icon={<KeyRound className="w-5 h-5" />}
        title="Credenciais do administrador"
        description={
          credentials
            ? `Anote e entregue a ${credentials.name}. A senha só aparece agora.`
            : undefined
        }
      >
        {credentials && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                title="Acesso do admin"
              >
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      E-mail
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm break-all">
                        {credentials.email}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.email, "email")
                        }
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      Senha temporária
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-semibold tracking-wide break-all">
                        {credentials.password}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.password, "password")
                        }
                      >
                        {copiedField === "password" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Login em /login com este e-mail. Slug opcional:{" "}
                    <code className="rounded bg-muted px-1">
                      {credentials.slug}
                    </code>
                  </p>
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint="Peça ao admin para trocar a senha no perfil após o login.">
              <Button type="button" onClick={() => setCredentials(null)}>
                Entendi
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteTenantTarget)}
        onOpenChange={(open) =>
          !open && !deletingTenant && setDeleteTenantTarget(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove permanentemente{" "}
              <strong>{deleteTenantTarget?.name}</strong> (
              <code>{deleteTenantTarget?.slug}</code>), incluindo usuários,
              leads, conexões Meta/OZap e demais dados vinculados. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTenant}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingTenant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteTenant();
              }}
            >
              {deletingTenant ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(demoTarget)}
        onOpenChange={(open) => !open && !populatingDemo && setDemoTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Popular com dados de demonstração?</AlertDialogTitle>
            <AlertDialogDescription>
              Gera uma operação fictícia completa em{" "}
              <strong>{demoTarget?.name}</strong> (
              <code>{demoTarget?.slug}</code>): usuários (gerentes, corretores,
              analista e trainee), equipes, funil, catálogos, construtoras,
              empreendimentos, leads e clientes em todas as etapas, leads
              perdidos, triagem, documentações, propostas, análises, agenda,
              metas, notificações, treinamento e financeiro (títulos, despesas,
              recebimentos e comissões).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <Checkbox
              checked={demoLimparAntes}
              disabled={populatingDemo}
              onCheckedChange={(checked) =>
                setDemoLimparAntes(checked === true)
              }
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">
                Limpar os dados atuais antes de gerar
              </span>
              <span className="block text-xs text-muted-foreground">
                Apaga leads, imóveis, agenda, documentações, financeiro e os
                usuários de demonstração deste cliente. O admin e os usuários
                reais, o funil e as conexões são mantidos. Sem marcar, os dados
                novos são apenas somados (registros já existentes são
                reaproveitados).
              </span>
            </span>
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={populatingDemo}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={populatingDemo}
              onClick={(e) => {
                e.preventDefault();
                void confirmPopulateDemo();
              }}
            >
              {populatingDemo ? "Gerando…" : "Gerar dados"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialogShell
        open={Boolean(demoResult)}
        onOpenChange={(o) => !o && setDemoResult(null)}
        icon={<Sparkles className="w-5 h-5" />}
        title="Dados de demonstração gerados"
        description={
          demoResult
            ? `${demoResult.tenantName} (${demoResult.slug}) já está com uma operação fictícia completa.`
            : undefined
        }
      >
        {demoResult && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<DatabaseZap className="w-3.5 h-3.5 text-primary" />}
                title="Registros criados"
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(
                    [
                      ["Usuários", demoResult.counts.usuarios],
                      ["Equipes", demoResult.counts.equipes],
                      ["Catálogos", demoResult.counts.catalogItems],
                      ["Localidades", demoResult.counts.localidades],
                      ["Construtoras", demoResult.counts.construtoras],
                      ["Empreendimentos", demoResult.counts.empreendimentos],
                      ["Leads e clientes", demoResult.counts.leads],
                      ["Triagens", demoResult.counts.triagens],
                      ["Documentações", demoResult.counts.documentacoes],
                      ["Propostas", demoResult.counts.propostas],
                      ["Análises", demoResult.counts.analises],
                      ["Agendamentos", demoResult.counts.agendamentos],
                      ["Metas", demoResult.counts.metas],
                      ["Notificações", demoResult.counts.notificacoes],
                      ["Treinamento", demoResult.counts.treinamentos],
                      ["Financeiro", demoResult.counts.financeiro],
                      ["Proprietários", demoResult.counts.proprietarios ?? 0],
                      ["Imóveis (captação)", demoResult.counts.imoveis ?? 0],
                      ["Captações", demoResult.counts.captacoes ?? 0],
                      [
                        "Interessados (usados)",
                        demoResult.counts.interessadosUsados ?? 0,
                      ],
                      ["Vendas de usados", demoResult.counts.vendasUsados ?? 0],
                    ] as [string, number][]
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border bg-muted/30 px-3 py-2"
                    >
                      <div className="text-lg font-semibold tabular-nums">
                        {value}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </FormSection>

              <FormSection
                icon={<KeyRound className="w-3.5 h-3.5 text-primary" />}
                title="Acessos de demonstração"
              >
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    Senha de todas as contas de demonstração:{" "}
                    <code className="font-semibold">
                      {demoResult.senhaPadrao}
                    </code>
                    {(demoResult.counts.proprietarios ?? 0) > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Portal do proprietário: Lúcia Andrade, Eliane Costa e
                        Marina Freitas entram com o e-mail cadastrado e a mesma
                        senha.
                      </p>
                    ) : null}
                  </div>
                  {demoResult.usuariosExtrasLiberados > 0 && (
                    <p className="text-xs text-muted-foreground">
                      A cota do plano foi ampliada em{" "}
                      {demoResult.usuariosExtrasLiberados} usuário(s) extra(s)
                      para caber a equipe de demonstração. Ajuste em Editar
                      cliente → Plano se quiser voltar ao limite original.
                    </p>
                  )}
                  {demoResult.usuariosCriados.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      As contas de demonstração já existiam e tiveram a senha
                      redefinida para a senha acima.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {demoResult.usuariosCriados.map((u) => (
                        <li
                          key={u.email}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
                        >
                          <span className="min-w-0">
                            <span className="font-medium">{u.name}</span>
                            <code className="ml-2 break-all text-muted-foreground">
                              {u.email}
                            </code>
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {u.role}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button type="button" onClick={() => setDemoResult(null)}>
                Fechar
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteMeta)}
        onOpenChange={(open) => !open && setDeleteMeta(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão Meta?</AlertDialogTitle>
            <AlertDialogDescription>
              A página {deleteMeta?.pageId} deixará de enviar leads para este
              tenant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteMeta()}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteOzap)}
        onOpenChange={(open) => !open && setDeleteOzap(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão OZap?</AlertDialogTitle>
            <AlertDialogDescription>
              A instância {deleteOzap?.instanceId} deixará de enviar leads para
              este tenant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteOzap()}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteOrulo)}
        onOpenChange={(open) => !open && setDeleteOrulo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão Órulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Os empreendimentos já importados permanecem no catálogo. Novas
              atualizações deixam de chegar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteOrulo()}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

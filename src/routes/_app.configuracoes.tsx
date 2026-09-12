import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCatalog } from "@/lib/catalog-store";
import type { CatalogItem, CatalogType } from "@/lib/catalog-api";
import {
  CATALOG_COLORS,
  DEFAULT_CATALOG_COLOR,
  DEFAULT_CCA_COLOR,
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
  catalogColorSwatchStyle,
  isHexColor,
  nextCatalogColor,
  normalizeCatalogColor,
  sameCatalogColor,
} from "@/lib/catalog-colors";
import {
  getVistaParcelas,
  setVistaParcelas,
  type VistaParcelas,
} from "@/lib/financeiro-prefs";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import {
  getHideImoveisFromSidebar,
  getImoveisVista,
  IMOVEIS_CAMPO_GRUPOS,
  IMOVEIS_CAMPOS,
  setHideImoveisFromSidebar,
  setImoveisVista,
  useImoveisCamposVisiveis,
  type ImoveisVista,
} from "@/lib/imoveis-nav-prefs";
import {
  getMetasVista,
  setMetasVista,
  type MetasVista,
} from "@/lib/metas-nav-prefs";
import { ImoveisPage } from "@/components/imoveis-page";
import { LayoutGrid, LayoutList, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfigFunisPanel } from "@/components/config-funis-panel";
import { ConfigAutomacoesPanel } from "@/components/config-automacoes-panel";
import { ConfigModulosOperacaoPanel } from "@/components/config-modulos-operacao-panel";
import { ConfigEmpresaPanel } from "@/components/config-empresa-panel";
import { ConfigCreciPanel } from "@/components/config-creci-panel";
import { ConfigConexoesPanel } from "@/components/config-conexoes-panel";
import { ConfigHideClientesMenuCard } from "@/components/config-hide-clientes-menu-card";
import { ConfigUsuarioExtraPanel } from "@/components/config-usuario-extra-panel";
import { ConfigSettingsLayout } from "@/components/config-settings-layout";
import { userCanInformarCreci } from "@/lib/users-api";
import { CorPicker } from "@/components/cor-picker";
import { CONSTRUTORA_CORES_PRESET } from "@/lib/construtoras-api";
import { updateTenantCompany } from "@/lib/tenant-company-api";
import {
  buildConfigModules,
  defaultConfigSelection,
  parseConfigSearch,
  resolveConfigSelection,
  type ConfigItem,
  type ConfigSearch,
  type ConfigSecao,
} from "@/lib/config-settings-nav";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): ConfigSearch =>
    parseConfigSearch(search),
  component: Config,
});

type ListKind =
  | "origens"
  | "motivos"
  | "tags"
  | "cca"
  | "docFontes"
  | "docStatus1"
  | "docStatus2"
  | "empTipos"
  | "empStatus"
  | "empTags";

const LIST_META: Record<
  ListKind,
  { title: string; singular: string; addLabel: string; type: CatalogType }
> = {
  origens: {
    title: "Origens de leads",
    singular: "origem",
    addLabel: "Adicionar origem",
    type: "origem",
  },
  motivos: {
    title: "Motivos de perda",
    singular: "motivo",
    addLabel: "Adicionar motivo",
    type: "motivo_perda",
  },
  tags: {
    title: "Tags",
    singular: "tag",
    addLabel: "Adicionar tag",
    type: "tag",
  },
  cca: {
    title: "CCAs",
    singular: "CCA",
    addLabel: "Adicionar CCA",
    type: "cca",
  },
  docFontes: {
    title: "Fontes da documentação",
    singular: "fonte",
    addLabel: "Adicionar fonte",
    type: "documentacao_fonte",
  },
  docStatus1: {
    title: "Status 1 (análise)",
    singular: "status 1",
    addLabel: "Adicionar status 1",
    type: "documentacao_status1",
  },
  docStatus2: {
    title: "Status 2 (comercial)",
    singular: "status 2",
    addLabel: "Adicionar status 2",
    type: "documentacao_status2",
  },
  empTipos: {
    title: "Tipos de empreendimento",
    singular: "tipo",
    addLabel: "Adicionar tipo",
    type: "empreendimento_tipo",
  },
  empStatus: {
    title: "Status do empreendimento",
    singular: "status",
    addLabel: "Adicionar status",
    type: "empreendimento_status",
  },
  empTags: {
    title: "Tags do empreendimento",
    singular: "tag",
    addLabel: "Adicionar tag",
    type: "empreendimento_tag",
  },
};

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function ColorSwatchPicker({
  value,
  onChange,
  previewLabel,
}: {
  value: string;
  onChange: (color: string) => void;
  previewLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Cor</Label>
        {previewLabel?.trim() && (
          <Badge
            className={catalogColorBadgeClass(value)}
            style={catalogColorBadgeStyle(value)}
            title={previewLabel.trim()}
          >
            {previewLabel.trim()}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {CATALOG_COLORS.map((color) => {
          const selected = sameCatalogColor(value, color);
          return (
            <button
              key={color}
              type="button"
              title={color}
              aria-label={`Selecionar cor ${color}`}
              aria-pressed={selected}
              onClick={() => onChange(color)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform",
                selected
                  ? "border-foreground scale-110 ring-2 ring-foreground/20"
                  : "border-transparent hover:scale-105",
              )}
              style={catalogColorSwatchStyle(color)}
            />
          );
        })}
      </div>
    </div>
  );
}

function CatalogItemBadge({ item }: { item: CatalogItem }) {
  return (
    <Badge
      className={catalogColorBadgeClass(
        item.color,
        "!h-auto min-h-6 !w-auto max-w-full flex-1 whitespace-normal break-words leading-snug",
      )}
      style={catalogColorBadgeStyle(item.color)}
      title={item.label}
    >
      {item.label}
    </Badge>
  );
}

function CatalogKindCard({
  title,
  loading,
  items,
  onAdd,
  onEdit,
  onRemove,
}: {
  title: string;
  loading: boolean;
  items: CatalogItem[];
  onAdd: () => void;
  onEdit: (item: CatalogItem) => void;
  onRemove: (item: CatalogItem) => void;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={onAdd}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhum item cadastrado.
          </p>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex min-w-0 items-center gap-2 px-2 py-1.5 hover:bg-muted/40"
              >
                <CatalogItemBadge item={item} />
                <div className="ml-auto flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onRemove(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Config() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/configuracoes" });
  const user = getSession();
  const isPlatformAdmin = user?.role === "super_admin";
  const isAnalista = user?.role === "analista";
  const isTreinee = user?.role === "treinee";
  const isCorretor = user?.role === "corretor";
  const showCreci = Boolean(user && userCanInformarCreci(user) && !isPlatformAdmin);
  const isSolo = user?.tenant?.plano === "solo";
  const showOpsTabs = !isAnalista && !isTreinee && !isCorretor && !isPlatformAdmin;
  const showFunil = !isAnalista && !isTreinee && !isCorretor;
  const showUsuarioExtraTab = showOpsTabs && isSolo;
  const showDocumentacao = !isTreinee && !isCorretor && !isPlatformAdmin;
  const showMotivos = !isTreinee && !isCorretor;
  const showCatalogTabs = !isCorretor;
  const showImoveis = Boolean(
    user &&
      !isPlatformAdmin &&
      canAccessRoute(
        user.role,
        "/imoveis",
        user.tenant?.modules ?? null,
        user.tenant?.plano ?? null,
        user.permissions ?? null,
      ),
  );
  const showMetas = Boolean(
    user &&
      !isPlatformAdmin &&
      canAccessRoute(
        user.role,
        "/metas",
        user.tenant?.modules ?? null,
        user.tenant?.plano ?? null,
        user.permissions ?? null,
      ),
  );
  const { catalog, loading, error, addItem, updateItem, removeItem } =
    useCatalog();

  const navFlags = useMemo(
    () => ({
      showCreci,
      showOps: showOpsTabs,
      showFunil,
      showUsuarioExtra: showUsuarioExtraTab,
      showDocumentacao,
      showCatalog: showCatalogTabs,
      showImoveis,
      showMetas,
      isSolo,
    }),
    [
      showCreci,
      showOpsTabs,
      showFunil,
      showUsuarioExtraTab,
      showDocumentacao,
      showCatalogTabs,
      showImoveis,
      showMetas,
      isSolo,
    ],
  );
  const modules = useMemo(() => buildConfigModules(navFlags), [navFlags]);
  const fallbackSelection = useMemo(
    () => defaultConfigSelection(navFlags, modules),
    [navFlags, modules],
  );
  const selection = search.google || search.meta
    ? { secao: "conta" as const, item: "conexoes" as const }
    : resolveConfigSelection(
        search.secao,
        search.item,
        modules,
        fallbackSelection,
      );

  function goTo(secao: ConfigSecao, item: ConfigItem) {
    void navigate({
      to: "/configuracoes",
      search: { secao, item },
      replace: true,
    });
  }

  const [saving, setSaving] = useState(false);
  const [vistaParcelas, setVistaParcelasState] = useState<VistaParcelas>(() =>
    getVistaParcelas(),
  );
  const [hideImoveisFromSidebar, setHideImoveisFromSidebarState] = useState(
    () => getHideImoveisFromSidebar(),
  );
  const [imoveisVista, setImoveisVistaState] = useState<ImoveisVista>(() =>
    getImoveisVista(),
  );
  const imoveisCampos = useImoveisCamposVisiveis();
  const [metasVista, setMetasVistaState] = useState<MetasVista>(() =>
    getMetasVista(),
  );

  const [listOpen, setListOpen] = useState(false);
  const [listKind, setListKind] = useState<ListKind>("origens");
  const [listValue, setListValue] = useState("");
  const [listColor, setListColor] = useState<string>(DEFAULT_CATALOG_COLOR);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState<string>(DEFAULT_CATALOG_COLOR);

  function openAddList(kind: ListKind) {
    const count = catalog[LIST_META[kind].type].length;
    setListKind(kind);
    setListValue("");
    setListColor(
      kind === "cca"
        ? CONSTRUTORA_CORES_PRESET[count % CONSTRUTORA_CORES_PRESET.length]
        : nextCatalogColor(count),
    );
    setListOpen(true);
  }

  function openEditItem(item: CatalogItem) {
    setEditItem(item);
    setEditLabel(item.label);
    setEditColor(
      item.type === "cca"
        ? isHexColor(item.color)
          ? item.color!
          : DEFAULT_CCA_COLOR
        : normalizeCatalogColor(item.color),
    );
    setEditOpen(true);
  }

  async function handleAddListItem(e: React.FormEvent) {
    e.preventDefault();
    const value = listValue.trim();
    const meta = LIST_META[listKind];
    if (!value) {
      toast.error(
        listKind === "cca" ? "Informe o CCA." : `Informe a ${meta.singular}.`,
      );
      return;
    }
    if (listKind === "cca" && !isHexColor(listColor)) {
      toast.error("Informe a cor hexadecimal do CCA (#RRGGBB).");
      return;
    }
    setSaving(true);
    try {
      await addItem({ type: meta.type, label: value, color: listColor });
      setListOpen(false);
      setListValue("");
      toast.success(
        `${meta.singular[0].toUpperCase()}${meta.singular.slice(1)} "${value}" adicionada.`,
      );
    } catch (err) {
      toast.error(
        errorMessage(err, `Não foi possível adicionar a ${meta.singular}.`),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    const label = editLabel.trim();
    if (!label) {
      toast.error("Informe um nome.");
      return;
    }
    if (editItem.type === "cca" && !isHexColor(editColor)) {
      toast.error("Informe a cor hexadecimal do CCA (#RRGGBB).");
      return;
    }
    const colorChanged =
      editColor !== (editItem.color ?? DEFAULT_CATALOG_COLOR);
    const labelChanged = label !== editItem.label;
    if (!labelChanged && !colorChanged) {
      setEditOpen(false);
      return;
    }
    setSaving(true);
    try {
      await updateItem(editItem.id, {
        ...(labelChanged ? { label } : {}),
        ...(colorChanged ? { color: editColor } : {}),
      });
      setEditOpen(false);
      setEditItem(null);
      const isDocStatus =
        editItem.type === "documentacao_status1" ||
        editItem.type === "documentacao_status2" ||
        editItem.type === "documentacao_fonte";
      toast.success(
        isDocStatus && labelChanged
          ? "Status atualizado nas configurações e nas documentações."
          : "Item atualizado.",
      );
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível atualizar o item."));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (search.google) {
      if (search.google === "connected") {
        toast.success(
          "Google Agenda conectada. Novos compromissos vão para o Calendar.",
        );
      } else if (search.google === "denied") {
        toast.error("Conexão com o Google cancelada.");
      } else {
        toast.error("Não foi possível conectar o Google Agenda.");
      }
      void navigate({
        to: "/configuracoes",
        search: { secao: "conta", item: "conexoes" },
        replace: true,
      });
      return;
    }
    if (search.meta === "denied") {
      toast.error("Conexão com o Facebook cancelada.");
      void navigate({
        to: "/configuracoes",
        search: { secao: "conta", item: "conexoes" },
        replace: true,
      });
      return;
    }
    if (search.meta === "error") {
      toast.error("Não foi possível conectar o Facebook.");
      void navigate({
        to: "/configuracoes",
        search: { secao: "conta", item: "conexoes" },
        replace: true,
      });
      return;
    }
    if (search.meta === "select") {
      return;
    }
    if (search.code || search.orulo === "callback") {
      if (search.secao !== "conta" || search.item !== "conexoes") {
        void navigate({
          to: "/configuracoes",
          search: {
            secao: "conta",
            item: "conexoes",
            orulo: "callback",
            code: search.code,
          },
          replace: true,
        });
      }
      return;
    }
    if (search.secao !== selection.secao || search.item !== selection.item) {
      void navigate({
        to: "/configuracoes",
        search: { secao: selection.secao, item: selection.item },
        replace: true,
      });
    }
  }, [search.google, search.meta, search.orulo, search.code, search.secao, search.item, selection.secao, selection.item, navigate]);

  async function handleRemoveItem(item: CatalogItem) {
    try {
      await removeItem(item.id);
      toast.success(`"${item.label}" desativado.`);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível desativar o item."));
    }
  }

  const listItemsByKind: Record<ListKind, CatalogItem[]> = {
    origens: catalog.origem,
    motivos: catalog.motivo_perda,
    tags: catalog.tag,
    cca: catalog.cca,
    docFontes: catalog.documentacao_fonte,
    docStatus1: catalog.documentacao_status1,
    docStatus2: catalog.documentacao_status2,
    empTipos: catalog.empreendimento_tipo,
    empStatus: catalog.empreendimento_status,
    empTags: catalog.empreendimento_tag,
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Conta, operação, automações e catálogos agrupados por módulo."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ConfigSettingsLayout
        modules={modules}
        selection={selection}
        onChange={goTo}
      >
        {selection.item === "creci" ? (
          <ConfigCreciPanel
            solo={isSolo}
            onSaved={
              isSolo
                ? async (updated) => {
                    try {
                      await updateTenantCompany({
                        creci: updated.creci?.trim() ?? "",
                      });
                    } catch {
                      // Cadastro pessoal já salvou; contrato pode sincronizar depois.
                    }
                  }
                : undefined
            }
          />
        ) : null}

        {selection.item === "conexoes" ? (
          <div className="space-y-4">
            {!isSolo && !isPlatformAdmin && !showOpsTabs ? (
              <ConfigHideClientesMenuCard />
            ) : null}
            <ConfigConexoesPanel
              selectingMeta={search.meta === "select"}
              oruloCallbackCode={
                search.orulo === "callback" || search.code
                  ? search.code
                  : undefined
              }
            />
          </div>
        ) : null}

        {selection.item === "empresa" ? <ConfigEmpresaPanel /> : null}

        {selection.item === "funil" ? <ConfigFunisPanel /> : null}

        {selection.item === "automacoes" ? <ConfigAutomacoesPanel /> : null}

        {selection.item === "modulos" ? <ConfigModulosOperacaoPanel /> : null}

        {selection.item === "usuario-extra" ? (
          <ConfigUsuarioExtraPanel />
        ) : null}

        {selection.item === "financeiro" ? (
          <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Visualização de parcelas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Define como Contas a pagar e Contas a receber exibem títulos
                    parcelados.
                  </p>
                  <RadioGroup
                    value={vistaParcelas}
                    onValueChange={(v) => {
                      const next = v as VistaParcelas;
                      setVistaParcelasState(next);
                      setVistaParcelas(next);
                      toast.success(
                        next === "agrupado"
                          ? "Vista agrupada ativada."
                          : "Lista completa ativada.",
                      );
                    }}
                    className="space-y-3"
                  >
                    <label
                      htmlFor="vista-agrupado"
                      className="flex items-start gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40"
                    >
                      <RadioGroupItem
                        id="vista-agrupado"
                        value="agrupado"
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">Conta agrupada</p>
                        <p className="text-xs text-muted-foreground">
                          Uma linha por contrato; use a seta para expandir as
                          parcelas e pagar cada uma.
                        </p>
                      </div>
                    </label>
                    <label
                      htmlFor="vista-lista"
                      className="flex items-start gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40"
                    >
                      <RadioGroupItem
                        id="vista-lista"
                        value="lista"
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">Lista completa</p>
                        <p className="text-xs text-muted-foreground">
                          Exibe todas as parcelas como linhas separadas na
                          tabela.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>
        ) : null}

        {selection.item === "imoveis" ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Catálogo do cadastro, aparência da lista e empreendimentos.
              Admin, gerente, analista e treinee podem criar, editar e excluir
              tipos, status e tags.
            </p>

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Catálogo</h2>
                <p className="text-xs text-muted-foreground">
                  Opções usadas no formulário de imóveis.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    ["empTipos", "Tipos"],
                    ["empStatus", "Status"],
                    ["empTags", "Tags"],
                  ] as const
                ).map(([kind, title]) => (
                  <CatalogKindCard
                    key={kind}
                    title={title}
                    loading={loading}
                    items={listItemsByKind[kind]}
                    onAdd={() => openAddList(kind)}
                    onEdit={openEditItem}
                    onRemove={(item) => void handleRemoveItem(item)}
                  />
                ))}
              </div>
            </section>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lista de imóveis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Vista padrão, campos na lista e visibilidade no menu.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-3">
                    <p className="mb-2 text-sm font-medium">
                      Visualização padrão
                    </p>
                    <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3",
                          imoveisVista === "cards" && "bg-background shadow-sm",
                        )}
                        onClick={() => {
                          setImoveisVistaState("cards");
                          setImoveisVista("cards");
                          toast.success("Imóveis abrem em cards.");
                        }}
                      >
                        <LayoutGrid className="mr-1.5 h-4 w-4" />
                        Cards
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3",
                          imoveisVista === "tabela" &&
                            "bg-background shadow-sm",
                        )}
                        onClick={() => {
                          setImoveisVistaState("tabela");
                          setImoveisVista("tabela");
                          toast.success("Imóveis abrem em tabela.");
                        }}
                      >
                        <LayoutList className="mr-1.5 h-4 w-4" />
                        Tabela
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-medium">Ocultar do menu</p>
                      <p className="text-xs text-muted-foreground">
                        Some do menu e fica só em Configurações.
                      </p>
                    </div>
                    <Switch
                      checked={hideImoveisFromSidebar}
                      onCheckedChange={(checked) => {
                        setHideImoveisFromSidebarState(checked);
                        setHideImoveisFromSidebar(checked);
                        toast.success(
                          checked
                            ? "Imóveis oculto do menu. Use Configurações → Catálogos → Imóveis."
                            : "Imóveis voltou a aparecer no menu e em Configurações.",
                        );
                      }}
                      aria-label="Ocultar Imóveis do menu lateral"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Campos visíveis</p>
                    <p className="text-xs text-muted-foreground">
                      O que aparece nos cards e na tabela.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {IMOVEIS_CAMPO_GRUPOS.map((grupo) => (
                      <div
                        key={grupo.id}
                        className="rounded-xl border bg-muted/20 p-3"
                      >
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {grupo.label}
                        </p>
                        <div className="space-y-2">
                          {IMOVEIS_CAMPOS.filter(
                            (campo) => campo.grupo === grupo.id,
                          ).map((campo) => {
                            const visivel = imoveisCampos.show(campo.id);
                            const switchId = `imovel-campo-${campo.id}`;
                            return (
                              <label
                                key={campo.id}
                                htmlFor={switchId}
                                className="flex cursor-pointer items-center justify-between gap-3"
                              >
                                <span className="text-sm">{campo.label}</span>
                                <Switch
                                  id={switchId}
                                  checked={visivel}
                                  onCheckedChange={(checked) =>
                                    imoveisCampos.setVisible(campo.id, checked)
                                  }
                                  aria-label={`Exibir ${campo.label.toLocaleLowerCase("pt-BR")}`}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-3 border-t pt-6">
              <ImoveisPage embedded />
            </section>
          </div>
        ) : null}

        {selection.item === "metas" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visualização padrão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Define como a lista de metas abre: em cards ou em tabela.
                </p>
                <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 px-4",
                      metasVista === "cards" && "bg-background shadow-sm",
                    )}
                    onClick={() => {
                      setMetasVistaState("cards");
                      setMetasVista("cards");
                      toast.success("Metas abrem em cards.");
                    }}
                  >
                    <LayoutGrid className="mr-1.5 h-4 w-4" />
                    Cards
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 px-4",
                      metasVista === "tabela" && "bg-background shadow-sm",
                    )}
                    onClick={() => {
                      setMetasVistaState("tabela");
                      setMetasVista("tabela");
                      toast.success("Metas abrem em tabela.");
                    }}
                  >
                    <LayoutList className="mr-1.5 h-4 w-4" />
                    Tabela
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {selection.item === "documentacao" ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Opções usadas no formulário rápido do analista e na tela
              Documentação. Crie fontes e status para seleção rápida.
            </p>

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Catálogo</h2>
                <p className="text-xs text-muted-foreground">
                  Fontes e status para seleção rápida.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    ["docFontes", "Fontes"],
                    ["docStatus1", "Status 1"],
                    ["docStatus2", "Status 2"],
                  ] as const
                ).map(([kind, title]) => (
                  <CatalogKindCard
                    key={kind}
                    title={title}
                    loading={loading}
                    items={listItemsByKind[kind]}
                    onAdd={() => openAddList(kind)}
                    onEdit={openEditItem}
                    onRemove={(item) => void handleRemoveItem(item)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Status 1 é da análise; Status 2 é do comercial.
              </p>
            </section>
          </div>
        ) : null}

        {selection.item === "listas" ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Origens, tags
              {isPlatformAdmin ? "" : ", CCAs"}
              {showMotivos ? " e motivos de perda" : ""} usados no cadastro de
              leads.
            </p>
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Catálogo</h2>
                <p className="text-xs text-muted-foreground">
                  Opções do formulário de leads.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17.5rem),1fr))]">
                {(
                  [
                    ["origens", "Origens"],
                    ...(showMotivos
                      ? ([["motivos", "Motivos"]] as const)
                      : []),
                    ["tags", "Tags"],
                    ...(!isPlatformAdmin ? ([["cca", "CCA"]] as const) : []),
                  ] as const
                ).map(([kind, title]) => (
                  <CatalogKindCard
                    key={kind}
                    title={title}
                    loading={loading}
                    items={listItemsByKind[kind]}
                    onAdd={() => openAddList(kind)}
                    onEdit={openEditItem}
                    onRemove={(item) => void handleRemoveItem(item)}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </ConfigSettingsLayout>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{LIST_META[listKind].addLabel}</DialogTitle>
            <DialogDescription>
              Cadastre uma nova {LIST_META[listKind].singular} para uso no CRM.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddListItem} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="list-value">Nome</Label>
              <Input
                id="list-value"
                value={listValue}
                onChange={(e) => setListValue(e.target.value)}
                placeholder={`Ex.: Nova ${LIST_META[listKind].singular}`}
                autoFocus
              />
            </div>
            {listKind === "cca" ? (
              <CorPicker
                id="list-cca-cor"
                label="Cor hexadecimal"
                value={listColor}
                onChange={setListColor}
                previewLabel={listValue || "Prévia"}
              />
            ) : (
              <ColorSwatchPicker
                value={listColor}
                onChange={setListColor}
                previewLabel={listValue || "Prévia"}
              />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setListOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
            <DialogDescription>
              Altere o nome e a cor exibidos no CRM.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-label">Nome</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                autoFocus
              />
            </div>
            {editItem?.type === "cca" ? (
              <CorPicker
                id="edit-cca-cor"
                label="Cor hexadecimal"
                value={editColor}
                onChange={setEditColor}
                previewLabel={editLabel || "Prévia"}
              />
            ) : (
              <ColorSwatchPicker
                value={editColor}
                onChange={setEditColor}
                previewLabel={editLabel || "Prévia"}
              />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

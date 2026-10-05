import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import {
  MetaDeleteDialog,
  MetasGestorBoard,
  MetasPorOrigem,
  MetasResumo,
  MetaTipoPicker,
} from "@/components/metas-board";
import { getSession } from "@/lib/auth";
import { isCorretorLike } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { fetchUsers, type ApiUser } from "@/lib/users-api";
import { fetchLeadAssignees, type LeadAssignee } from "@/lib/leads-api";
import {
  META_ESCOPO_LABEL,
  META_PERIODOS,
  META_PERIODO_LABEL,
  META_TIPOS,
  META_TIPO_LABEL,
  createMeta,
  deleteMeta,
  fetchMetas,
  metaTitulo,
  updateMeta,
  type Meta,
  type MetaEscopo,
  type MetaPeriodo,
  type MetaTipo,
} from "@/lib/metas-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { cn } from "@/lib/utils";
import { SOFT_BTN } from "@/lib/soft-btn";
import {
  FILTER_BAR_SURFACE,
  FILTER_CONTROL,
  FILTER_VISTA_BTN,
  FILTER_VISTA_BTN_ACTIVE,
  FILTER_VISTA_WRAP,
} from "@/lib/filter-bar";
import { useMetasVista } from "@/lib/metas-nav-prefs";
import {
  CalendarDays,
  LayoutGrid,
  LayoutList,
  Loader2,
  Plus,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: "Metas — Zone Connection" }] }),
  component: Page,
});

type MetasTab =
  | "todas"
  | "imobiliaria"
  | "gerente"
  | "corretor"
  | "atribuidas"
  | "pessoais";

function Page() {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const isPlatformAdmin = user?.role === "super_admin";
  const isGerente = user?.role === "gerente";
  const isSolo = user?.tenant?.plano === "solo";
  const [metas, setMetas] = useState<Meta[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [usuarios, setUsuarios] = useState<ApiUser[]>([]);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Meta | null>(null);
  const [removing, setRemoving] = useState<Meta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    escopo: "corretor" as MetaEscopo,
    corretorId: "",
    gerenteId: "",
    titulo: "",
    tipo: "vendas" as MetaTipo,
    periodo: "mensal" as MetaPeriodo,
    valor: "",
  });
  const [tab, setTab] = useState<MetasTab>("todas");
  const [filterTipo, setFilterTipo] = useState("__all__");
  const [filterPeriodo, setFilterPeriodo] = useState("__all__");
  const [filterCiclo, setFilterCiclo] = useState("atual");
  const [vista, setVista] = useMetasVista();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itens, equipesAtuais, usuariosAtuais, assigneesAtuais] =
        await Promise.all([
          fetchMetas(),
          !isSolo && (isAdmin || isGerente)
            ? fetchEquipes()
            : Promise.resolve([]),
          !isSolo && (isAdmin || isGerente)
            ? fetchUsers({ status: "ativo", page: 1, limit: 100 })
                .then((res) => res.data)
                .catch(() => [] as ApiUser[])
            : Promise.resolve([]),
          !isSolo && (isAdmin || isGerente)
            ? fetchLeadAssignees().catch(() => [] as LeadAssignee[])
            : Promise.resolve([]),
        ]);
      setMetas(itens);
      setEquipes(equipesAtuais);
      setUsuarios(usuariosAtuais);
      setAssignees(assigneesAtuais);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível carregar as metas.",
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isGerente, isSolo]);

  useEffect(() => {
    void load();
  }, [load]);

  const corretores = useMemo(() => {
    const equipeNomeByUserId = new Map<string, string>();
    for (const equipe of equipes) {
      for (const membro of equipe.membros) {
        equipeNomeByUserId.set(membro.id, equipe.name);
      }
    }

    const map = new Map<
      string,
      { id: string; name: string; equipeNome: string }
    >();

    for (const usuario of usuarios) {
      if (!isCorretorLike(usuario.role)) continue;
      map.set(usuario.id, {
        id: usuario.id,
        name: usuario.name,
        equipeNome: equipeNomeByUserId.get(usuario.id) ?? "Sem equipe",
      });
    }

    for (const assignee of assignees) {
      if (assignee.role && !isCorretorLike(assignee.role)) continue;
      if (map.has(assignee.id)) continue;
      map.set(assignee.id, {
        id: assignee.id,
        name: assignee.name,
        equipeNome:
          equipeNomeByUserId.get(assignee.id) ??
          (assignee.gerente?.name
            ? `Equipe de ${assignee.gerente.name}`
            : "Sem equipe"),
      });
    }

    for (const equipe of equipes) {
      if (isGerente && equipe.gerenteId !== user?.id) continue;
      for (const membro of equipe.membros) {
        if (!isCorretorLike(membro.role) || membro.status === "inativo") {
          continue;
        }
        if (map.has(membro.id)) continue;
        map.set(membro.id, {
          id: membro.id,
          name: membro.name,
          equipeNome: equipe.name,
        });
      }
    }

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [assignees, equipes, isGerente, user?.id, usuarios]);

  const gerentes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; equipeNome: string }>();
    for (const equipe of equipes) {
      map.set(equipe.gerente.id, {
        id: equipe.gerente.id,
        name: equipe.gerente.name,
        equipeNome: equipe.name,
      });
    }
    for (const usuario of usuarios) {
      if (usuario.role !== "gerente") continue;
      if (map.has(usuario.id)) continue;
      map.set(usuario.id, {
        id: usuario.id,
        name: usuario.name,
        equipeNome: "Sem equipe",
      });
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [equipes, usuarios]);

  const isGestor = isAdmin || isGerente || isPlatformAdmin;
  const empresaLabel = isPlatformAdmin ? "Empresa" : "Imobiliária";
  const tiposMeta = isPlatformAdmin
    ? META_TIPOS.filter((tipo) => tipo !== "documentacoes")
    : META_TIPOS;

  const filteredMetas = useMemo(() => {
    return metas.filter((meta) => {
      if (filterTipo !== "__all__" && meta.tipo !== filterTipo) return false;
      if (filterPeriodo !== "__all__" && meta.periodo !== filterPeriodo) {
        return false;
      }
      const ciclo = meta.ciclo ?? "atual";
      if (filterCiclo === "atual" && ciclo !== "atual") return false;
      if (filterCiclo === "anterior" && ciclo !== "anterior") return false;
      if (filterCiclo === "comparar" && ciclo !== "atual") return false;
      if (!isGestor) {
        if (tab === "atribuidas") return meta.origem !== "pessoal";
        if (tab === "pessoais") return meta.origem === "pessoal";
        return true;
      }
      if (tab === "imobiliaria") return meta.escopo === "imobiliaria";
      if (tab === "gerente") return meta.escopo === "gerente";
      if (tab === "corretor") return meta.escopo === "corretor";
      return true;
    });
  }, [filterCiclo, filterPeriodo, filterTipo, isGestor, metas, tab]);

  const filteredImobiliaria = useMemo(
    () => filteredMetas.filter((meta) => meta.escopo === "imobiliaria"),
    [filteredMetas],
  );
  const filteredGerentes = useMemo(
    () => filteredMetas.filter((meta) => meta.escopo === "gerente"),
    [filteredMetas],
  );
  const filteredGruposGerentes = useMemo(() => {
    const byId = new Map<string, Meta[]>();
    for (const meta of filteredGerentes) {
      const key = meta.gerenteId ?? "sem-gerente";
      const list = byId.get(key) ?? [];
      list.push(meta);
      byId.set(key, list);
    }
    if (tab === "gerente" && byId.size === 0) {
      return gerentes.map((gerente) => ({
        id: gerente.id,
        name: gerente.name,
        subtitle: gerente.equipeNome,
        metas: [] as Meta[],
      }));
    }
    return [...byId.entries()].map(([id, metasDoGerente]) => {
      const fromMeta = metasDoGerente[0]?.gerente;
      const fromEquipe = gerentes.find((g) => g.id === id);
      return {
        id,
        name: fromMeta?.name ?? fromEquipe?.name ?? "Gerente",
        subtitle:
          fromMeta?.equipeGerenciada?.name ?? fromEquipe?.equipeNome ?? null,
        metas: metasDoGerente,
      };
    });
  }, [filteredGerentes, gerentes, tab]);
  const filteredGruposCorretores = useMemo(() => {
    if (!isGestor) return [];
    const metasPorCorretor = new Map<string, Meta[]>();
    filteredMetas
      .filter((meta) => meta.escopo === "corretor" && meta.corretorId)
      .forEach((meta) => {
        const itens = metasPorCorretor.get(meta.corretorId!) ?? [];
        itens.push(meta);
        metasPorCorretor.set(meta.corretorId!, itens);
      });
    return corretores
      .map((corretor) => {
        const metasDoCorretor = metasPorCorretor.get(corretor.id) ?? [];
        if (tab !== "corretor" && metasDoCorretor.length === 0) return null;
        return {
          corretor: metasDoCorretor[0]?.corretor ?? {
            id: corretor.id,
            name: corretor.name,
            equipeId: null,
            equipe: { id: "equipe", name: corretor.equipeNome },
          },
          metas: metasDoCorretor,
        };
      })
      .filter(Boolean) as Array<{
      corretor: NonNullable<Meta["corretor"]>;
      metas: Meta[];
    }>;
  }, [corretores, filteredMetas, isGestor, tab]);

  function openCreate() {
    setEditing(null);
    setForm({
      escopo:
        isSolo || isPlatformAdmin || isAdmin ? "imobiliaria" : "corretor",
      corretorId: "",
      gerenteId: "",
      titulo: "",
      tipo: "vendas",
      periodo: "mensal",
      valor: "",
    });
    setOpen(true);
  }

  function openEdit(meta: Meta) {
    setEditing(meta);
    setForm({
      escopo: meta.escopo,
      corretorId: meta.corretorId ?? "",
      gerenteId: meta.gerenteId ?? "",
      titulo: meta.titulo?.trim() || META_TIPO_LABEL[meta.tipo],
      tipo: meta.tipo,
      periodo: meta.periodo,
      valor:
        meta.tipo === "vgv"
          ? formatMoneyInput(meta.valor)
          : String(meta.valor),
    });
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const titulo = form.titulo.trim();
    if (titulo.length < 2) {
      toast.error("Informe um título para a meta.");
      return;
    }
    const valor =
      form.tipo === "vgv"
        ? parseOptionalMoneyInput(form.valor)
        : Number(form.valor.replace(/\D/g, ""));
    if (valor == null || !Number.isFinite(valor) || valor < 1) {
      toast.error(
        form.tipo === "vgv"
          ? "Informe um valor de meta maior que zero."
          : "Informe uma meta inteira maior que zero.",
      );
      return;
    }
    if (form.tipo !== "vgv" && !Number.isInteger(valor)) {
      toast.error("Informe uma meta inteira maior que zero.");
      return;
    }
    if (!editing) {
      if (
        !isSolo &&
        (isGerente || (isAdmin && form.escopo === "corretor")) &&
        !form.corretorId
      ) {
        toast.error("Selecione o corretor que receberá a meta.");
        return;
      }
      if (!isSolo && isAdmin && form.escopo === "gerente" && !form.gerenteId) {
        toast.error("Selecione o gerente que receberá a meta.");
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        await updateMeta(editing.id, {
          valor,
          titulo,
          tipo: form.tipo,
          periodo: form.periodo,
        });
        toast.success("Meta atualizada.");
      } else {
        await createMeta({
          ...(isAdmin && !isSolo && !isPlatformAdmin
            ? { escopo: form.escopo }
            : {}),
          ...(isSolo || isPlatformAdmin
            ? { escopo: "imobiliaria" as const }
            : {}),
          ...(!isSolo &&
          form.escopo === "corretor" &&
          (isAdmin || isGerente)
            ? { corretorId: form.corretorId }
            : {}),
          ...(!isSolo && isAdmin && form.escopo === "gerente"
            ? { gerenteId: form.gerenteId }
            : {}),
          tipo: form.tipo,
          periodo: form.periodo,
          titulo,
          valor,
        });
        toast.success("Meta salva.");
      }
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar a meta.",
      );
    } finally {
      setSaving(false);
    }
  }

  function remove(meta: Meta) {
    setRemoving(meta);
  }

  async function confirmRemove() {
    if (!removing || deleting) return;
    setDeleting(true);
    try {
      await deleteMeta(removing.id);
      toast.success("Meta apagada.");
      setRemoving(null);
      await load();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível apagar a meta.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const canCreate =
    isCorretorLike(user?.role) || isGerente || isAdmin || isPlatformAdmin;

  const canEditMeta = (meta: Meta) => {
    if (isPlatformAdmin)
      return meta.origem === "admin" && meta.escopo === "imobiliaria";
    if (isAdmin) return meta.origem === "admin";
    if (isGerente)
      return (
        meta.origem === "gerente" &&
        meta.escopo === "corretor" &&
        meta.criadorId === user?.id
      );
    return meta.origem === "pessoal" && meta.escopo === "corretor";
  };

  const gestorTabs: Array<{ id: MetasTab; label: string }> = isPlatformAdmin
    ? [{ id: "imobiliaria" as const, label: empresaLabel }]
    : [
        { id: "todas", label: "Todas" },
        ...(isAdmin && !isSolo
          ? [{ id: "imobiliaria" as const, label: "Imobiliária" }]
          : []),
        ...(!isSolo
          ? [
              { id: "gerente" as const, label: "Gerentes" },
              { id: "corretor" as const, label: "Corretores" },
            ]
          : []),
      ];
  const corretorTabs: Array<{ id: MetasTab; label: string }> = [
    { id: "todas", label: "Todas" },
    { id: "atribuidas", label: "Atribuídas" },
    { id: "pessoais", label: "Pessoais" },
  ];
  const tabs = isSolo || isPlatformAdmin ? [] : isGestor ? gestorTabs : corretorTabs;
  const showImobiliaria =
    !isSolo &&
    isGestor &&
    (tab === "imobiliaria" ||
      (tab === "todas" && filteredImobiliaria.length > 0));
  const showGerentes =
    !isSolo &&
    !isPlatformAdmin &&
    isGestor &&
    (tab === "gerente" ||
      (tab === "todas" && filteredGruposGerentes.length > 0));
  const showCorretores =
    !isSolo &&
    !isPlatformAdmin &&
    isGestor &&
    (tab === "corretor" ||
      (tab === "todas" && filteredGruposCorretores.length > 0));

  return (
    <div>
      <PageHeader
        title="Metas"
        description={
          isSolo
            ? "Defina tipo, valor e período das suas metas."
            : isPlatformAdmin
              ? "Defina e acompanhe as metas da empresa."
            : isAdmin
              ? "Defina metas da imobiliária, por gerente ou por corretor."
              : isGerente
                ? "Defina e acompanhe as metas da sua equipe."
                : "Acompanhe suas metas pessoais e as definidas pela gerência."
        }
        actions={
          canCreate ? (
            <Button
              className="rounded-full shadow-md shadow-primary/20"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4 mr-1" />
              {isSolo || isPlatformAdmin
                ? "Nova meta"
                : isAdmin
                  ? "Nova meta"
                  : isGerente
                    ? "Definir meta"
                    : "Minha meta"}
            </Button>
          ) : undefined
        }
      />

      {tabs.length > 0 ? (
      <div className="mb-4 inline-flex rounded-full border bg-muted/40 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando metas...
        </div>
      ) : (
        <>
          <div
            className={cn(
              "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
              FILTER_BAR_SURFACE,
            )}
          >
            <MetasResumo
              metas={filteredMetas}
              comparar={filterCiclo === "comparar"}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className={FILTER_VISTA_WRAP}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    FILTER_VISTA_BTN,
                    vista === "cards" && FILTER_VISTA_BTN_ACTIVE,
                  )}
                  title="Ver cards"
                  onClick={() => setVista("cards")}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="ml-1.5">Cards</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    FILTER_VISTA_BTN,
                    vista === "tabela" && FILTER_VISTA_BTN_ACTIVE,
                  )}
                  title="Ver tabela"
                  onClick={() => setVista("tabela")}
                >
                  <LayoutList className="h-4 w-4" />
                  <span className="ml-1.5">Tabela</span>
                </Button>
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className={cn("h-9 w-[10.5rem]", FILTER_CONTROL)}>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os tipos</SelectItem>
                  {tiposMeta.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {META_TIPO_LABEL[tipo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                <SelectTrigger className={cn("h-9 w-[10.5rem]", FILTER_CONTROL)}>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os períodos</SelectItem>
                  {META_PERIODOS.map((periodo) => (
                    <SelectItem key={periodo} value={periodo}>
                      {META_PERIODO_LABEL[periodo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                <SelectTrigger className={cn("h-9 w-[13.5rem]", FILTER_CONTROL)}>
                  <SelectValue placeholder="Ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atual">Período atual</SelectItem>
                  <SelectItem value="anterior">Período anterior</SelectItem>
                  <SelectItem value="comparar">
                    Comparar com o atual
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isSolo || isPlatformAdmin ? (
            <MetasPorOrigem
              metas={filteredMetas}
              vista={vista}
              flat
              headingTitle={isPlatformAdmin ? "Metas da empresa" : undefined}
              canEdit={canEditMeta}
              onEdit={openEdit}
              onRemove={remove}
            />
          ) : !isGestor ? (
            <MetasPorOrigem
              metas={filteredMetas.filter((meta) => meta.escopo === "corretor")}
              vista={vista}
              canEdit={canEditMeta}
              onEdit={openEdit}
              onRemove={remove}
            />
          ) : (
            <MetasGestorBoard
              isAdmin={isAdmin}
              vista={vista}
              filteredMetas={filteredMetas}
              filteredImobiliaria={filteredImobiliaria}
              filteredGruposGerentes={filteredGruposGerentes}
              filteredGruposCorretores={filteredGruposCorretores}
              showImobiliaria={showImobiliaria}
              showGerentes={showGerentes}
              showCorretores={showCorretores}
              canEdit={canEditMeta}
              onEdit={openEdit}
              onRemove={remove}
            />
          )}
        </>
      )}

      <MetaDeleteDialog
        meta={removing}
        deleting={deleting}
        onOpenChange={(openDelete) => {
          if (!openDelete && !deleting) setRemoving(null);
        }}
        onConfirm={() => void confirmRemove()}
      />

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<Target className="w-5 h-5" />}
        title={editing ? "Editar meta" : "Nova meta"}
        description={
          editing
            ? isSolo
              ? "Ajuste o título, o tipo, o período e o valor."
              : "Ajuste o título, o tipo, o período e o valor. O responsável não muda."
            : isSolo || isPlatformAdmin
              ? "Dê um nome à meta e defina o tipo, o período e o valor."
              : isAdmin
                ? "Dê um nome à meta e defina o responsável, o tipo e o período."
                : isGerente
                  ? "Dê um nome à meta. Ela será atribuída ao corretor selecionado."
                  : "Dê um nome à meta pessoal para acompanhar o período."
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="metas-form" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar meta"
              )}
            </Button>
          </FormDialogActions>
        }
      >
        <form
          id="metas-form"
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <FormDialogBody>
            <FormSection
              title="Título"
              icon={<Target className="w-4 h-4 text-primary" />}
            >
              <div className="space-y-2">
                <Label htmlFor="meta-titulo">Nome da meta</Label>
                <Input
                  id="meta-titulo"
                  value={form.titulo}
                  maxLength={80}
                  placeholder="Ex.: Vendas de outubro"
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      titulo: event.target.value,
                    }))
                  }
                />
              </div>
            </FormSection>
            {isAdmin && !isSolo && !editing ? (
              <FormSection
                title="Responsável"
                icon={<Users className="w-4 h-4 text-primary" />}
              >
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Escopo</Label>
                    <Select
                      value={form.escopo}
                      onValueChange={(escopo: MetaEscopo) =>
                        setForm((atual) => ({
                          ...atual,
                          escopo,
                          corretorId: "",
                          gerenteId: "",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="imobiliaria">
                          {META_ESCOPO_LABEL.imobiliaria}
                        </SelectItem>
                        <SelectItem value="gerente">
                          {META_ESCOPO_LABEL.gerente}
                        </SelectItem>
                        <SelectItem value="corretor">
                          {META_ESCOPO_LABEL.corretor}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.escopo === "gerente" ? (
                    <div className="space-y-2">
                      <Label>Gerente</Label>
                      <Select
                        value={form.gerenteId || undefined}
                        onValueChange={(gerenteId) =>
                          setForm((atual) => ({ ...atual, gerenteId }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {gerentes.map((gerente) => (
                            <SelectItem key={gerente.id} value={gerente.id}>
                              {gerente.name} · {gerente.equipeNome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  {form.escopo === "corretor" ? (
                    <div className="space-y-2">
                      <Label>Corretor</Label>
                      <Select
                        value={form.corretorId || undefined}
                        onValueChange={(corretorId) =>
                          setForm((atual) => ({ ...atual, corretorId }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {corretores.map((corretor) => (
                            <SelectItem key={corretor.id} value={corretor.id}>
                              {corretor.name} · {corretor.equipeNome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </FormSection>
            ) : null}

            {isGerente && !editing ? (
              <FormSection
                title="Corretor"
                icon={<UserRound className="w-4 h-4 text-primary" />}
              >
                <Select
                  value={form.corretorId || undefined}
                  onValueChange={(corretorId) =>
                    setForm((atual) => ({ ...atual, corretorId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o corretor" />
                  </SelectTrigger>
                  <SelectContent>
                    {corretores.map((corretor) => (
                      <SelectItem key={corretor.id} value={corretor.id}>
                        {corretor.name} · {corretor.equipeNome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormSection>
            ) : null}

            <FormSection
              title="Tipo e período"
              icon={<CalendarDays className="w-4 h-4 text-primary" />}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                    <MetaTipoPicker
                    value={form.tipo}
                    tipos={tiposMeta}
                    onChange={(tipo) =>
                      setForm((atual) => ({
                        ...atual,
                        tipo,
                        valor:
                          tipo === "vgv"
                            ? maskMoneyInput(atual.valor.replace(/\D/g, ""))
                            : atual.valor.replace(/\D/g, ""),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select
                    value={form.periodo}
                    onValueChange={(periodo: MetaPeriodo) =>
                      setForm((atual) => ({ ...atual, periodo }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {META_PERIODOS.map((periodo) => (
                        <SelectItem key={periodo} value={periodo}>
                          {META_PERIODO_LABEL[periodo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            <FormSection
              title={form.tipo === "vgv" ? "Valor em R$" : "Quantidade"}
              icon={<Target className="w-4 h-4 text-primary" />}
            >
              <Input
                inputMode="numeric"
                value={form.valor}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    valor:
                      form.tipo === "vgv"
                        ? maskMoneyInput(event.target.value)
                        : event.target.value.replace(/\D/g, ""),
                  }))
                }
                placeholder={form.tipo === "vgv" ? "0,00" : "Ex.: 5"}
              />
            </FormSection>
          </FormDialogBody>
        </form>
      </FormDialogShell>
    </div>
  );
}

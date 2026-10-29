import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { CENTRAL_AREA, CENTRAL_BTN, CENTRAL_FIELD, CentralCard, CentralLabel } from "@/components/central-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  addMelhoriaComentario,
  createMelhoria,
  fetchMelhoria,
  fetchMelhorias,
  updateMelhoria,
  type MelhoriaDetalhe,
  type MelhoriaItem,
} from "@/lib/melhorias-api";
import { fetchTenants, type Tenant } from "@/lib/tenants-api";
import { isMockId, melhoriasMock, MOCK_MELHORIAS } from "@/lib/centrais-mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/melhorias")({
  head: () => ({ meta: [{ title: "Melhorias — Zone Connection" }] }),
  component: MelhoriasPage,
});

const STATUS: Record<string, string> = {
  recebida: "Recebida",
  em_avaliacao: "Em avaliação",
  aprovada: "Aprovada",
  planejada: "Planejada",
  em_desenvolvimento: "Em desenvolvimento",
  entregue: "Entregue",
  recusada: "Recusada",
  arquivada: "Arquivada",
};

const STATUS_PILL: Record<string, string> = {
  recebida: "bg-[#E8EEFF] text-[#3B5BDB]",
  em_avaliacao: "bg-[#E7F6FF] text-[#0B7285]",
  aprovada: "bg-[#F3E8FF] text-[#7C3AED]",
  planejada: "bg-[#F3E8FF] text-[#7C3AED]",
  em_desenvolvimento: "bg-[#E7F8EF] text-[#0F7A45]",
  entregue: "bg-[#E7F8EF] text-[#0F7A45]",
  recusada: "bg-[#F1F3F5] text-[#495057]",
  arquivada: "bg-[#F1F3F5] text-[#495057]",
};

const CATEGORIAS: Record<string, string> = {
  funcionalidade_nova: "Funcionalidade nova",
  melhoria_existente: "Melhoria existente",
  usabilidade: "Usabilidade",
  integracao: "Integração",
};

function MelhoriasPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [tenantId, setTenantId] = useState("todas");
  const [prioridade, setPrioridade] = useState("todas");
  const [categoria, setCategoria] = useState("todas");
  const [soMeus, setSoMeus] = useState(false);
  const [items, setItems] = useState<MelhoriaItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [aberto, setAberto] = useState<MelhoriaDetalhe | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [texto, setTexto] = useState("");
  const [interna, setInterna] = useState(false);
  const [form, setForm] = useState({
    tenantId: "",
    titulo: "",
    descricao: "",
    categoria: "funcionalidade_nova",
    prioridade: "normal",
  });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);
  const [exemplo, setExemplo] = useState(false);

  async function load() {
    setLoading(true);
    setErro("");
    try {
      const eu = getSession();
      const filtro = {
        q: q.trim() || undefined,
        status: status === "todos" ? undefined : status,
        prioridade: prioridade === "todas" ? undefined : prioridade,
        categoria: categoria === "todas" ? undefined : categoria,
      };
      const rows = await fetchMelhorias({
        ...filtro,
        tenantId: tenantId === "todas" ? undefined : tenantId,
        responsavelId: soMeus ? eu?.id : undefined,
      });
      setExemplo(rows.length === 0);
      setItems(rows.length ? rows : melhoriasMock(filtro));
      setErro("");
    } catch {
      setExemplo(true);
      setErro("");
      setItems(melhoriasMock({
        q: q.trim() || undefined,
        status: status === "todos" ? undefined : status,
        prioridade: prioridade === "todas" ? undefined : prioridade,
        categoria: categoria === "todas" ? undefined : categoria,
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void fetchTenants().then(setTenants).catch(() => setTenants([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function abrir(id: string) {
    if (isMockId(id)) {
      const detalhe = MOCK_MELHORIAS.find((item) => item.id === id) ?? null;
      setAberto(detalhe);
      setJustificativa(detalhe?.justificativaDecisao ?? "");
      return;
    }
    try {
      const detalhe = await fetchMelhoria(id);
      setAberto(detalhe);
      setJustificativa(detalhe.justificativaDecisao);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir a solicitação.");
    }
  }

  async function mudarStatus(id: string, value: string) {
    if (isMockId(id)) {
      toast.message("Exemplo visual. A solicitação não é gravada.");
      return;
    }
    if ((value === "recusada" || value === "arquivada") && !window.confirm("Confirmar essa decisão? O registro permanece consultável.")) {
      return;
    }
    if ((value === "aprovada" || value === "recusada") && justificativa.trim().length < 5) {
      toast.error("Informe a justificativa da decisão antes de aprovar ou recusar.");
      return;
    }
    try {
      await updateMelhoria(id, {
        status: value,
        justificativaDecisao: justificativa.trim() || undefined,
      });
      await load();
      await abrir(id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Melhorias"
        description="Sugestões de evolução do produto. A prioridade é interna e não promete prazo ao cliente."
      />
      <section className="overflow-hidden rounded-2xl border border-[#E6E8EC] bg-white dark:border-white/10 dark:bg-card">
        <div className="flex flex-col gap-3 border-b border-[#EEF0F3] px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[15px] font-semibold text-[#1A1D23] dark:text-[#f8fafc]">
            Solicitações
            <span className="ml-1.5 font-medium text-[#8B919A]">({loading ? "…" : items.length}{exemplo && !loading ? " exemplos" : ""})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8B919A]" />
              <Input
                className="h-9 w-44 rounded-lg border-[#E6E8EC] bg-white pl-8 text-[13px] shadow-none"
                placeholder="Buscar"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void load(); }}
              />
            </div>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger className="h-9 w-[9.5rem] rounded-lg border-[#E6E8EC] text-[13px] shadow-none"><SelectValue placeholder="Imobiliária" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Imobiliárias</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36 rounded-lg border-[#E6E8EC] text-[13px] shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Status</SelectItem>
                {Object.entries(STATUS).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger className="h-9 w-32 rounded-lg border-[#E6E8EC] text-[13px] shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Prioridade</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-9 w-40 rounded-lg border-[#E6E8EC] text-[13px] shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Categoria</SelectItem>
                {Object.entries(CATEGORIAS).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E6E8EC] px-2.5 text-[13px] text-[#3C4149]">
              <input className="size-3.5 accent-[#6D5EF7]" type="checkbox" checked={soMeus} onChange={(e) => setSoMeus(e.target.checked)} />
              Meus
            </label>
            <Button type="button" variant="outline" className="h-9 rounded-lg border-[#E6E8EC] px-3 text-[13px]" onClick={() => void load()}>Filtrar</Button>
            <Button type="button" className="h-9 rounded-lg border-0 bg-[#6D5EF7] px-3 text-[13px] text-white hover:bg-[#5B4DE0]" onClick={() => setCriando((v) => !v)}>
              Nova solicitação
            </Button>
          </div>
        </div>
        {criando ? (
        <div className="border-b border-[#EEF0F3] bg-[#FAFBFC] px-4 py-4 sm:px-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <CentralLabel>Imobiliária</CentralLabel>
          <Select value={form.tenantId} onValueChange={(value) => setForm({ ...form, tenantId: value })}>
            <SelectTrigger className={CENTRAL_FIELD}><SelectValue placeholder="Imobiliária" /></SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          <div>
            <CentralLabel>Título</CentralLabel>
            <Input className={CENTRAL_FIELD} placeholder="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <CentralLabel>Categoria</CentralLabel>
          <Select value={form.categoria} onValueChange={(value) => setForm({ ...form, categoria: value })}>
            <SelectTrigger className={CENTRAL_FIELD}><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORIAS).map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          <div>
            <CentralLabel>Prioridade</CentralLabel>
          <Select value={form.prioridade} onValueChange={(value) => setForm({ ...form, prioridade: value })}>
            <SelectTrigger className={CENTRAL_FIELD}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <CentralLabel>Descrição</CentralLabel>
            <Textarea className={CENTRAL_AREA} placeholder="Descrição da ideia" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="h-9 rounded-lg border-0 bg-[#6D5EF7] px-3 text-[13px] text-white hover:bg-[#5B4DE0]"
              disabled={!form.tenantId || form.titulo.length < 3 || form.descricao.length < 3}
              onClick={() => {
                void createMelhoria(form).then(async (created) => {
                  toast.success("Solicitação registrada.");
                  setForm({ ...form, titulo: "", descricao: "" });
                  setCriando(false);
                  await load();
                  await abrir(created.id);
                }).catch((error: unknown) => {
                  toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar.");
                });
              }}
            >
              Registrar
            </Button>
          </div>
        </div>
        </div>
        ) : null}
        {erro ? <p className="px-5 py-8 text-center text-sm text-[#8B919A]">{erro}</p> : null}
        {!loading && !erro && items.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-[#8B919A]">Nenhuma solicitação neste filtro.</p>
        ) : null}
        <ul>
          {items.map((item) => (
            <li key={item.id} className="border-b border-[#F1F2F4] last:border-0">
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col gap-2 px-4 py-3.5 text-left hover:bg-[#F7F8FA] sm:flex-row sm:items-center sm:gap-4 sm:px-5",
                  aberto?.id === item.id && "bg-[#F7F5FF]",
                )}
                onClick={() => void abrir(item.id)}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#1A1D23] dark:text-[#f8fafc]">
                  {item.titulo}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#6B7280]">
                  <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5">{item.tenantNome}</span>
                  <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5">{item.prioridade}</span>
                  <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5">{CATEGORIAS[item.categoria] ?? item.categoria}</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                </span>
                <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-medium", STATUS_PILL[item.status] ?? "bg-[#F1F3F5] text-[#495057]")}>
                  {STATUS[item.status] ?? item.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {aberto ? (
        <CentralCard
          title={`${aberto.codigo} · ${aberto.titulo}`}
          description={`${aberto.tenantNome} · ${CATEGORIAS[aberto.categoria] ?? aberto.categoria}${aberto.recente ? " · atualizada recentemente" : ""}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Select value={aberto.status} onValueChange={(value) => void mudarStatus(aberto.id, value)}>
                <SelectTrigger className={cn(CENTRAL_FIELD, "w-52")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS).map(([id, label]) => (
                    <SelectItem key={id} value={id}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => {
                const eu = getSession();
                if (!eu) return;
                void updateMelhoria(aberto.id, { responsavelId: eu.id }).then(() => abrir(aberto.id)).catch((error: unknown) => {
                  toast.error(error instanceof ApiError ? error.message : "Não foi possível atribuir.");
                });
              }}>
                Atribuir a mim
              </Button>
            </div>
          }
        >
          <p className="mb-3 rounded-lg border border-[#E2E8EC] bg-[#F3FAFD] px-3 py-3 text-sm text-[#0B3148] dark:border-white/10 dark:bg-white/5 dark:text-[#f8fafc]">{aberto.descricao}</p>
          <Textarea
            className={cn(CENTRAL_AREA, "mb-4")}
            placeholder="Justificativa, obrigatória para aprovar ou recusar"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
          <ul className="mb-4 space-y-2">
            {aberto.comentarios.map((comentario) => (
              <li key={comentario.id} className={comentario.interna ? "rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30" : "rounded-lg border border-[#E2E8EC] bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-transparent"}>
                <span className="text-xs font-medium text-muted-foreground">{comentario.interna ? "Nota interna" : "Comentário"} · {comentario.autorNome ?? "Sistema"}</span>
                <p className="mt-1">{comentario.texto}</p>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Textarea className={CENTRAL_AREA} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Comentário ou nota interna" />
            <Button type="button" className={CENTRAL_BTN} disabled={!texto.trim()} onClick={() => {
              if (isMockId(aberto.id)) {
                toast.message("Exemplo visual. O comentário não é gravado.");
                return;
              }
              void addMelhoriaComentario(aberto.id, { texto, interna }).then((detalhe) => {
                setAberto(detalhe);
                setTexto("");
              }).catch((error: unknown) => {
                toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar.");
              });
            }}>
              Registrar
            </Button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={interna} onChange={(e) => setInterna(e.target.checked)} />
            Nota interna
          </label>
          {aberto.historico.length ? (
            <ul className="mt-4 space-y-1 border-t pt-3 text-xs text-muted-foreground">
              {aberto.historico.map((evento) => (
                <li key={evento.id}>{evento.autorNome ?? "Sistema"} · {evento.acao} · {evento.detalhe}</li>
              ))}
            </ul>
          ) : null}
        </CentralCard>
      ) : null}
    </div>
  );
}

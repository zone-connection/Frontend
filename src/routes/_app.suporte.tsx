import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import {
  CENTRAL_AREA,
  CENTRAL_BTN,
  CENTRAL_FIELD,
  CentralCard,
  CentralLabel,
} from "@/components/central-card";
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
import { fetchTenants, type Tenant } from "@/lib/tenants-api";
import { cn } from "@/lib/utils";
import {
  addSuporteMensagem,
  createSuporteChamado,
  fetchSuporte,
  fetchSuportes,
  updateSuporteChamado,
  type SuporteDetalhe,
  type SuporteItem,
} from "@/lib/suporte-api";

export const Route = createFileRoute("/_app/suporte")({
  head: () => ({ meta: [{ title: "Suporte — Zone Connection" }] }),
  component: SuportePage,
});

const STATUS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  aguardando_equipe: "Aguardando equipe",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

const STATUS_DOT: Record<string, string> = {
  aberto: "bg-[#12B886]",
  em_atendimento: "bg-[#3B82F6]",
  aguardando_cliente: "bg-[#F59F00]",
  aguardando_equipe: "bg-[#F59F00]",
  resolvido: "bg-[#12B886]",
  fechado: "bg-[#ADB5BD]",
};

const PRIORIDADE_PILL: Record<string, string> = {
  urgente: "bg-[#FFE3E3] text-[#E03131]",
  alta: "bg-[#FFE3E3] text-[#E03131]",
  normal: "bg-[#FFF3BF] text-[#E67700]",
  baixa: "bg-[#D3F9D8] text-[#2B8A3E]",
};

function SuportePage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [tenantId, setTenantId] = useState("todas");
  const [prioridade, setPrioridade] = useState("todas");
  const [categoria, setCategoria] = useState("");
  const [soMeus, setSoMeus] = useState(false);
  const [items, setItems] = useState<SuporteItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [aberto, setAberto] = useState<SuporteDetalhe | null>(null);
  const [form, setForm] = useState({ tenantId: "", titulo: "", descricao: "", categoria: "duvida", prioridade: "normal", prazoEm: "" });
  const [texto, setTexto] = useState("");
  const [interna, setInterna] = useState(false);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);

  async function load(statusFiltro = status) {
    setLoading(true);
    try {
      const eu = getSession();
      setItems(await fetchSuportes({
        q,
        status: statusFiltro === "todos" ? undefined : statusFiltro,
        tenantId: tenantId === "todas" ? undefined : tenantId,
        prioridade: prioridade === "todas" ? undefined : prioridade,
        categoria: categoria.trim() || undefined,
        responsavelId: soMeus ? eu?.id : undefined,
      }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível listar os chamados.");
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
    try {
      setAberto(await fetchSuporte(id));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir o chamado.");
    }
  }

  async function criar() {
    try {
      const created = await createSuporteChamado({
        tenantId: form.tenantId,
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        prioridade: form.prioridade as "baixa" | "normal" | "alta" | "urgente",
        prazoEm: form.prazoEm || undefined,
      });
      toast.success("Chamado aberto.");
      setForm({ ...form, titulo: "", descricao: "" });
      setCriando(false);
      await load();
      await abrir(created.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir o chamado.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Suporte" description="Chamados das imobiliárias. Notas internas não aparecem para o cliente." />
      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white dark:border-white/10 dark:bg-card">
        <div className="flex gap-1 overflow-x-auto border-b border-[#F1F3F5] px-4 pt-3">
          {[["todos", "Todos"], ...Object.entries(STATUS)].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "mb-[-1px] flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-[13px]",
                status === id ? "border-[#12B886] font-semibold text-[#1A1D23]" : "border-transparent text-[#868E96] hover:text-[#1A1D23]",
              )}
              onClick={() => {
                setStatus(id);
                void load(id);
              }}
            >
              {label}
              {status === id ? (
                <span className="rounded-full bg-[#12B886] px-1.5 text-[11px] font-semibold text-white">{loading ? "…" : items.length}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center">
          <Select value={prioridade} onValueChange={setPrioridade}>
            <SelectTrigger className="h-9 w-40 rounded-full border-[#DEE2E6] text-[13px] shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Prioridade: todas</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger className="h-9 w-44 rounded-full border-[#DEE2E6] text-[13px] shadow-none"><SelectValue placeholder="Imobiliária" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Imobiliárias</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="h-9 w-36 rounded-full border-[#DEE2E6] text-[13px] shadow-none" placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          <label className="flex h-9 items-center gap-1.5 rounded-full border border-[#DEE2E6] px-3 text-[13px]">
            <input className="size-3.5 accent-[#12B886]" type="checkbox" checked={soMeus} onChange={(e) => setSoMeus(e.target.checked)} />
            Meus
          </label>
          <button type="button" className="text-[13px] font-medium text-[#E03131]" onClick={() => { setPrioridade("todas"); setTenantId("todas"); setCategoria(""); setSoMeus(false); setQ(""); }}>
            Limpar
          </button>
          <div className="relative lg:ml-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#ADB5BD]" />
            <Input className="h-9 w-full rounded-lg border-[#DEE2E6] pl-9 text-[13px] shadow-none lg:w-56" placeholder="Buscar chamado" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
          </div>
          <Button type="button" variant="outline" className="h-9 rounded-lg border-[#DEE2E6]" onClick={() => void load()}>Filtrar</Button>
          <Button type="button" className="h-9 rounded-lg border-0 bg-[#12B886] px-3 text-white hover:bg-[#0CA678]" onClick={() => setCriando((v) => !v)}>
            <Plus className="size-3.5" /> Novo chamado
          </Button>
        </div>
        {criando ? (
          <div className="grid gap-4 border-t border-[#F1F3F5] bg-[#F8F9FA] px-4 py-4 md:grid-cols-2">
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
              <Input className={CENTRAL_FIELD} placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
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
            <div>
              <CentralLabel>Prazo, se houver</CentralLabel>
              <Input className={CENTRAL_FIELD} type="date" value={form.prazoEm} onChange={(e) => setForm({ ...form, prazoEm: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <CentralLabel>Descrição</CentralLabel>
              <Textarea className={CENTRAL_AREA} placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div>
              <Button type="button" className="h-9 rounded-lg border-0 bg-[#12B886] text-white hover:bg-[#0CA678]" disabled={!form.tenantId || form.titulo.length < 3 || form.descricao.length < 3} onClick={() => void criar()}>
                Abrir chamado
              </Button>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="bg-[#F8F9FA] text-[12px] text-[#868E96]">
              <tr>
                <th className="px-4 py-3 font-medium">Assunto</th>
                <th className="px-3 py-3 font-medium">Prioridade</th>
                <th className="px-3 py-3 font-medium">Responsável</th>
                <th className="px-3 py-3 font-medium">Aberto em</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-14 text-center text-[#868E96]">Nenhum chamado neste filtro.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className={cn("border-t border-[#F1F3F5]", aberto?.id === item.id && "bg-[#F4FBF8]")}>
                  <td className="px-4 py-3.5 font-medium text-[#1A1D23] dark:text-[#f8fafc]">
                    <span className="block max-w-[280px] truncate">{item.titulo}</span>
                    <span className="block text-[12px] font-normal text-[#868E96]">{item.codigo} · {item.tenantNome}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[12px] font-medium capitalize", PRIORIDADE_PILL[item.prioridade] ?? "bg-[#F1F3F5] text-[#495057]")}>{item.prioridade}</span>
                  </td>
                  <td className="px-3 py-3.5 text-[#495057]">{item.responsavelNome ?? "—"}</td>
                  <td className="px-3 py-3.5 text-[#495057]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#495057]">
                      <span className={cn("size-1.5 rounded-full", STATUS_DOT[item.status] ?? "bg-[#ADB5BD]")} />
                      {STATUS[item.status] ?? item.status}
                      {item.atrasado ? " · atrasado" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Button type="button" variant="outline" className="h-8 rounded-lg border-[#DEE2E6] px-3 text-[12px]" onClick={() => void abrir(item.id)}>Abrir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#F1F3F5] px-4 py-3 text-[12px] text-[#868E96]">{loading ? "Carregando..." : `${items.length} chamado(s)`}</p>
      </section>
      {aberto ? (
        <CentralCard
          title={`${aberto.codigo} · ${aberto.titulo}`}
          description={`${aberto.tenantNome}${aberto.prazoEm ? ` · prazo ${new Date(aberto.prazoEm).toLocaleDateString("pt-BR")}` : ""}${aberto.atrasado ? " · atrasado" : ""}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Select value={aberto.status} onValueChange={(value) => {
                void updateSuporteChamado(aberto.id, { status: value }).then(() => abrir(aberto.id)).catch((error: unknown) => {
                  toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar.");
                });
              }}>
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
                void updateSuporteChamado(aberto.id, { responsavelId: eu.id }).then(() => abrir(aberto.id)).catch((error: unknown) => {
                  toast.error(error instanceof ApiError ? error.message : "Não foi possível atribuir.");
                });
              }}>
                Atribuir a mim
              </Button>
            </div>
          }
        >
          <p className="mb-4 rounded-lg border border-[#E2E8EC] bg-[#F3FAFD] px-3 py-3 text-sm text-[#0B3148] dark:border-white/10 dark:bg-white/5 dark:text-[#f8fafc]">{aberto.descricao}</p>
          <ul className="mb-4 space-y-2">
            {aberto.mensagens.map((mensagem) => (
              <li key={mensagem.id} className={mensagem.interna ? "rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30" : "rounded-lg border border-[#E2E8EC] bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-transparent"}>
                <span className="text-xs font-medium text-muted-foreground">{mensagem.interna ? "Nota interna" : "Resposta"} · {mensagem.autorNome ?? "Sistema"}</span>
                <p className="mt-1">{mensagem.texto}</p>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Textarea className={CENTRAL_AREA} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Resposta ou nota" />
            <Button type="button" className={CENTRAL_BTN} disabled={!texto.trim()} onClick={() => {
              void addSuporteMensagem(aberto.id, { texto, interna }).then((detalhe) => {
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
            Nota interna (não vai para a imobiliária)
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

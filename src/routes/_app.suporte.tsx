import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
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

  async function load() {
    setLoading(true);
    try {
      const eu = getSession();
      setItems(await fetchSuportes({
        q,
        status: status === "todos" ? undefined : status,
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
      await load();
      await abrir(created.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir o chamado.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Suporte" description="Chamados das imobiliárias. Notas internas não aparecem para o cliente." />
      <CentralCard title="Filtros">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
          <Input className={CENTRAL_FIELD} placeholder="Título ou código" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger className={CENTRAL_FIELD}><SelectValue placeholder="Imobiliária" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as imobiliárias</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className={CENTRAL_FIELD}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS).map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prioridade} onValueChange={setPrioridade}>
            <SelectTrigger className={CENTRAL_FIELD}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Prioridades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
          <Input className={CENTRAL_FIELD} placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#153047]">
              <input className="size-4 accent-[#008FD0]" type="checkbox" checked={soMeus} onChange={(e) => setSoMeus(e.target.checked)} />
              Meus
            </label>
            <Button type="button" variant="outline" className="h-11 rounded-[16px] border-[#DCE5EC]" onClick={() => void load()}>Filtrar</Button>
          </div>
        </div>
      </CentralCard>
      <CentralCard title="Novo chamado" description="A categoria descreve o tipo do pedido. O prazo é opcional.">
        <div className="grid gap-5 md:grid-cols-2">
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
            <Button type="button" className={CENTRAL_BTN} disabled={!form.tenantId || form.titulo.length < 3 || form.descricao.length < 3} onClick={() => void criar()}>
              Abrir chamado
            </Button>
          </div>
        </div>
      </CentralCard>
      <CentralCard title="Chamados" description={loading ? "Carregando..." : `${items.length} neste filtro`}>
        {!loading && items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum chamado neste filtro.</p> : null}
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="w-full rounded-[22px] border border-[#DCE5EC] bg-[#F6F8FA] px-5 py-4 text-left hover:border-[#79CCE7] dark:border-white/10 dark:bg-white/5" onClick={() => void abrir(item.id)}>
                <span className="block truncate text-sm font-semibold">{item.codigo} · {item.titulo}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.tenantNome} · {STATUS[item.status] ?? item.status} · {item.prioridade}
                  {item.responsavelNome ? ` · ${item.responsavelNome}` : ""}
                  {item.atrasado ? " · Atrasado" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CentralCard>
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

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { PagePanel } from "@/components/page-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Título ou código" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={tenantId} onValueChange={setTenantId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Imobiliária" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as imobiliárias</SelectItem>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS).map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prioridade} onValueChange={setPrioridade}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
        <Input className="max-w-[10rem]" placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soMeus} onChange={(e) => setSoMeus(e.target.checked)} />
          Meus chamados
        </label>
        <Button type="button" variant="outline" onClick={() => void load()}>Filtrar</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <PagePanel>
          <h2 className="mb-3 text-sm font-semibold">Novo chamado</h2>
          <div className="space-y-3">
            <Select value={form.tenantId} onValueChange={(tenantId) => setForm({ ...form, tenantId })}>
              <SelectTrigger><SelectValue placeholder="Imobiliária" /></SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            <Input placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            <Select value={form.prioridade} onValueChange={(prioridade) => setForm({ ...form, prioridade })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label>Prazo, se houver</Label>
              <Input type="date" value={form.prazoEm} onChange={(e) => setForm({ ...form, prazoEm: e.target.value })} />
            </div>
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <Button type="button" disabled={!form.tenantId || form.titulo.length < 3 || form.descricao.length < 3} onClick={() => void criar()}>
              Abrir chamado
            </Button>
          </div>
        </PagePanel>
        <PagePanel>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum chamado neste filtro.</p> : null}
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => void abrir(item.id)}>
                  <span>
                    <span className="block text-sm font-medium">{item.codigo} · {item.titulo}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.tenantNome} · {STATUS[item.status] ?? item.status} · {item.prioridade}
                      {item.responsavelNome ? ` · ${item.responsavelNome}` : ""}
                      {item.atrasado ? " · Atrasado" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PagePanel>
      </div>
      {aberto ? (
        <PagePanel>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">{aberto.codigo} · {aberto.titulo}</h2>
              <p className="text-xs text-muted-foreground">
                {aberto.tenantNome}
                {aberto.prazoEm ? ` · prazo ${new Date(aberto.prazoEm).toLocaleDateString("pt-BR")}` : ""}
                {aberto.atrasado ? " · atrasado" : ""}
              </p>
            </div>
            <Select value={aberto.status} onValueChange={(value) => {
              void updateSuporteChamado(aberto.id, { status: value }).then(() => abrir(aberto.id)).catch((error: unknown) => {
                toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar.");
              });
            }}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
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
          <p className="mb-4 text-sm">{aberto.descricao}</p>
          <ul className="mb-4 space-y-2">
            {aberto.mensagens.map((mensagem) => (
              <li key={mensagem.id} className={mensagem.interna ? "rounded-md bg-amber-50 p-2 text-sm dark:bg-amber-950/30" : "text-sm"}>
                <span className="text-xs text-muted-foreground">{mensagem.interna ? "Nota interna" : "Resposta"} · {mensagem.autorNome ?? "Sistema"}</span>
                <p>{mensagem.texto}</p>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Resposta ou nota" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={interna} onChange={(e) => setInterna(e.target.checked)} />
              Nota interna (não vai para a imobiliária)
            </label>
            <Button type="button" disabled={!texto.trim()} onClick={() => {
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
          {aberto.historico.length ? (
            <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
              {aberto.historico.map((evento) => (
                <li key={evento.id}>{evento.autorNome ?? "Sistema"} · {evento.acao} · {evento.detalhe}</li>
              ))}
            </ul>
          ) : null}
        </PagePanel>
      ) : null}
    </div>
  );
}

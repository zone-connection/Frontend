import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { PagePanel } from "@/components/page-panel";
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

  async function load() {
    setLoading(true);
    setErro("");
    try {
      const eu = getSession();
      setItems(await fetchMelhorias({
        q: q.trim() || undefined,
        status: status === "todos" ? undefined : status,
        tenantId: tenantId === "todas" ? undefined : tenantId,
        prioridade: prioridade === "todas" ? undefined : prioridade,
        categoria: categoria === "todas" ? undefined : categoria,
        responsavelId: soMeus ? eu?.id : undefined,
      }));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Não foi possível listar as solicitações.";
      setErro(message);
      toast.error(message);
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
      const detalhe = await fetchMelhoria(id);
      setAberto(detalhe);
      setJustificativa(detalhe.justificativaDecisao);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir a solicitação.");
    }
  }

  async function mudarStatus(id: string, value: string) {
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
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Categorias</SelectItem>
            {Object.entries(CATEGORIAS).map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soMeus} onChange={(e) => setSoMeus(e.target.checked)} />
          Meus itens
        </label>
        <Button type="button" variant="outline" onClick={() => void load()}>Filtrar</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <PagePanel>
          <h2 className="mb-3 text-sm font-semibold">Nova solicitação</h2>
          <div className="space-y-3">
            <Select value={form.tenantId} onValueChange={(value) => setForm({ ...form, tenantId: value })}>
              <SelectTrigger><SelectValue placeholder="Imobiliária" /></SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            <Select value={form.categoria} onValueChange={(value) => setForm({ ...form, categoria: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIAS).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.prioridade} onValueChange={(value) => setForm({ ...form, prioridade: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Descrição da ideia" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <Button
              type="button"
              disabled={!form.tenantId || form.titulo.length < 3 || form.descricao.length < 3}
              onClick={() => {
                void createMelhoria(form).then(async (created) => {
                  toast.success("Solicitação registrada.");
                  setForm({ ...form, titulo: "", descricao: "" });
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
        </PagePanel>
        <PagePanel>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          {!loading && !erro && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação neste filtro.</p>
          ) : null}
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className="w-full py-3 text-left" onClick={() => void abrir(item.id)}>
                  <span className="block text-sm font-medium">{item.codigo} · {item.titulo}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.tenantNome} · {STATUS[item.status] ?? item.status} · {item.prioridade}
                    {item.responsavelNome ? ` · ${item.responsavelNome}` : ""}
                    {item.recente ? " · Atualizada recentemente" : ""}
                    {` · ${new Date(item.updatedAt).toLocaleDateString("pt-BR")}`}
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
                {aberto.tenantNome} · {CATEGORIAS[aberto.categoria] ?? aberto.categoria}
                {aberto.recente ? " · atualizada recentemente" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={aberto.status} onValueChange={(value) => void mudarStatus(aberto.id, value)}>
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
                void updateMelhoria(aberto.id, { responsavelId: eu.id }).then(() => abrir(aberto.id)).catch((error: unknown) => {
                  toast.error(error instanceof ApiError ? error.message : "Não foi possível atribuir.");
                });
              }}>
                Atribuir a mim
              </Button>
            </div>
          </div>
          <p className="mb-3 text-sm">{aberto.descricao}</p>
          <Textarea
            className="mb-4"
            placeholder="Justificativa, obrigatória para aprovar ou recusar"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
          <ul className="mb-4 space-y-2">
            {aberto.comentarios.map((comentario) => (
              <li key={comentario.id} className={comentario.interna ? "rounded-md bg-amber-50 p-2 text-sm dark:bg-amber-950/30" : "text-sm"}>
                <span className="text-xs text-muted-foreground">{comentario.interna ? "Nota interna" : "Comentário"} · {comentario.autorNome ?? "Sistema"}</span>
                <p>{comentario.texto}</p>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Comentário ou nota interna" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={interna} onChange={(e) => setInterna(e.target.checked)} />
              Nota interna
            </label>
            <Button type="button" disabled={!texto.trim()} onClick={() => {
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

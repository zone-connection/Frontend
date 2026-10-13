import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { PagePanel } from "@/components/page-panel";
import { DocumentosPanel } from "@/components/documentos-panel";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  previewArquivo,
  uploadArquivo,
} from "@/lib/arquivos-api";
import { fetchEmpreendimentos } from "@/lib/empreendimentos-api";
import {
  fetchLeadAssignees,
  fetchLeads,
  type ApiLead,
  type LeadAssignee,
} from "@/lib/leads-api";
import {
  createProcesso,
  enviarProcesso,
  fetchProcessos,
  retornarProcesso,
  updateProcesso,
  type Processo,
  type ProcessoStatus,
} from "@/lib/processos-api";
import { toast } from "sonner";
import { Loader2, Plus, Send } from "lucide-react";

export const Route = createFileRoute("/_app/processos")({
  component: ProcessosPage,
});

const STATUS_LABEL: Record<ProcessoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

function isGestor() {
  const role = getSession()?.role;
  return role === "admin" || role === "gerente" || role === "super_admin";
}

function ProcessosPage() {
  const gestor = isGestor();
  const [rows, setRows] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<ProcessoStatus | "todos">("todos");
  const [selected, setSelected] = useState<Processo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<
    { id: string; nome: string }[]
  >([]);
  const [leadId, setLeadId] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    fonte: "",
    telefone: "",
    email: "",
    estadoCivil: "",
    tipoRenda: "",
    cotista: false,
    dependente: false,
    empreendimentoId: "",
    corretorId: "",
    gerenteId: "",
  });
  const [retornoTexto, setRetornoTexto] = useState("");
  const [retornoPdf, setRetornoPdf] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchProcessos(
        filtro === "todos" ? undefined : filtro,
      );
      setRows(list);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar.",
      );
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.all([
      fetchLeads({ tipo: "lead", limit: 100 }),
      fetchLeads({ tipo: "cliente", limit: 100 }),
      fetchLeadAssignees(),
      fetchEmpreendimentos({ ativo: true }),
    ])
      .then(([a, b, users, emps]) => {
        setLeads([...a.data, ...b.data]);
        setAssignees(users);
        setEmpreendimentos(emps.map((e) => ({ id: e.id, nome: e.nome })));
      })
      .catch(() => undefined);
  }, []);

  const gerentes = useMemo(
    () => assignees.filter((u) => u.role === "gerente" || u.role === "admin"),
    [assignees],
  );

  function fillFromLead(id: string) {
    setLeadId(id);
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setForm({
      nome: lead.nome ?? "",
      fonte: lead.origem ?? "",
      telefone: lead.telefone ?? "",
      email: lead.email ?? "",
      estadoCivil: lead.estadoCivil ?? "",
      tipoRenda: lead.tipoRenda ?? "",
      cotista: false,
      dependente: false,
      empreendimentoId: lead.empreendimentoId ?? "",
      corretorId: lead.corretorId ?? getSession()?.id ?? "",
      gerenteId: lead.corretor?.id
        ? (assignees.find((u) => u.id === lead.corretorId)?.gerenteId ?? "")
        : "",
    });
  }

  function applySelected(p: Processo) {
    setSelected(p);
    setForm({
      nome: p.nome,
      fonte: p.fonte,
      telefone: p.telefone,
      email: p.email,
      estadoCivil: p.estadoCivil,
      tipoRenda: p.tipoRenda,
      cotista: p.cotista,
      dependente: p.dependente,
      empreendimentoId: p.empreendimentoId ?? "",
      corretorId: p.corretorId ?? "",
      gerenteId: p.gerenteId ?? "",
    });
    setRetornoTexto("");
    setRetornoPdf(null);
  }

  const canEdit =
    selected &&
    (selected.status === "rascunho" || selected.status === "reprovado");

  async function onCreate() {
    if (!leadId) {
      toast.error("Selecione um lead ou cliente.");
      return;
    }
    setSaving(true);
    try {
      const created = await createProcesso({
        leadId,
        ...form,
        empreendimentoId: form.empreendimentoId || null,
        corretorId: form.corretorId || null,
        gerenteId: form.gerenteId || null,
      });
      toast.success("Processo cadastrado.");
      setCreateOpen(false);
      await load();
      applySelected(created);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível cadastrar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onSave() {
    if (!selected || !canEdit) return;
    setSaving(true);
    try {
      const updated = await updateProcesso(selected.id, {
        ...form,
        empreendimentoId: form.empreendimentoId || null,
        corretorId: form.corretorId || null,
        gerenteId: form.gerenteId || null,
      });
      toast.success("Ficha atualizada.");
      applySelected(updated);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onEnviar() {
    if (!selected) return;
    setSaving(true);
    try {
      if (canEdit) {
        await updateProcesso(selected.id, {
          ...form,
          empreendimentoId: form.empreendimentoId || null,
          corretorId: form.corretorId || null,
          gerenteId: form.gerenteId || null,
        });
      }
      const updated = await enviarProcesso(selected.id);
      toast.success("Processo enviado ao gerente.");
      applySelected(updated);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível enviar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onRetorno(resultado: "aprovado" | "reprovado") {
    if (!selected) return;
    setSaving(true);
    try {
      let arquivoId: string | null = null;
      if (retornoPdf) {
        const uploaded = await uploadArquivo({
          file: retornoPdf,
          entityType: "processo",
          entityId: selected.id,
          nome: `Retorno ${resultado}`,
          categoria: "outro",
          tagIds: [],
        });
        arquivoId = uploaded.id;
      }
      const updated = await retornarProcesso(selected.id, {
        resultado,
        texto: retornoTexto,
        arquivoId,
      });
      toast.success(
        resultado === "aprovado" ? "Processo aprovado." : "Processo reprovado.",
      );
      applySelected(updated);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível retornar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Processos"
        description="Cadastre a ficha e os documentos do lead ou cliente. O envio vai para o gerente analisar."
      />
      <PagePanel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Cadastrar processos
          </Button>
          {(
            ["todos", "rascunho", "enviado", "aprovado", "reprovado"] as const
          ).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={filtro === s ? "default" : "outline"}
              onClick={() => setFiltro(s)}
            >
              {s === "todos" ? "Todos" : STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Nenhum processo ainda.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => applySelected(row)}
                  >
                    <TableCell>{row.nome}</TableCell>
                    <TableCell>{row.telefone}</TableCell>
                    <TableCell>
                      {row.empreendimento?.nome ?? "—"}
                    </TableCell>
                    <TableCell>{row.corretor?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {STATUS_LABEL[row.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </PagePanel>

      {selected ? (
        <PagePanel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Ficha do processo</h2>
            <Badge>{STATUS_LABEL[selected.status]}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nome">
              <Input
                value={form.nome}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Field>
            <Field label="Fonte">
              <Input
                value={form.fonte}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, fonte: e.target.value })}
              />
            </Field>
            <Field label="Corretor">
              <Select
                value={form.corretorId || undefined}
                disabled={!canEdit}
                onValueChange={(v) => setForm({ ...form, corretorId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gerente">
              <Select
                value={form.gerenteId || undefined}
                disabled={!canEdit}
                onValueChange={(v) => setForm({ ...form, gerenteId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {gerentes.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cotista">
              <Select
                value={form.cotista ? "sim" : "nao"}
                disabled={!canEdit}
                onValueChange={(v) =>
                  setForm({ ...form, cotista: v === "sim" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Dependente">
              <Select
                value={form.dependente ? "sim" : "nao"}
                disabled={!canEdit}
                onValueChange={(v) =>
                  setForm({ ...form, dependente: v === "sim" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Contato">
              <Input
                value={form.telefone}
                disabled={!canEdit}
                onChange={(e) =>
                  setForm({ ...form, telefone: e.target.value })
                }
              />
            </Field>
            <Field label="Estado civil">
              <Input
                value={form.estadoCivil}
                disabled={!canEdit}
                onChange={(e) =>
                  setForm({ ...form, estadoCivil: e.target.value })
                }
              />
            </Field>
            <Field label="E-mail">
              <Input
                value={form.email}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Empreendimento">
              <Select
                value={form.empreendimentoId || undefined}
                disabled={!canEdit}
                onValueChange={(v) =>
                  setForm({ ...form, empreendimentoId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empreendimentos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Carteira assinada / tipo de renda">
              <Input
                value={form.tipoRenda}
                disabled={!canEdit}
                onChange={(e) =>
                  setForm({ ...form, tipoRenda: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <Button type="button" variant="outline" onClick={() => void onSave()} disabled={saving}>
                  Salvar ficha
                </Button>
                <Button type="button" onClick={() => void onEnviar()} disabled={saving}>
                  <Send className="mr-1 h-4 w-4" />
                  Enviar
                </Button>
              </>
            ) : null}
          </div>

          <div className="mt-6">
            <DocumentosPanel
              entityType="processo"
              entityId={selected.id}
              categoria="ficha"
              extraVinculo={{ entityType: "lead", entityId: selected.leadId }}
              title="Documentações"
              allowUpload={Boolean(canEdit)}
            />
          </div>

          {(selected.retornos?.length ?? 0) > 0 ? (
            <div className="mt-6 space-y-3">
              <h3 className="font-medium">Retornos</h3>
              {selected.retornos!.map((r) => (
                <div key={r.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        r.resultado === "aprovado" ? "default" : "destructive"
                      }
                    >
                      {r.resultado === "aprovado" ? "Aprovado" : "Reprovado"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.autor.name} ·{" "}
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {r.texto ? (
                    <p className="mt-2 whitespace-pre-wrap">{r.texto}</p>
                  ) : null}
                  {r.arquivoId ? (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0"
                      onClick={() => {
                        void previewArquivo(r.arquivoId!).then((res) =>
                          window.open(res.url, "_blank"),
                        );
                      }}
                    >
                      Ver PDF do retorno
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {gestor && selected.status === "enviado" ? (
            <div className="mt-6 space-y-3 rounded-lg border p-4">
              <h3 className="font-medium">Retorno ao corretor</h3>
              <Textarea
                rows={4}
                placeholder="Pendências, documentos faltando ou parecer..."
                value={retornoTexto}
                onChange={(e) => setRetornoTexto(e.target.value)}
              />
              <div>
                <Label>PDF opcional</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setRetornoPdf(e.target.files?.[0] ?? null)
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void onRetorno("aprovado")}
                  disabled={saving}
                >
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void onRetorno("reprovado")}
                  disabled={saving}
                >
                  Reprovar
                </Button>
              </div>
            </div>
          ) : null}
        </PagePanel>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar processo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Lead ou cliente</Label>
              <Select value={leadId || undefined} onValueChange={fillFromLead}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione da sua carteira" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome} ({l.tipo === "cliente" ? "cliente" : "lead"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              A ficha é preenchida com os dados do contato. Depois você sobe as
              documentações e envia ao gerente.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void onCreate()} disabled={saving}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

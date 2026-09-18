import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileDown,
  Loader2,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { SemConexao } from "@/components/sem-conexao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canViewModule } from "@/lib/permissions";
import {
  createPresencaTipo,
  deletePresencaTipo,
  fetchPresencaMes,
  updatePresencaTipo,
  upsertPresencaLancamento,
  type PresencaMes,
  type PresencaNatureza,
  type PresencaTipo,
} from "@/lib/presenca-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/presenca")({
  head: () => ({ meta: [{ title: "Presença — Zone Connection" }] }),
  component: Page,
});

const NATUREZAS: { id: PresencaNatureza; label: string }[] = [
  { id: "presente", label: "Presença" },
  { id: "meio_periodo", label: "Meio período" },
  { id: "falta", label: "Falta" },
  { id: "falta_justificada", label: "Falta justificada" },
];

const ROLE_OPTS = [
  { id: "corretor", label: "Corretor" },
  { id: "treinee", label: "Trainee" },
  { id: "gerente", label: "Gerente" },
  { id: "admin", label: "Admin" },
  { id: "assistente", label: "Assistente" },
  { id: "analista", label: "Analista" },
  { id: "financeiro", label: "Financeiro" },
];

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function weekday(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return ["D", "S", "T", "Q", "Q", "S", "S"][d.getDay()]!;
}

function tiposParaRole(tipos: PresencaTipo[], role: string) {
  return tipos.filter(
    (t) => t.ativo && (t.roles.length === 0 || t.roles.includes(role)),
  );
}

function pctChange(atual: number, anterior: number) {
  if (!anterior) return atual ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

function Page() {
  const user = getSession();
  const canView = canViewModule(user, "presenca");
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [data, setData] = useState<PresencaMes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [tiposOpen, setTiposOpen] = useState(false);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const mesData = await fetchPresencaMes(ano, mes);
      setData(mesData);
      setOffline(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) setOffline(true);
      else toast.error(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, [ano, mes, canView]);

  useEffect(() => {
    void load();
  }, [load]);

  const shift = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };

  const onCycle = async (userId: string, day: string, role: string) => {
    if (!data?.podeEditar) return;
    const tipos = tiposParaRole(data.tipos, role);
    if (tipos.length === 0) {
      toast.error("Nenhum tipo de presença para esta função.");
      return;
    }
    const current = data.usuarios.find((u) => u.userId === userId)?.dias[day];
    const idx = current ? tipos.findIndex((t) => t.id === current.tipoId) : -1;
    const next = idx < 0 ? tipos[0] : idx === tipos.length - 1 ? null : tipos[idx + 1];
    const key = `${userId}|${day}`;
    setSaving(key);
    try {
      await upsertPresencaLancamento({
        userId,
        data: day,
        tipoId: next?.id ?? null,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSaving(null);
    }
  };

  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text(`Presença — ${MESES[data.mes - 1]} ${data.ano}`, 40, 36);
    const head = [
      ["Nome", "Função", ...data.dias.map((d) => `${d.slice(8)}/${d.slice(5, 7)}`)],
    ];
    const body = data.usuarios.map((u) => [
      u.nome,
      u.role,
      ...data.dias.map((d) => u.dias[d]?.sigla ?? ""),
    ]);
    autoTable(doc, {
      startY: 48,
      head,
      body,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [6, 137, 189] },
    });
    const y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 60;
    doc.setFontSize(10);
    doc.text(
      `Média de presentes/dia: ${data.resumo.mediaVieram}  ·  Equivalente: ${data.resumo.mediaEquivalente}  ·  vs mês ant.: ${data.resumoAnterior.mediaVieram}`,
      40,
      y + 18,
    );
    doc.save(`presenca-${data.ano}-${String(data.mes).padStart(2, "0")}.pdf`);
  };

  if (!canView) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Você não tem acesso a Presença.
      </div>
    );
  }

  if (offline) return <SemConexao onRetry={() => void load()} />;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="Presença"
        description="Marque presença, meio período, falta e falta justificada. Compare com o mês anterior."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[160px] text-center font-medium">
          {MESES[mes - 1]} {ano}
        </div>
        <Button variant="outline" size="icon" onClick={() => shift(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={exportPdf} disabled={!data}>
          <FileDown className="mr-2 h-4 w-4" />
          PDF
        </Button>
        {data?.podeTipos ? (
          <Button variant="outline" onClick={() => setTiposOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Tipos
          </Button>
        ) : null}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceKpiCard
              label="Média de pessoas presentes / dia"
              value={data.resumo.mediaVieram}
              format="number"
              icon={Users}
              tone="emerald"
              evolucaoPct={pctChange(
                data.resumo.mediaVieram,
                data.resumoAnterior.mediaVieram,
              )}
              valorMesAnterior={data.resumoAnterior.mediaVieram}
              detail="Conta presença e meio período"
            />
            <FinanceKpiCard
              label="Média equivalente (dias)"
              value={data.resumo.mediaEquivalente}
              format="number"
              icon={ClipboardCheck}
              tone="blue"
              evolucaoPct={pctChange(
                data.resumo.mediaEquivalente,
                data.resumoAnterior.mediaEquivalente,
              )}
              valorMesAnterior={data.resumoAnterior.mediaEquivalente}
              detail="Presença = 1 · meio período = 0,5"
            />
          </div>

          <Card className="overflow-auto p-0">
            <table className="min-w-max text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2 text-left min-w-[180px]">
                    Pessoa
                  </th>
                  {data.dias.map((d) => (
                    <th key={d} className="px-1 py-2 text-center w-9">
                      <div className="text-[10px] text-muted-foreground">
                        {weekday(d)}
                      </div>
                      <div>{Number(d.slice(8))}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.usuarios.map((u) => (
                  <tr key={u.userId} className="border-b">
                    <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
                      <div className="font-medium">{u.nome}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {u.equipe ?? u.role}
                      </div>
                    </td>
                    {data.dias.map((d) => {
                      const cell = u.dias[d];
                      const busy = saving === `${u.userId}|${d}`;
                      return (
                        <td key={d} className="p-0.5">
                          <button
                            type="button"
                            disabled={!data.podeEditar || busy}
                            title={
                              data.podeEditar
                                ? "Clique para alternar o tipo"
                                : cell?.nome ?? "Sem lançamento"
                            }
                            onClick={() => void onCycle(u.userId, d, u.role)}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded text-[10px] font-semibold",
                              data.podeEditar && "hover:ring-2 hover:ring-primary/40",
                              !cell && "bg-muted/40 text-muted-foreground",
                            )}
                            style={
                              cell
                                ? { backgroundColor: `${cell.cor}22`, color: cell.cor }
                                : undefined
                            }
                          >
                            {busy ? "…" : cell?.sigla ?? "·"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <div className="mb-2 text-sm font-medium">Pessoas que vieram (por dia)</div>
            <div className="flex flex-wrap gap-1">
              {data.resumo.porDia.map((d) => (
                <div
                  key={d.data}
                  className="rounded border px-2 py-1 text-center text-[11px]"
                >
                  <div className="text-muted-foreground">{Number(d.data.slice(8))}</div>
                  <div className="font-semibold">{d.vieram}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Comparação com {MESES[data.resumoAnterior.mes - 1]}{" "}
              {data.resumoAnterior.ano}: média {data.resumoAnterior.mediaVieram}{" "}
              presentes/dia.
              {data.podeEditar
                ? " Clique na célula para ciclar os tipos (e um clique extra limpa)."
                : ""}
            </p>
          </Card>
        </>
      ) : null}

      <TiposDialog
        open={tiposOpen}
        onOpenChange={setTiposOpen}
        tipos={data?.tipos ?? []}
        onSaved={() => void load()}
      />
    </div>
  );
}

function TiposDialog({
  open,
  onOpenChange,
  tipos,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipos: PresencaTipo[];
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [natureza, setNatureza] = useState<PresencaNatureza>("presente");
  const [cor, setCor] = useState("#059669");
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!nome.trim() || !sigla.trim()) {
      toast.error("Informe nome e sigla.");
      return;
    }
    setSaving(true);
    try {
      await createPresencaTipo({
        nome: nome.trim(),
        sigla: sigla.trim(),
        natureza,
        cor,
        roles,
      });
      setNome("");
      setSigla("");
      setRoles([]);
      toast.success("Tipo criado. Vale para as funções marcadas (vazio = todas).");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tipos de presença e falta</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          O administrador define os tipos para todas as funções do tenant. Deixe as
          funções em branco para aplicar a todos.
        </p>
        <div className="space-y-3">
          {tipos.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded border px-3 py-2"
            >
              <div>
                <span className="font-medium" style={{ color: t.cor }}>
                  {t.sigla}
                </span>{" "}
                {t.nome}{" "}
                <span className="text-xs text-muted-foreground">
                  ({NATUREZAS.find((n) => n.id === t.natureza)?.label}
                  {t.roles.length ? ` · ${t.roles.join(", ")}` : " · todas as funções"})
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void updatePresencaTipo(t.id, { ativo: !t.ativo }).then(onSaved)
                  }
                >
                  {t.ativo ? "Desativar" : "Ativar"}
                </Button>
                {!t.padrao ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void deletePresencaTipo(t.id)
                        .then(onSaved)
                        .catch((e) =>
                          toast.error(e instanceof Error ? e.message : "Erro"),
                        )
                    }
                  >
                    Excluir
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-2 border-t pt-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4" /> Novo tipo
          </div>
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input
            placeholder="Sigla (ex.: P)"
            value={sigla}
            maxLength={8}
            onChange={(e) => setSigla(e.target.value)}
          />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={natureza}
            onChange={(e) => setNatureza(e.target.value as PresencaNatureza)}
          >
            {NATUREZAS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
          <Label className="text-xs">Cor</Label>
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTS.map((r) => (
              <label key={r.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={roles.includes(r.id)}
                  onChange={(e) =>
                    setRoles((prev) =>
                      e.target.checked
                        ? [...prev, r.id]
                        : prev.filter((x) => x !== r.id),
                    )
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Salvando…" : "Adicionar tipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

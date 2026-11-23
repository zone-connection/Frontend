import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import {
  criarChecklist,
  criarEtapaCadencia,
  criarItemChecklist,
  editarItemChecklist,
  excluirChecklist,
  excluirEtapaCadencia,
  excluirItemChecklist,
  fetchAtendimentoConfig,
  ordenarEtapasCadencia,
  salvarFlagsAtendimento,
  type AtendimentoConfig,
} from "@/lib/atendimento-api";
import { getSession } from "@/lib/auth";

export function ConfigAtendimentoPanel() {
  const podeEditar = getSession()?.role === "admin" || getSession()?.role === "super_admin";
  const [config, setConfig] = useState<AtendimentoConfig | null>(null);
  const [dia, setDia] = useState("1");
  const [acao, setAcao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nomeChecklist, setNomeChecklist] = useState("");
  const [funilId, setFunilId] = useState("");
  const [itemTexto, setItemTexto] = useState<Record<string, string>>({});

  async function carregar() {
    setConfig(await fetchAtendimentoConfig());
  }

  useEffect(() => {
    void carregar().catch((err) => toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar o atendimento."));
  }, []);

  async function run(task: () => Promise<unknown>) {
    try {
      await task();
      await carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    }
  }

  if (!config) return null;

  async function mover(index: number, delta: number) {
    const ids = config!.etapas.map((etapa) => etapa.id);
    const alvo = index + delta;
    if (alvo < 0 || alvo >= ids.length) return;
    const [item] = ids.splice(index, 1);
    ids.splice(alvo, 0, item);
    await run(() => ordenarEtapasCadencia(ids));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-base font-semibold">Cadência</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sequência de ações que o corretor deve cumprir. Não altera o prazo do SLA.</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Label htmlFor="cadencia-ativa">Ativar cadência para a imobiliária</Label>
          <Switch
            id="cadencia-ativa"
            checked={config.cadenciaAtiva}
            disabled={!podeEditar}
            onCheckedChange={(cadenciaAtiva) => void run(() => salvarFlagsAtendimento({ cadenciaAtiva }))}
          />
        </div>
        <ul className="mt-4 space-y-2">
          {config.etapas.map((etapa, index) => (
            <li key={etapa.id} className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Dia {etapa.dia} — {etapa.acao}</p>
                {etapa.descricao ? <p className="text-xs text-muted-foreground">{etapa.descricao}</p> : null}
              </div>
              {podeEditar ? (
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="icon" variant="ghost" onClick={() => void mover(index, -1)}><ArrowUp className="size-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => void mover(index, 1)}><ArrowDown className="size-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => void run(() => excluirEtapaCadencia(etapa.id))}><Trash2 className="size-4" /></Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {podeEditar ? (
          <form
            className="mt-4 grid gap-2 sm:grid-cols-[6rem_1fr]"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await criarEtapaCadencia({ dia: Number(dia), acao, descricao });
                setAcao("");
                setDescricao("");
              });
            }}
          >
            <Input value={dia} onChange={(event) => setDia(event.target.value)} inputMode="numeric" aria-label="Dia" />
            <Input value={acao} onChange={(event) => setAcao(event.target.value)} placeholder="Ação esperada" />
            <Input className="sm:col-span-2" value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Orientação para o corretor" />
            <Button type="submit" className="sm:col-span-2">Adicionar etapa</Button>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-base font-semibold">Checklist</h2>
        <p className="mt-1 text-sm text-muted-foreground">Qualidade do atendimento. O selo aparece quando os itens obrigatórios estão marcados.</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Label htmlFor="checklist-ativo">Ativar checklist para a imobiliária</Label>
          <Switch
            id="checklist-ativo"
            checked={config.checklistAtivo}
            disabled={!podeEditar}
            onCheckedChange={(checklistAtivo) => void run(() => salvarFlagsAtendimento({ checklistAtivo }))}
          />
        </div>
        <div className="mt-4 space-y-4">
          {config.modelos.map((modelo) => (
            <article key={modelo.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{modelo.nome}</p>
                  <p className="text-xs text-muted-foreground">{modelo.funilNome || "Todos os funis"}</p>
                </div>
                {podeEditar ? (
                  <Button type="button" size="icon" variant="ghost" onClick={() => void run(() => excluirChecklist(modelo.id))}><Trash2 className="size-4" /></Button>
                ) : null}
              </div>
              <ul className="mt-2 space-y-1">
                {modelo.itens.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{item.texto}{item.obrigatorio ? " · obrigatório" : ""}</span>
                    {podeEditar ? (
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => void run(() => editarItemChecklist(item.id, { obrigatorio: !item.obrigatorio }))}>
                          {item.obrigatorio ? "Opcional" : "Obrigatório"}
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => void run(() => excluirItemChecklist(item.id))}><Trash2 className="size-4" /></Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              {podeEditar ? (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const texto = itemTexto[modelo.id]?.trim();
                    if (!texto) return;
                    void run(async () => {
                      await criarItemChecklist(modelo.id, { texto });
                      setItemTexto((atual) => ({ ...atual, [modelo.id]: "" }));
                    });
                  }}
                >
                  <Input value={itemTexto[modelo.id] ?? ""} onChange={(event) => setItemTexto((atual) => ({ ...atual, [modelo.id]: event.target.value }))} placeholder="Novo item" />
                  <Button type="submit">Adicionar</Button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
        {podeEditar ? (
          <form
            className="mt-4 grid gap-2 sm:grid-cols-[1fr_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await criarChecklist({ nome: nomeChecklist, funilId: funilId || null });
                setNomeChecklist("");
                setFunilId("");
              });
            }}
          >
            <Input value={nomeChecklist} onChange={(event) => setNomeChecklist(event.target.value)} placeholder="Nome do checklist" />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={funilId} onChange={(event) => setFunilId(event.target.value)}>
              <option value="">Todos os funis</option>
              {config.funis.map((funil) => <option key={funil.id} value={funil.id}>{funil.name}</option>)}
            </select>
            <Button type="submit">Criar checklist</Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  RotateCcw,
  Phone,
  Settings2,
  Trash2,
} from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import { PROSPECCAO_CADASTRO_KEY } from "@/lib/prospeccao";
import { FunilColumnShell } from "@/components/funil-column-shell";

export const Route = createFileRoute("/_app/prospeccao")({
  head: () => ({ meta: [{ title: "Prospecção — Zone Connection" }] }),
  component: ProspeccaoPage,
});

const STORAGE_KEY = "zc-prospeccao-v1";
const PERDIDO = "perdido";

type Etapa = {
  id: string;
  nome: string;
  color: string;
  fecha: boolean;
};

type Prospect = {
  id: string;
  nome: string;
  contato: string;
  stage: string;
  motivo: string;
};

const CORES = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#64748b"];

function etapasPadrao(): Etapa[] {
  return [
    { id: "novo", nome: "Novo", color: "#3b82f6", fecha: false },
    { id: "contato", nome: "Contato", color: "#8b5cf6", fecha: false },
    { id: "proposta", nome: "Proposta", color: "#f59e0b", fecha: false },
    { id: "fechado", nome: "Fechado", color: "#10b981", fecha: true },
  ];
}

function load(): { etapas: Etapa[]; items: Prospect[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { etapas: etapasPadrao(), items: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return { etapas: etapasPadrao(), items: parsed as Prospect[] };
    }
    const data = parsed as { etapas?: Etapa[]; items?: Prospect[] };
    const etapas =
      Array.isArray(data.etapas) && data.etapas.length > 0
        ? data.etapas
        : etapasPadrao();
    return {
      etapas,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return { etapas: etapasPadrao(), items: [] };
  }
}

function ProspeccaoPage() {
  const navigate = useNavigate();
  const [etapas, setEtapas] = useState<Etapa[]>(etapasPadrao);
  const [items, setItems] = useState<Prospect[]>([]);
  const [pronto, setPronto] = useState(false);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [aba, setAba] = useState("funil");
  const [fechado, setFechado] = useState<Prospect | null>(null);
  const [config, setConfig] = useState(false);
  const [novaEtapa, setNovaEtapa] = useState("");
  const [novaCor, setNovaCor] = useState(CORES[0]);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    const data = load();
    setEtapas(data.etapas);
    setItems(data.items);
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ etapas, items }));
  }, [etapas, items, pronto]);

  const ativos = useMemo(
    () => items.filter((item) => item.stage !== PERDIDO),
    [items],
  );
  const perdidos = useMemo(
    () => items.filter((item) => item.stage === PERDIDO),
    [items],
  );

  function etapaFechamento() {
    return (
      etapas.find((etapa) => etapa.fecha) ??
      etapas.find((etapa) => etapa.nome.trim().toLowerCase() === "fechado") ??
      etapas[etapas.length - 1]
    );
  }

  function add() {
    const nomeLimpo = nome.trim();
    const destino = etapaFechamento();
    if (!nomeLimpo || !destino) return;
    const item: Prospect = {
      id: crypto.randomUUID(),
      nome: nomeLimpo,
      contato: contato.trim(),
      stage: destino.id,
      motivo: "",
    };
    const next = [item, ...items];
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ etapas, items: next }));
    setNome("");
    setContato("");
    cadastrar(item);
  }

  function mover(id: string, stage: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stage } : item)),
    );
    const etapa = etapas.find((item) => item.id === stage);
    if (etapa?.fecha) {
      const item = items.find((entry) => entry.id === id);
      if (item) setFechado({ ...item, stage });
    }
    if (stage === PERDIDO) setAba("perdidos");
  }

  function cadastrar(item: Prospect) {
    sessionStorage.setItem(PROSPECCAO_CADASTRO_KEY, item.nome);
    setFechado(null);
    void navigate({ to: "/tenants" });
  }

  function adicionarEtapa() {
    const nomeLimpo = novaEtapa.trim();
    if (!nomeLimpo) return;
    setEtapas((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: nomeLimpo,
        color: novaCor,
        fecha: false,
      },
    ]);
    setNovaEtapa("");
  }

  function atualizarEtapa(id: string, patch: Partial<Etapa>) {
    setEtapas((prev) =>
      prev.map((etapa) => {
        if (patch.fecha && etapa.id !== id) return { ...etapa, fecha: false };
        return etapa.id === id ? { ...etapa, ...patch } : etapa;
      }),
    );
  }

  function removerEtapa(id: string) {
    setEtapas((prev) => {
      const next = prev.filter((etapa) => etapa.id !== id);
      const destino = next[0]?.id;
      if (destino) {
        setItems((cards) =>
          cards.map((card) =>
            card.stage === id ? { ...card, stage: destino } : card,
          ),
        );
      }
      return next;
    });
  }

  function moverEtapa(id: string, dir: -1 | 1) {
    setEtapas((prev) => {
      const index = prev.findIndex((etapa) => etapa.id === id);
      const alvo = index + dir;
      if (index < 0 || alvo < 0 || alvo >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(alvo, 0, item);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Prospecção"
        description="A imobiliária criada aqui entra em Fechado e abre o cadastro do cliente. Arraste os demais cards entre as etapas. Perda vai para a aba Perdidos."
        actions={
          <Button type="button" variant="outline" onClick={() => setConfig(true)}>
            <Settings2 className="mr-1 h-4 w-4" />
            Configurar funil
          </Button>
        }
      />

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="funil">Funil ({ativos.length})</TabsTrigger>
          <TabsTrigger value="perdidos">Perdidos ({perdidos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="funil" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Imobiliária ou contato"
                className="w-64"
              />
            </div>
            <div className="space-y-1">
              <Label>Contato</Label>
              <Input
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="Telefone ou e-mail"
                className="w-56"
              />
            </div>
            <Button type="button" onClick={add}>
              <Plus className="mr-1 h-4 w-4" />
              Cadastrar imobiliária
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {etapas.map((col) => (
              <FunilColumnShell
                key={col.id}
                title={col.nome}
                count={ativos.filter((item) => item.stage === col.id).length}
                color={col.color}
                data-drop-active={over === col.id ? "" : undefined}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(col.id);
                }}
                onDragLeave={() =>
                  setOver((current) => (current === col.id ? null : current))
                }
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  setOver(null);
                  if (id) mover(id, col.id);
                }}
              >
                {ativos
                  .filter((item) => item.stage === col.id)
                  .map((item) => (
                    <Card
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", item.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab space-y-2 rounded-xl border-black/5 bg-white p-3 shadow-sm active:cursor-grabbing dark:bg-card"
                    >
                      <p className="text-sm font-medium leading-snug">{item.nome}</p>
                      <div className="grid grid-cols-[14px_minmax(0,1fr)_22px] items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{item.contato || "—"}</span>
                        <button
                          type="button"
                          title="Abrir WhatsApp"
                          aria-label="Abrir WhatsApp"
                          disabled={item.contato.replace(/\D/g, "").length < 10}
                          className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[#25D366] hover:bg-[#25D366]/15 disabled:pointer-events-none disabled:opacity-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            const digits = item.contato.replace(/\D/g, "");
                            if (digits.length < 10) return;
                            const e164 = digits.startsWith("55") ? digits : `55${digits}`;
                            window.open(
                              getWhatsAppUrl(undefined, e164),
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {col.fecha ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => cadastrar(item)}
                          >
                            Cadastrar cliente
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-destructive"
                          onClick={() => mover(item.id, PERDIDO)}
                        >
                          Perda
                        </Button>
                      </div>
                    </Card>
                  ))}
              </FunilColumnShell>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="perdidos" className="mt-4 space-y-2">
          {perdidos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma perda.
            </p>
          ) : (
            perdidos.map((item) => (
              <Card
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border-black/5 p-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium">{item.nome}</p>
                  {item.contato ? (
                    <p className="text-xs text-muted-foreground">{item.contato}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => mover(item.id, etapas[0]?.id ?? "novo")}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Voltar ao funil
                </Button>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {fechado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md space-y-3 p-5">
            <p className="text-base font-semibold">Cliente fechado</p>
            <p className="text-sm text-muted-foreground">
              {fechado.nome} chegou na etapa de fechamento. Cadastre agora na lista de clientes.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFechado(null)}>
                Depois
              </Button>
              <Button type="button" onClick={() => cadastrar(fechado)}>
                Cadastrar cliente
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <Dialog open={config} onOpenChange={setConfig}>
        <DialogContent className="gap-0 overflow-hidden border-0 p-0 shadow-2xl outline-none ring-0 focus:outline-none focus-visible:ring-0 sm:max-w-lg sm:rounded-2xl">
          <DialogHeader className="space-y-1 px-5 pb-2 pt-5 text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Etapas do funil
            </DialogTitle>
            <DialogDescription>
              Configure as etapas do seu funil de prospecção.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[52vh] space-y-2.5 overflow-y-auto px-5 py-3">
            {etapas.map((etapa, index) => (
              <div
                key={etapa.id}
                className="flex items-center gap-2 rounded-xl border border-black/5 px-2 py-2"
                style={{ background: `${etapa.color}14` }}
              >
                <span
                  className="h-10 w-1 shrink-0 rounded-full"
                  style={{ background: etapa.color }}
                />
                <label className="relative flex h-9 w-7 shrink-0 cursor-pointer items-center justify-center text-muted-foreground">
                  <GripVertical className="h-4 w-4" style={{ color: etapa.color }} />
                  <input
                    type="color"
                    aria-label={`Cor de ${etapa.nome}`}
                    value={etapa.color}
                    onChange={(e) => atualizarEtapa(etapa.id, { color: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <Input
                  value={etapa.nome}
                  onChange={(e) => atualizarEtapa(etapa.id, { nome: e.target.value })}
                  className="h-9 bg-white dark:bg-background"
                />
                <span className="shrink-0 text-xs text-muted-foreground">Fechamento</span>
                <Switch
                  checked={etapa.fecha}
                  onCheckedChange={(checked) => atualizarEtapa(etapa.id, { fecha: checked })}
                  aria-label={`Fechamento de ${etapa.nome}`}
                />
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    className="text-muted-foreground disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moverEtapa(etapa.id, -1)}
                    aria-label="Subir"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground disabled:opacity-30"
                    disabled={index === etapas.length - 1}
                    onClick={() => moverEtapa(etapa.id, 1)}
                    aria-label="Descer"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white text-muted-foreground hover:text-destructive disabled:opacity-30 dark:bg-background"
                  disabled={etapas.length <= 1}
                  onClick={() => removerEtapa(etapa.id)}
                  aria-label="Excluir etapa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t px-5 py-4">
            <p className="text-sm font-semibold">Nova etapa</p>
            <Input
              value={novaEtapa}
              onChange={(e) => setNovaEtapa(e.target.value)}
              placeholder="Nome da nova etapa"
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionarEtapa();
              }}
            />
            <div className="flex justify-center gap-3 py-1">
              {CORES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  aria-label={cor}
                  className="h-6 w-6 rounded-full"
                  style={{
                    background: cor,
                    boxShadow:
                      novaCor === cor ? `0 0 0 2px white, 0 0 0 4px ${cor}` : undefined,
                  }}
                  onClick={() => setNovaCor(cor)}
                />
              ))}
            </div>
            <Button type="button" className="h-10 w-full" onClick={adicionarEtapa}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar etapa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

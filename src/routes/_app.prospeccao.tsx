import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
} from "lucide-react";
import { PROSPECCAO_CADASTRO_KEY } from "@/lib/prospeccao";

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

  function add() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo || etapas.length === 0) return;
    setItems((prev) => [
      {
        id: crypto.randomUUID(),
        nome: nomeLimpo,
        contato: contato.trim(),
        stage: etapas[0].id,
        motivo: "",
      },
      ...prev,
    ]);
    setNome("");
    setContato("");
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
        description="Arraste os cards entre as etapas. A etapa marcada como fechamento abre o cadastro do cliente. Perda vai para a aba Perdidos."
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
              Adicionar
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {etapas.map((col) => (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(col.id);
                }}
                onDragLeave={() => setOver((current) => (current === col.id ? null : current))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  setOver(null);
                  if (id) mover(id, col.id);
                }}
                className="w-72 shrink-0 rounded-xl bg-muted/40 p-2"
                style={{
                  boxShadow:
                    over === col.id ? `inset 0 0 0 2px ${col.color}` : undefined,
                }}
              >
                <p className="mb-2 flex items-center gap-2 px-1 text-sm font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: col.color }}
                  />
                  {col.nome}
                  <span className="text-muted-foreground">
                    {ativos.filter((item) => item.stage === col.id).length}
                  </span>
                </p>
                <div className="space-y-2">
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
                        className="cursor-grab space-y-2 rounded-xl border-black/5 p-3 shadow-sm active:cursor-grabbing"
                        style={{ borderTop: `3px solid ${col.color}` }}
                      >
                        <p className="text-sm font-medium leading-snug">{item.nome}</p>
                        {item.contato ? (
                          <p className="text-xs text-muted-foreground">{item.contato}</p>
                        ) : null}
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
                </div>
              </div>
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

      {config ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto p-5">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">Etapas do funil</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfig(false)}>
                Fechar
              </Button>
            </div>
            <div className="space-y-2">
              {etapas.map((etapa, index) => (
                <div key={etapa.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                  <input
                    type="color"
                    aria-label={`Cor de ${etapa.nome}`}
                    value={etapa.color}
                    onChange={(e) => atualizarEtapa(etapa.id, { color: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded border bg-transparent"
                  />
                  <Input
                    value={etapa.nome}
                    onChange={(e) => atualizarEtapa(etapa.id, { nome: e.target.value })}
                    className="h-8 min-w-32 flex-1"
                  />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={etapa.fecha}
                      onChange={(e) => atualizarEtapa(etapa.id, { fecha: e.target.checked })}
                    />
                    Fechamento
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={index === 0}
                    onClick={() => moverEtapa(etapa.id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={index === etapas.length - 1}
                    onClick={() => moverEtapa(etapa.id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    disabled={etapas.length <= 1}
                    onClick={() => removerEtapa(etapa.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label>Nova etapa</Label>
                <Input
                  value={novaEtapa}
                  onChange={(e) => setNovaEtapa(e.target.value)}
                  placeholder="Nome da etapa"
                  className="w-48"
                />
              </div>
              <input
                type="color"
                aria-label="Cor da nova etapa"
                value={novaCor}
                onChange={(e) => setNovaCor(e.target.value)}
                className="h-9 w-10 cursor-pointer rounded border bg-transparent"
              />
              <Button type="button" onClick={adicionarEtapa}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar etapa
              </Button>
            </div>
            <div className="flex gap-1">
              {CORES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  aria-label={cor}
                  className="h-6 w-6 rounded-full border"
                  style={{ background: cor }}
                  onClick={() => setNovaCor(cor)}
                />
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

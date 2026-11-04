import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RotateCcw } from "lucide-react";
import { PROSPECCAO_CADASTRO_KEY } from "@/lib/prospeccao";

export const Route = createFileRoute("/_app/prospeccao")({
  head: () => ({ meta: [{ title: "Prospecção — Zone Connection" }] }),
  component: ProspeccaoPage,
});

const STORAGE_KEY = "zc-prospeccao-v1";

type StageId = "novo" | "contato" | "proposta" | "fechado" | "perdido";

type Prospect = {
  id: string;
  nome: string;
  contato: string;
  stage: StageId;
  motivo: string;
};

const FUNIL: { id: Exclude<StageId, "perdido">; label: string }[] = [
  { id: "novo", label: "Novo" },
  { id: "contato", label: "Contato" },
  { id: "proposta", label: "Proposta" },
  { id: "fechado", label: "Fechado" },
];

function load(): Prospect[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Prospect[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ProspeccaoPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Prospect[]>([]);
  const [pronto, setPronto] = useState(false);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [aba, setAba] = useState("funil");
  const [fechado, setFechado] = useState<Prospect | null>(null);

  useEffect(() => {
    setItems(load());
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, pronto]);

  const ativos = useMemo(
    () => items.filter((item) => item.stage !== "perdido"),
    [items],
  );
  const perdidos = useMemo(
    () => items.filter((item) => item.stage === "perdido"),
    [items],
  );

  function add() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    setItems((prev) => [
      {
        id: crypto.randomUUID(),
        nome: nomeLimpo,
        contato: contato.trim(),
        stage: "novo",
        motivo: "",
      },
      ...prev,
    ]);
    setNome("");
    setContato("");
  }

  function mover(id: string, stage: StageId) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stage } : item)),
    );
    if (stage === "fechado") {
      const item = items.find((entry) => entry.id === id);
      if (item) setFechado({ ...item, stage: "fechado" });
    }
    if (stage === "perdido") setAba("perdidos");
  }

  function cadastrar(item: Prospect) {
    sessionStorage.setItem(PROSPECCAO_CADASTRO_KEY, item.nome);
    setFechado(null);
    void navigate({ to: "/tenants" });
  }

  return (
    <div>
      <PageHeader
        title="Prospecção"
        description="Funil simples. Ao fechar, abre o cadastro do cliente. Perda vai para a aba Perdidos."
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

          <div className="grid gap-3 md:grid-cols-4">
            {FUNIL.map((col) => (
              <div key={col.id} className="rounded-xl bg-muted/40 p-2">
                <p className="mb-2 px-1 text-sm font-medium">
                  {col.label}
                  <span className="ml-1 text-muted-foreground">
                    {ativos.filter((item) => item.stage === col.id).length}
                  </span>
                </p>
                <div className="space-y-2">
                  {ativos
                    .filter((item) => item.stage === col.id)
                    .map((item) => {
                      const index = FUNIL.findIndex((stage) => stage.id === item.stage);
                      const next = FUNIL[index + 1];
                      return (
                        <Card
                          key={item.id}
                          className="space-y-2 rounded-xl border-black/5 p-3 shadow-sm"
                        >
                          <p className="text-sm font-medium leading-snug">{item.nome}</p>
                          {item.contato ? (
                            <p className="text-xs text-muted-foreground">{item.contato}</p>
                          ) : null}
                          <div className="flex flex-wrap gap-1">
                            {next ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => mover(item.id, next.id)}
                              >
                                {next.label}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => cadastrar(item)}
                              >
                                Cadastrar cliente
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() => mover(item.id, "perdido")}
                            >
                              Perda
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
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
                  onClick={() => mover(item.id, "novo")}
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
              {fechado.nome} chegou em Fechado. Cadastre agora na lista de clientes.
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
    </div>
  );
}

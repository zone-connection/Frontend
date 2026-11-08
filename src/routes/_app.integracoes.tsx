import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiFetch } from "@/lib/api";
import { fetchTenants, type Tenant } from "@/lib/tenants-api";

export const Route = createFileRoute("/_app/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — Zone Connection" }] }),
  component: IntegracoesPage,
});

const ESCOPOS = [
  "properties:read",
  "leads:read",
  "leads:write",
  "leads:update",
  "funnels:read",
  "funnels:write",
  "calls:write",
  "webhooks:manage",
] as const;

const EVENTOS = [
  "lead.created",
  "lead.updated",
  "lead.stage_changed",
  "property.available",
  "property.unavailable",
  "property.updated",
] as const;

type Autorizacao = {
  id: string;
  tenantId: string;
  scopes: string[];
  status: string;
  tenant: { name: string; slug: string };
};

type Webhook = {
  id: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  createdAt: string;
};

type Aplicacao = {
  id: string;
  nome: string;
  descricao: string;
  status: string;
  clientId: string;
  createdAt: string;
  autorizacoes: Autorizacao[];
  webhooks: Webhook[];
};

function mensagem(erro: unknown) {
  if (erro instanceof ApiError) return erro.message;
  return "Não foi possível concluir.";
}

function IntegracoesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apps, setApps] = useState<Aplicacao[]>([]);
  const [erro, setErro] = useState("");
  const [segredo, setSegredo] = useState("");
  const [nome, setNome] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [scopes, setScopes] = useState<string[]>(["leads:read", "webhooks:manage"]);
  const [escolhida, setEscolhida] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["lead.created"]);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    const [lista, aplicacoes] = await Promise.all([
      fetchTenants(),
      apiFetch<Aplicacao[]>("/v1/aplicacoes"),
    ]);
    const imobiliarias = Array.isArray(lista) ? lista : [];
    const cadastradas = (Array.isArray(aplicacoes) ? aplicacoes : []).filter(
      (item) => item.status === "ativa",
    );
    setTenants(imobiliarias);
    setApps(cadastradas);
    setTenantId((atual) => atual || imobiliarias[0]?.id || "");
    setEscolhida((atual) =>
      cadastradas.some((item) => item.id === atual) ? atual : cadastradas[0]?.id ?? "",
    );
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagem(e)));
  }, []);

  const app = apps.find((item) => item.id === escolhida) ?? null;

  function alternar(lista: string[], valor: string, marcar: boolean) {
    return marcar ? [...lista, valor] : lista.filter((item) => item !== valor);
  }

  async function criarApp() {
    setEnviando(true);
    setErro("");
    setSegredo("");
    try {
      const criada = await apiFetch<Aplicacao & { clientSecret: string }>(
        "/v1/aplicacoes",
        { method: "POST", body: { nome, tenantId, scopes } },
      );
      setSegredo(criada.clientSecret);
      setNome("");
      await carregar();
      setEscolhida(criada.id);
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  async function criarWebhook() {
    if (!app) return;
    setEnviando(true);
    setErro("");
    setSegredo("");
    try {
      const destino = await apiFetch<{ secret: string }>(
        `/v1/aplicacoes/${app.id}/webhooks`,
        { method: "POST", body: { url, events } },
      );
      setSegredo(destino.secret);
      await carregar();
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  async function rotacionarApp() {
    if (!app) return;
    setEnviando(true);
    setErro("");
    try {
      const giro = await apiFetch<{ clientSecret: string }>(
        `/v1/aplicacoes/${app.id}/rotacionar`,
        { method: "POST" },
      );
      setSegredo(giro.clientSecret);
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  async function revogarApp() {
    if (!app) return;
    setEnviando(true);
    setErro("");
    try {
      await apiFetch(`/v1/aplicacoes/${app.id}/revogar`, { method: "POST" });
      await carregar();
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  async function desativarWebhook(id: string) {
    if (!app) return;
    setEnviando(true);
    setErro("");
    try {
      await apiFetch(`/v1/aplicacoes/${app.id}/webhooks/${id}`, { method: "DELETE" });
      await carregar();
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  async function rotacionarWebhook(id: string) {
    if (!app) return;
    setEnviando(true);
    setErro("");
    try {
      const giro = await apiFetch<{ secret: string }>(
        `/v1/aplicacoes/${app.id}/webhooks/${id}/rotate-secret`,
        { method: "POST" },
      );
      setSegredo(giro.secret);
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <PageHeader
        title="Integrações"
        description="Crie o acesso do sistema parceiro e entregue o Client ID e o segredo. Eles se conectam na API. Revogar tira o acesso e some desta lista."
        actions={
          <a
            href="/docs/api"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#079ED4] px-3 py-2 text-sm font-medium text-white"
          >
            Documentação do parceiro
          </a>
        }
      />
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
      {segredo ? (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium">Segredo exibido uma única vez</p>
          <Input readOnly value={segredo} />
          <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(segredo)}>
            Copiar
          </Button>
        </Card>
      ) : null}

      <Card className="space-y-4 p-4">
        <h2 className="text-base font-semibold">Nova aplicação</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Imobiliária</Label>
            <select
              className="h-9 w-full rounded-lg border border-[#E2E8EC] bg-white px-3 text-[13px] font-medium text-[#16324A]"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {ESCOPOS.map((escopo) => (
            <label key={escopo} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scopes.includes(escopo)}
                onChange={(e) => setScopes(alternar(scopes, escopo, e.target.checked))}
              />
              {escopo}
            </label>
          ))}
        </div>
        <Button type="button" disabled={enviando || nome.trim().length < 2 || !tenantId} onClick={criarApp}>
          Criar aplicação
        </Button>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Label>Aplicação</Label>
            <Select value={escolhida} onValueChange={setEscolhida}>
              <SelectTrigger className="min-w-72">
                <SelectValue placeholder="Escolha a aplicação" />
              </SelectTrigger>
              <SelectContent className="bg-white text-[#16324A]">
                {apps.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome} · {item.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {app ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={enviando || app.status !== "ativa"} onClick={rotacionarApp}>
                Rotacionar credencial
              </Button>
              <Button type="button" variant="outline" disabled={enviando || app.status !== "ativa"} onClick={revogarApp}>
                Revogar
              </Button>
            </div>
          ) : null}
        </div>
        {app ? (
          <div className="space-y-2 text-sm">
            <p>Client ID: {app.clientId}</p>
            {app.autorizacoes.map((aut) => (
              <p key={aut.id}>
                {aut.tenant.name} ({aut.tenant.slug}) · {aut.status} · {aut.scopes.join(", ")}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma aplicação cadastrada.</p>
        )}
      </Card>

      {app?.status === "ativa" ? (
        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold">Webhook</h2>
          <div className="space-y-2">
            <Label htmlFor="url">URL HTTPS do sistema parceiro</Label>
            <Input
              id="url"
              placeholder="https://sistema-do-parceiro.com/webhooks/zone"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {EVENTOS.map((evento) => (
              <label key={evento} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={events.includes(evento)}
                  onChange={(e) => setEvents(alternar(events, evento, e.target.checked))}
                />
                {evento}
              </label>
            ))}
          </div>
          <Button type="button" disabled={enviando || events.length === 0} onClick={criarWebhook}>
            Cadastrar destino
          </Button>
          <div className="space-y-3">
            {app.webhooks.map((destino) => (
              <div key={destino.id} className="rounded-md border p-3 text-sm">
                <p>{destino.url}</p>
                <p>{destino.eventos.join(", ")}</p>
                <p>{destino.ativo ? "Ativo" : "Desativado"}</p>
                {destino.ativo ? (
                  <div className="mt-2 flex gap-2">
                    <Button type="button" variant="outline" disabled={enviando} onClick={() => rotacionarWebhook(destino.id)}>
                      Rotacionar segredo
                    </Button>
                    <Button type="button" variant="outline" disabled={enviando} onClick={() => desativarWebhook(destino.id)}>
                      Desativar
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

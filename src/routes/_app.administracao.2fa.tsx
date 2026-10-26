import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_app/administracao/2fa")({
  head: () => ({ meta: [{ title: "Autenticação 2FA — Zone Connection" }] }),
  component: Painel2faPage,
});

type Estado = "pendente" | "ativo" | "desativado" | "nao_aplica";

type Painel = {
  totais: { usuarios: number; ativo: number; desativado: number; pendente: number };
  imobiliarias: { id: string; name: string }[];
  usuarios: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantName: string;
    estado: Estado;
    decidedAt: string | null;
    changedAt: string | null;
    riskTermsVersion: string | null;
    riskAcceptedAt: string | null;
  }[];
};

type Historico = {
  usuario: { name: string; email: string; tenantName: string };
  eventos: { id: string; acao: string; termsVersion: string | null; createdAt: string }[];
};

const ESTADO_LABEL: Record<string, string> = {
  ativo: "2FA ativo",
  desativado: "2FA desativado",
  pendente: "Decisão pendente",
};

function quando(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function Painel2faPage() {
  const [estado, setEstado] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Painel | null>(null);
  const [historico, setHistorico] = useState<Historico | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (tenantId) params.set("tenantId", tenantId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    void apiFetch<Painel>(`/seguranca/2fa/painel${query ? `?${query}` : ""}`).then(
      setData,
    );
  }, [estado, tenantId, from, to]);

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <PageHeader
        eyebrow="Segurança"
        title="Autenticação 2FA"
        description="Estado atual de cada administrador e o histórico de alterações. Os totais consideram todas as imobiliárias."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Total de usuários", data?.totais.usuarios],
          ["2FA ativo", data?.totais.ativo],
          ["2FA desativado", data?.totais.desativado],
          ["Decisão pendente", data?.totais.pendente],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "ativo", "desativado", "pendente"].map((item) => (
          <button
            key={item || "todos"}
            type="button"
            onClick={() => setEstado(item)}
            className={`rounded-full border px-3 py-1 text-sm ${estado === item ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {item ? ESTADO_LABEL[item] : "Todos"}
          </button>
        ))}
        <select
          className="rounded-lg border bg-card px-2 py-1 text-sm"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        >
          <option value="">Todas as imobiliárias</option>
          {data?.imobiliarias.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded-lg border bg-card px-2 py-1 text-sm"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <input
          type="date"
          className="rounded-lg border bg-card px-2 py-1 text-sm"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Decisão inicial</th>
              <th className="px-4 py-3">Última alteração</th>
              <th className="px-4 py-3">Aceite de risco</th>
            </tr>
          </thead>
          <tbody>
            {data?.usuarios.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => {
                      void apiFetch<Historico>(
                        `/seguranca/2fa/usuarios/${user.id}/historico`,
                      ).then(setHistorico);
                    }}
                  >
                    {user.name}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    {user.email} · Administrador · {user.tenantName}
                  </div>
                </td>
                <td className="px-4 py-3">{ESTADO_LABEL[user.estado] ?? user.estado}</td>
                <td className="px-4 py-3">{quando(user.decidedAt)}</td>
                <td className="px-4 py-3">{quando(user.changedAt)}</td>
                <td className="px-4 py-3">
                  {user.riskTermsVersion
                    ? `${user.riskTermsVersion} · ${quando(user.riskAcceptedAt)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historico ? (
        <section className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">
            Histórico de {historico.usuario.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {historico.usuario.email} · {historico.usuario.tenantName}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {historico.eventos.map((evento) => (
              <li key={evento.id} className="rounded-lg bg-muted px-3 py-2">
                {evento.acao.replaceAll("_", " ")} · {quando(evento.createdAt)}
                {evento.termsVersion ? ` · termo ${evento.termsVersion}` : ""}
              </li>
            ))}
            {historico.eventos.length === 0 ? (
              <li className="text-muted-foreground">Nenhuma decisão registrada.</li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BedDouble, Loader2, MapPin, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { CAPTACAO_IMOVEL_TIPO_LABEL } from "@/lib/captacao-api";
import { brl } from "@/lib/crm-types";
import {
  enviarPropostaPublica,
  type PropostaPublicaResumo,
} from "@/lib/proposta-publica-api";
import { toast } from "sonner";

function toInt(value: string) {
  const n = Number(value.replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toIntList(value: string) {
  return value
    .split(/[,\s;]+/)
    .map((item) => Number(item.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.round(n));
}

function areaLabel(area: number | string | null) {
  if (area == null || area === "") return null;
  const n = Number(area);
  if (!Number.isFinite(n)) return String(area);
  return `${n.toLocaleString("pt-BR")} m²`;
}

export function PublicoPropostaView({ item }: { item: PropostaPublicaResumo }) {
  const navigate = useNavigate();
  const accent = item.tenant.cor || "#1d4ed8";
  const foto = item.imovel.fotos[0] ?? null;
  const tipo =
    CAPTACAO_IMOVEL_TIPO_LABEL[
      item.imovel.tipo as keyof typeof CAPTACAO_IMOVEL_TIPO_LABEL
    ] ?? item.imovel.tipo;

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clienteNome: "",
    clienteTelefone: "",
    clienteEmail: "",
    clienteCpf: "",
    valor: "",
    entrada: "",
    apartado: "",
    preChaves: "",
    posChaves: "",
    intercaladas: "",
    fgts: "",
    moraBem: "",
    mcmv: "",
    parcelaCaixa: "",
    financiamento: "",
    desconto: "",
    validade: "",
    observacao: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const meta = useMemo(
    () =>
      [
        tipo,
        areaLabel(item.imovel.area),
        item.imovel.quartos ? `${item.imovel.quartos} quartos` : null,
      ].filter(Boolean),
    [item, tipo],
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const valor = toInt(form.valor);
    if (!form.clienteNome.trim() || valor <= 0) {
      toast.error("Informe o nome e o valor da proposta.");
      return;
    }
    setSaving(true);
    try {
      const result = await enviarPropostaPublica(item.token, {
        clienteNome: form.clienteNome.trim(),
        clienteTelefone: form.clienteTelefone.trim() || null,
        clienteEmail: form.clienteEmail.trim() || null,
        clienteCpf: form.clienteCpf.trim() || null,
        valor,
        entrada: form.entrada ? toInt(form.entrada) : null,
        apartado: form.apartado ? toInt(form.apartado) : null,
        preChaves: toIntList(form.preChaves),
        posChaves: toIntList(form.posChaves),
        intercaladas: toIntList(form.intercaladas),
        fgts: form.fgts ? toInt(form.fgts) : null,
        moraBem: form.moraBem ? toInt(form.moraBem) : null,
        mcmv: form.mcmv ? toInt(form.mcmv) : null,
        parcelaCaixa: form.parcelaCaixa
          ? Number(form.parcelaCaixa.replace(",", "."))
          : null,
        financiamento: form.financiamento ? toInt(form.financiamento) : null,
        desconto: form.desconto ? toInt(form.desconto) : null,
        validade: form.validade || null,
        observacao: form.observacao.trim() || null,
      });
      const path = result.reciboUrl.includes("/publico/")
        ? result.reciboUrl.slice(result.reciboUrl.indexOf("/publico/"))
        : result.reciboUrl;
      const token = path.split("/").pop() ?? "";
      toast.success(`Proposta ${result.codigo} enviada.`);
      await navigate({
        to: "/publico/proposta/recibo/$compradorToken",
        params: { compradorToken: token },
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível enviar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          {item.tenant.logoUrl ? (
            <img
              src={item.tenant.logoUrl}
              alt=""
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span className="text-sm font-semibold" style={{ color: accent }}>
              {item.tenant.nome}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.tenant.nome}</p>
            <p className="text-xs text-slate-500">Proposta comercial</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_1.1fr]">
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {foto ? (
            <img
              src={foto}
              alt=""
              className="h-56 w-full object-cover"
            />
          ) : (
            <div
              className="flex h-56 items-center justify-center text-white"
              style={{ background: accent }}
            >
              <MapPin className="h-10 w-10 opacity-80" />
            </div>
          )}
          <div className="space-y-3 p-5">
            <h1 className="text-xl font-semibold tracking-tight">
              {item.imovel.rotulo}
            </h1>
            <p className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {[item.imovel.logradouro, item.imovel.numero, item.imovel.bairro]
                .filter(Boolean)
                .join(", ")}
              {item.imovel.cidade
                ? ` — ${item.imovel.cidade}/${item.imovel.estado}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {meta.map((linha) => (
                <span
                  key={linha}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium"
                >
                  {linha?.includes("m²") ? (
                    <Ruler className="h-3 w-3" />
                  ) : linha?.includes("quarto") ? (
                    <BedDouble className="h-3 w-3" />
                  ) : null}
                  {linha}
                </span>
              ))}
            </div>
            {item.imovel.descricao ? (
              <p className="text-sm leading-relaxed text-slate-600">
                {item.imovel.descricao}
              </p>
            ) : null}
            <p className="text-xs text-slate-500">
              Corretor: {item.corretor.nome}
            </p>
          </div>
        </section>

        <form
          onSubmit={(event) => void onSubmit(event)}
          className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold">Sua proposta</h2>
            <p className="text-sm text-slate-500">
              Preencha os dados. O proprietário recebe no portal e o aceite só
              acontece lá.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" required>
              <Input
                value={form.clienteNome}
                onChange={(e) => set("clienteNome", e.target.value)}
                required
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={form.clienteTelefone}
                onChange={(e) => set("clienteTelefone", e.target.value)}
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={form.clienteEmail}
                onChange={(e) => set("clienteEmail", e.target.value)}
              />
            </Field>
            <Field label="CPF">
              <Input
                value={form.clienteCpf}
                onChange={(e) => set("clienteCpf", e.target.value)}
              />
            </Field>
            <Field label="Valor da proposta" required>
              <Input
                inputMode="numeric"
                value={form.valor}
                onChange={(e) => set("valor", e.target.value)}
                placeholder="R$"
              />
            </Field>
            <Field label="Sinal / entrada">
              <Input
                inputMode="numeric"
                value={form.entrada}
                onChange={(e) => set("entrada", e.target.value)}
              />
            </Field>
            <Field label="Apartado">
              <Input
                inputMode="numeric"
                value={form.apartado}
                onChange={(e) => set("apartado", e.target.value)}
              />
            </Field>
            <Field label="FGTS">
              <Input
                inputMode="numeric"
                value={form.fgts}
                onChange={(e) => set("fgts", e.target.value)}
              />
            </Field>
            <Field label="Mora Bem">
              <Input
                inputMode="numeric"
                value={form.moraBem}
                onChange={(e) => set("moraBem", e.target.value)}
              />
            </Field>
            <Field label="MCMV">
              <Input
                inputMode="numeric"
                value={form.mcmv}
                onChange={(e) => set("mcmv", e.target.value)}
              />
            </Field>
            <Field label="Parcela Caixa">
              <Input
                inputMode="decimal"
                value={form.parcelaCaixa}
                onChange={(e) => set("parcelaCaixa", e.target.value)}
              />
            </Field>
            <Field label="Financiamento">
              <Input
                inputMode="numeric"
                value={form.financiamento}
                onChange={(e) => set("financiamento", e.target.value)}
              />
            </Field>
            <Field label="Desconto">
              <Input
                inputMode="numeric"
                value={form.desconto}
                onChange={(e) => set("desconto", e.target.value)}
              />
            </Field>
            <Field label="Validade">
              <Input
                type="date"
                value={form.validade}
                onChange={(e) => set("validade", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Pré-chaves (valores separados por vírgula)">
            <Input
              value={form.preChaves}
              onChange={(e) => set("preChaves", e.target.value)}
            />
          </Field>
          <Field label="Pós-chaves">
            <Input
              value={form.posChaves}
              onChange={(e) => set("posChaves", e.target.value)}
            />
          </Field>
          <Field label="Intercaladas">
            <Input
              value={form.intercaladas}
              onChange={(e) => set("intercaladas", e.target.value)}
            />
          </Field>
          <Field label="Observação">
            <Textarea
              value={form.observacao}
              onChange={(e) => set("observacao", e.target.value)}
              rows={3}
            />
          </Field>
          {form.valor ? (
            <p className="text-sm text-slate-500">
              Valor informado:{" "}
              <strong className="text-slate-900">{brl(toInt(form.valor))}</strong>
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={saving}
            className="w-full"
            style={{ backgroundColor: accent }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar proposta
          </Button>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </label>
  );
}

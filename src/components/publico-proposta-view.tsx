import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bath,
  BedDouble,
  Building2,
  Car,
  Loader2,
  MapPin,
  Phone,
  Ruler,
  UserRound,
} from "lucide-react";
import marcaZone from "@/assets/marca-zone.png";
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

  const fatos = useMemo(
    () =>
      [
        tipo ? { icon: Building2, label: tipo } : null,
        areaLabel(item.imovel.area)
          ? { icon: Ruler, label: areaLabel(item.imovel.area)! }
          : null,
        item.imovel.quartos
          ? { icon: BedDouble, label: `${item.imovel.quartos} quartos` }
          : null,
        item.imovel.suites
          ? { icon: BedDouble, label: `${item.imovel.suites} suítes` }
          : null,
        item.imovel.banheiros
          ? { icon: Bath, label: `${item.imovel.banheiros} banheiros` }
          : null,
        item.imovel.vagas
          ? { icon: Car, label: `${item.imovel.vagas} vagas` }
          : null,
      ].filter((item): item is { icon: typeof Building2; label: string } => item != null),
    [item, tipo],
  );
  const endereco = [
    [item.imovel.logradouro, item.imovel.numero].filter(Boolean).join(", "),
    item.imovel.complemento,
    item.imovel.bairro,
    [item.imovel.cidade, item.imovel.estado].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" · ");

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

  const campo =
    "h-10 rounded-lg! border-[#E2E8EC] bg-white text-[#0B3148] shadow-none placeholder:text-[#8B98A3] focus-visible:border-[#079ED4] focus-visible:ring-[#D3EBF5]";

  return (
    <div className="min-h-screen bg-[#F4F7F8] text-[#0B3148]">
      <header className="border-b border-[#E2E8EC] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <img src={marcaZone} alt="" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-sm font-semibold leading-tight">
                Zone <span className="text-[#079ED4]">Connection</span>
              </p>
              <p className="text-[11px] text-[#5C6B76]">Proposta comercial</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {item.tenant.logoUrl ? (
              <img
                src={item.tenant.logoUrl}
                alt=""
                className="h-8 w-auto max-w-28 object-contain"
              />
            ) : null}
            <p className="truncate text-sm font-medium text-[#16324A]">
              {item.tenant.nome}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_1.1fr]">
        <section className="overflow-hidden rounded-2xl border border-[#E2E8EC] bg-white shadow-sm">
          {foto ? (
            <img src={foto} alt="" className="h-64 w-full object-cover" />
          ) : (
            <div className="flex h-64 items-center justify-center bg-[#079ED4] text-white">
              <MapPin className="h-10 w-10 opacity-80" />
            </div>
          )}
          <div className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#079ED4]">
                Imóvel
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                {item.imovel.rotulo}
              </h1>
            </div>
            {endereco ? (
              <p className="flex items-start gap-2 text-sm text-[#5C6B76]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#079ED4]" />
                {endereco}
              </p>
            ) : null}
            {fatos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {fatos.map((fato) => (
                  <div
                    key={fato.label}
                    className="flex items-center gap-2 rounded-xl bg-[#F3FAFD] px-3 py-2 text-sm text-[#0B3148]"
                  >
                    <fato.icon className="size-4 shrink-0 text-[#079ED4]" />
                    {fato.label}
                  </div>
                ))}
              </div>
            ) : null}
            {item.imovel.descricao ? (
              <p className="text-sm leading-relaxed text-[#5C6B76]">
                {item.imovel.descricao}
              </p>
            ) : null}
            <div className="rounded-xl border border-[#E2E8EC] bg-[#F8FBFC] px-3 py-2.5 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <UserRound className="size-4 text-[#079ED4]" />
                {item.corretor.nome}
              </p>
              {item.corretor.telefone ? (
                <a
                  href={`tel:${item.corretor.telefone}`}
                  className="mt-1 flex items-center gap-2 text-[#05749E]"
                >
                  <Phone className="size-3.5" />
                  {item.corretor.telefone}
                </a>
              ) : (
                <p className="mt-1 text-xs text-[#5C6B76]">Corretor responsável</p>
              )}
            </div>
          </div>
        </section>

        <form
          onSubmit={(event) => void onSubmit(event)}
          className="space-y-4 rounded-2xl border border-[#E2E8EC] bg-white p-5 shadow-sm"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#079ED4]">
              Sua proposta
            </p>
            <h2 className="mt-1 text-lg font-semibold">Envie uma oferta</h2>
            <p className="text-sm text-[#5C6B76]">
              Preencha seus dados e as condições. O proprietário analisa no portal
              e o aceite acontece por lá.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" required>
              <Input
                className={campo}
                value={form.clienteNome}
                onChange={(e) => set("clienteNome", e.target.value)}
                required
              />
            </Field>
            <Field label="Telefone">
              <Input
                className={campo}
                value={form.clienteTelefone}
                onChange={(e) => set("clienteTelefone", e.target.value)}
              />
            </Field>
            <Field label="E-mail">
              <Input
                className={campo}
                type="email"
                value={form.clienteEmail}
                onChange={(e) => set("clienteEmail", e.target.value)}
              />
            </Field>
            <Field label="CPF">
              <Input
                className={campo}
                value={form.clienteCpf}
                onChange={(e) => set("clienteCpf", e.target.value)}
              />
            </Field>
            <Field label="Valor da proposta" required>
              <Input
                className={campo}
                inputMode="numeric"
                value={form.valor}
                onChange={(e) => set("valor", e.target.value)}
                placeholder="R$"
              />
            </Field>
            <Field label="Sinal / entrada">
              <Input
                className={campo}
                inputMode="numeric"
                value={form.entrada}
                onChange={(e) => set("entrada", e.target.value)}
              />
            </Field>
            <Field label="Apartado">
              <Input
                className={campo}
                inputMode="numeric"
                value={form.apartado}
                onChange={(e) => set("apartado", e.target.value)}
              />
            </Field>
            <Field label="FGTS">
              <Input
                className={campo}
                inputMode="numeric"
                value={form.fgts}
                onChange={(e) => set("fgts", e.target.value)}
              />
            </Field>
            <Field label="Mora Bem">
              <Input
                className={campo}
                inputMode="numeric"
                value={form.moraBem}
                onChange={(e) => set("moraBem", e.target.value)}
              />
            </Field>
            <Field label="MCMV">
              <Input
                className={campo}
                inputMode="numeric"
                value={form.mcmv}
                onChange={(e) => set("mcmv", e.target.value)}
              />
            </Field>
            <Field label="Parcela Caixa">
              <Input
                className={campo}
                inputMode="decimal"
                value={form.parcelaCaixa}
                onChange={(e) => set("parcelaCaixa", e.target.value)}
              />
            </Field>
            <Field label="Financiamento">
              <Input
                className={campo}
                inputMode="numeric"
                value={form.financiamento}
                onChange={(e) => set("financiamento", e.target.value)}
              />
            </Field>
            <Field label="Desconto">
              <Input
                className={campo}
                inputMode="numeric"
                value={form.desconto}
                onChange={(e) => set("desconto", e.target.value)}
              />
            </Field>
            <Field label="Validade">
              <Input
                className={campo}
                type="date"
                value={form.validade}
                onChange={(e) => set("validade", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Pré-chaves (valores separados por vírgula)">
            <Input
              className={campo}
              value={form.preChaves}
              onChange={(e) => set("preChaves", e.target.value)}
            />
          </Field>
          <Field label="Pós-chaves">
            <Input
              className={campo}
              value={form.posChaves}
              onChange={(e) => set("posChaves", e.target.value)}
            />
          </Field>
          <Field label="Intercaladas">
            <Input
              className={campo}
              value={form.intercaladas}
              onChange={(e) => set("intercaladas", e.target.value)}
            />
          </Field>
          <Field label="Observação">
            <Textarea
              className="rounded-lg! border-[#E2E8EC] shadow-none focus-visible:border-[#079ED4] focus-visible:ring-[#D3EBF5]"
              value={form.observacao}
              onChange={(e) => set("observacao", e.target.value)}
              rows={3}
            />
          </Field>
          {form.valor ? (
            <p className="rounded-xl bg-[#F3FAFD] px-3 py-2 text-sm text-[#05749E]">
              Valor informado:{" "}
              <strong className="text-[#0B3148]">{brl(toInt(form.valor))}</strong>
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-xl bg-[#079ED4] text-white hover:bg-[#05749E]"
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
      <Label className="text-xs font-medium text-[#5C6B76]">
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </label>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { fetchMe, getSession } from "@/lib/auth";
import {
  deleteTenantCompanyLogo,
  fetchTenantCompany,
  updateTenantCompany,
  uploadTenantCompanyLogo,
} from "@/lib/tenant-company-api";
import { CampoCep, linhaDeEndereco } from "@/lib/cep-lookup";
import { formatPhone } from "@/lib/phone";
import { formatCpfCnpj } from "@/lib/utils";
import {
  ImageUploadField,
  assertImageFile,
} from "@/components/image-upload-field";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type FormState = {
  name: string;
  documento: string;
  creci: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  banco: string;
  agencia: string;
  contaBancaria: string;
  pix: string;
  representanteLegal: string;
};

function formFromCompany(company: {
  name?: string | null;
  documento?: string | null;
  creci?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  banco?: string | null;
  agencia?: string | null;
  contaBancaria?: string | null;
  pix?: string | null;
  representanteLegal?: string | null;
}): FormState {
  return {
    name: company.name ?? "",
    documento: formatCpfCnpj(company.documento ?? ""),
    creci: company.creci ?? "",
    email: company.email ?? "",
    telefone: company.telefone ? formatPhone(company.telefone) : "",
    endereco: company.endereco ?? "",
    cidade: company.cidade ?? "",
    banco: company.banco ?? "",
    agencia: company.agencia ?? "",
    contaBancaria: company.contaBancaria ?? "",
    pix: company.pix ?? "",
    representanteLegal: company.representanteLegal ?? "",
  };
}

export function ConfigEmpresaPanel() {
  const session = getSession();
  const isAdmin = session?.role === "admin";
  const isSolo = session?.tenant?.plano === "solo";
  const [form, setForm] = useState<FormState>(() => formFromCompany({}));
  const [savedForm, setSavedForm] = useState<FormState>(() => formFromCompany({}));
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  const copy = useMemo(
    () =>
      isSolo
        ? {
            title: "Meus dados",
            blurb:
              "Essas informações e a logo aparecem nos contratos, propostas e na identificação do seu CRM.",
            nameLabel: "Nome comercial",
            namePlaceholder: "Ex.: João Silva Corretores",
            nameRequired: "Informe o nome comercial.",
            documentoLabel: "CPF ou CNPJ",
            emailPlaceholder: "contato@seuemail.com",
            loadError: "Não foi possível carregar seus dados.",
            loading: "Carregando seus dados…",
            saved: "Dados salvos.",
            saveError: "Não foi possível salvar os dados.",
            readOnly: "Somente o administrador pode editar estes dados.",
          }
        : {
            title: "Dados da imobiliária",
            blurb:
              "Essas informações e a logo alimentam contratos, propostas e a identificação da imobiliária no CRM.",
            nameLabel: "Nome da imobiliária",
            namePlaceholder: "Ex.: IMOBILIÁRIA NEW PALACE",
            nameRequired: "Informe o nome da imobiliária.",
            documentoLabel: "CNPJ",
            emailPlaceholder: "contato@imobiliaria.com",
            loadError: "Não foi possível carregar os dados da imobiliária.",
            loading: "Carregando dados da imobiliária…",
            saved: "Dados da imobiliária salvos.",
            saveError: "Não foi possível salvar os dados da imobiliária.",
            readOnly:
              "Somente o administrador pode editar os dados da imobiliária.",
          },
    [isSolo],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchTenantCompany()
      .then((company) => {
        if (cancelled) return;
        const next = formFromCompany(company);
        setForm(next);
        setSavedForm(next);
        setLogoUrl(company.logoUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof ApiError ? err.message : copy.loadError,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadError]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function refreshSessionLogo() {
    await fetchMe().catch(() => null);
  }

  async function handleAddLogo(files: File[]) {
    const file = files[0];
    if (!isAdmin || !file) return;
    const invalid = assertImageFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setLogoBusy(true);
    try {
      const updated = await uploadTenantCompanyLogo(file);
      setLogoUrl(updated.logoUrl);
      await refreshSessionLogo();
      toast.success("Logo atualizada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível enviar a logo.",
      );
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleRemoveLogo() {
    if (!isAdmin) return;
    setLogoBusy(true);
    try {
      const updated = await deleteTenantCompanyLogo();
      setLogoUrl(updated.logoUrl);
      await refreshSessionLogo();
      toast.success("Logo removida.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover a logo.",
      );
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error(copy.nameRequired);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateTenantCompany({
        name,
        documento: form.documento,
        creci: form.creci.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        endereco: form.endereco.trim(),
        cidade: form.cidade.trim(),
        banco: form.banco.trim(),
        agencia: form.agencia.trim(),
        contaBancaria: form.contaBancaria.trim(),
        pix: form.pix.trim(),
        representanteLegal: form.representanteLegal.trim(),
      });
      const next = formFromCompany(updated);
      setForm(next);
      setSavedForm(next);
      await fetchMe().catch(() => null);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : copy.saveError,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.loading}
        </CardContent>
      </Card>
    );
  }

  const locked = !isAdmin || saving;

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex h-full flex-col">
          <CardContent className="flex flex-1 flex-col p-6">
            <ImageUploadField
              images={logoUrl ? [logoUrl] : []}
              max={1}
              label="Logo"
              hint="Aparece no menu, contratos e propostas. JPG, PNG ou WebP, máx. 5 MB."
              recommendedSize="800 × 400"
              disabled={!isAdmin}
              busy={logoBusy}
              shape="logo"
              onAdd={(files) => void handleAddLogo(files)}
              onRemove={() => void handleRemoveLogo()}
            />
            <div className="mt-4 text-center">
              <div className="font-semibold">{form.name || copy.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{copy.blurb}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{copy.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="empresa-nome">{copy.nameLabel}</Label>
              <Input
                id="empresa-nome"
                value={form.name}
                disabled={locked}
                placeholder={copy.namePlaceholder}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-cnpj">{copy.documentoLabel}</Label>
              <Input
                id="empresa-cnpj"
                value={form.documento}
                disabled={locked}
                placeholder="00.000.000/0000-00"
                onChange={(e) =>
                  setField("documento", formatCpfCnpj(e.target.value))
                }
              />
            </div>
            {isSolo ? null : (
              <div className="space-y-1.5">
                <Label htmlFor="empresa-creci">CRECI</Label>
                <Input
                  id="empresa-creci"
                  value={form.creci}
                  disabled={locked}
                  placeholder="Ex.: 18937-J"
                  onChange={(e) => setField("creci", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="empresa-email">E-mail</Label>
              <Input
                id="empresa-email"
                type="email"
                value={form.email}
                disabled={locked}
                placeholder={copy.emailPlaceholder}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-telefone">Telefone</Label>
              <Input
                id="empresa-telefone"
                value={form.telefone}
                disabled={locked}
                placeholder="(81) 99999-9999"
                onChange={(e) =>
                  setField("telefone", formatPhone(e.target.value))
                }
              />
            </div>
            <CampoCep
              id="empresa-cep"
              disabled={locked}
              onEncontrado={(endereco) =>
                setForm((prev) => ({
                  ...prev,
                  endereco: linhaDeEndereco(endereco) || prev.endereco,
                  cidade:
                    endereco.cidade && endereco.uf
                      ? `${endereco.cidade}/${endereco.uf}`
                      : prev.cidade,
                }))
              }
            />
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="empresa-endereco">Endereço</Label>
              <Input
                id="empresa-endereco"
                value={form.endereco}
                disabled={locked}
                placeholder="Ex.: AV CAXANGÁ, 5405 — Várzea, Recife-PE"
                onChange={(e) => setField("endereco", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-cidade">Cidade do contrato</Label>
              <Input
                id="empresa-cidade"
                value={form.cidade}
                disabled={locked}
                placeholder="Ex.: Recife/PE"
                onChange={(e) => setField("cidade", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Usada na data/local do contrato de intermediação.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Dados para pagamento</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <p className="text-xs text-muted-foreground md:col-span-2">
              Entram automaticamente na aba Pagamento do contrato de intermediação.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-banco">Banco</Label>
              <Input
                id="empresa-banco"
                value={form.banco}
                disabled={locked}
                placeholder="Ex.: Inter"
                onChange={(e) => setField("banco", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-agencia">Agência</Label>
              <Input
                id="empresa-agencia"
                value={form.agencia}
                disabled={locked}
                placeholder="Ex.: 0001-9"
                onChange={(e) => setField("agencia", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-conta">Conta</Label>
              <Input
                id="empresa-conta"
                value={form.contaBancaria}
                disabled={locked}
                placeholder="Ex.: 1902391-0"
                onChange={(e) => setField("contaBancaria", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-pix">PIX (CNPJ ou chave)</Label>
              <Input
                id="empresa-pix"
                value={form.pix}
                disabled={locked}
                placeholder="CNPJ da conta ou chave PIX"
                onChange={(e) => setField("pix", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="empresa-representante">
                Representante legal (conta)
              </Label>
              <Input
                id="empresa-representante"
                value={form.representanteLegal}
                disabled={locked}
                placeholder="Nome de quem assina pela imobiliária"
                onChange={(e) => setField("representanteLegal", e.target.value)}
              />
            </div>
            {isAdmin ? (
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setForm(savedForm)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : null}
                  Salvar alterações
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground md:col-span-2">
                {copy.readOnly}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

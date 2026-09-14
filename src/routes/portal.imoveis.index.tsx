import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  ImageUploadField,
  assertImageFile,
} from "@/components/image-upload-field";
import { PortalEmpty, PortalImovelCard, PortalPageTitle } from "@/components/portal-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  CAPTACAO_IMOVEL_TIPOS,
  IMOVEL_MAX_FOTOS,
  type CaptacaoImovelTipo,
} from "@/lib/captacao-api";
import {
  createPortalImovel,
  fetchPortalDashboard,
  uploadPortalImovelFoto,
  type PortalImovelListItem,
} from "@/lib/portal-api";
import {
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/imoveis/")({
  ssr: false,
  component: PortalImoveisPage,
});

function PortalImoveisPage() {
  const [items, setItems] = useState<PortalImovelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState<CaptacaoImovelTipo>("apartamento");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [valor, setValor] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);

  function reload() {
    return fetchPortalDashboard().then((data) => setItems(data.imoveis));
  }

  useEffect(() => {
    void reload()
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const parsed = parseOptionalMoneyInput(valor);
      const created = await createPortalImovel({
        tipo,
        cep: cep.trim() || undefined,
        logradouro: logradouro.trim(),
        numero: numero.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        estado: estado.trim() || undefined,
        valorPretendido: parsed != null && parsed > 0 ? parsed : undefined,
      });
      try {
        for (const file of fotos) {
          await uploadPortalImovelFoto(created.id, file);
        }
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Imóvel criado, mas uma foto não foi enviada. Edite o imóvel para tentar de novo.",
        );
      }
      toast.success("Imóvel enviado. A imobiliária vai avaliar na captação.");
      setOpen(false);
      setLogradouro("");
      setNumero("");
      setBairro("");
      setCidade("");
      setEstado("");
      setCep("");
      setValor("");
      fotoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setFotos([]);
      setFotoPreviews([]);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PortalPageTitle
          kicker="Carteira"
          title="Meus imóveis"
          subtitle="Cadastre uma sugestão: ela entra no funil de captação da imobiliária."
        />
        <Button
          type="button"
          className="bg-[#0f4c5c] hover:bg-[#0c3d4a]"
          onClick={() => setOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Novo imóvel
        </Button>
      </div>
      {items.length === 0 ? (
        <PortalEmpty>Nenhum imóvel encontrado. Use “Novo imóvel” para sugerir um.</PortalEmpty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((imovel) => (
            <PortalImovelCard key={imovel.id} imovel={imovel} />
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            fotoPreviews.forEach((url) => URL.revokeObjectURL(url));
            setFotos([]);
            setFotoPreviews([]);
          }
        }}
      >
        <DialogContent className="max-h-[min(92vh,780px)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sugerir imóvel</DialogTitle>
            <DialogDescription>
              A imobiliária recebe no funil de captação com a tag “Sugestão do
              proprietário”.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as CaptacaoImovelTipo)}
              >
                {CAPTACAO_IMOVEL_TIPOS.map((item) => (
                  <option key={item} value={item}>
                    {CAPTACAO_IMOVEL_TIPO_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="logradouro">Endereço</Label>
                <Input
                  id="logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estado">UF</Label>
                <Input
                  id="estado"
                  maxLength={2}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor pretendido</Label>
                <Input
                  id="valor"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={valor}
                  onChange={(e) => setValor(maskMoneyInput(e.target.value))}
                />
              </div>
            </div>
            <ImageUploadField
              label="Fotos do imóvel"
              hint={`Até ${IMOVEL_MAX_FOTOS} fotos. JPG, PNG ou WebP, no máximo 5 MB cada. A primeira vira a capa.`}
              images={fotoPreviews}
              max={IMOVEL_MAX_FOTOS}
              busy={saving}
              slotLabels={["Capa"]}
              onAdd={(files) => {
                const valid: File[] = [];
                for (const file of files) {
                  const erro = assertImageFile(file);
                  if (erro) {
                    toast.error(erro);
                    continue;
                  }
                  valid.push(file);
                }
                if (!valid.length) return;
                setFotos((atual) => [...atual, ...valid].slice(0, IMOVEL_MAX_FOTOS));
                setFotoPreviews((atual) =>
                  [...atual, ...valid.map((file) => URL.createObjectURL(file))].slice(
                    0,
                    IMOVEL_MAX_FOTOS,
                  ),
                );
              }}
              onRemove={(index) => {
                setFotoPreviews((atual) => {
                  const url = atual[index];
                  if (url) URL.revokeObjectURL(url);
                  return atual.filter((_, i) => i !== index);
                });
                setFotos((atual) => atual.filter((_, i) => i !== index));
              }}
            />
            <Button type="submit" disabled={saving} className="bg-[#0f4c5c] hover:bg-[#0c3d4a]">
              {saving ? "Enviando…" : "Enviar para captação"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

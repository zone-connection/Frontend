import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  changePassword,
  getSession,
  removeMyAvatar,
  uploadMyAvatar,
  type AuthUser,
} from "@/lib/auth";
import { assertImageFile } from "@/components/image-upload-field";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/empreendimentos-api";
import { userCanInformarCreci } from "@/lib/users-api";
import { ConfigCreciPanel } from "@/components/config-creci-panel";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Zone Connection" }] }),
  component: Perfil,
});

const AVATAR_MIN_SIDE = 256;

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

async function assertAvatarFile(file: File): Promise<string | null> {
  const typeError = assertImageFile(file);
  if (typeError) return typeError;
  try {
    const { width, height } = await readImageSize(file);
    if (width < AVATAR_MIN_SIDE || height < AVATAR_MIN_SIDE) {
      return `A foto deve ter pelo menos ${AVATAR_MIN_SIDE} × ${AVATAR_MIN_SIDE} pixels.`;
    }
  } catch {
    return "Não foi possível ler a imagem.";
  }
  return null;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
  analista: "Analista",
  treinee: "Treinee",
  financeiro: "Financeiro",
  assistente: "Assistente",
};

function Perfil() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => setUser(getSession());
    sync();
    setDarkMode(getTheme() === "dark");
    window.addEventListener("crm-session-updated", sync);
    return () => window.removeEventListener("crm-session-updated", sync);
  }, []);

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("") ?? "U";

  async function handleAvatarPick(list: FileList | null) {
    const file = list?.[0];
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    if (!file) return;

    const invalid = await assertAvatarFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    setSavingAvatar(true);
    try {
      const next = await uploadMyAvatar(file);
      setUser(next);
      toast.success("Foto de perfil atualizada");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a foto",
      );
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setSavingAvatar(true);
    try {
      const next = await removeMyAvatar();
      setUser(next);
      toast.success("Foto de perfil removida");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a foto",
      );
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      toast.error("Informe a senha atual e a nova senha");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Senha alterada com sucesso");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  function handleDarkMode(checked: boolean) {
    const theme: Theme = checked ? "dark" : "light";
    setDarkMode(checked);
    setTheme(theme);
    toast.success(checked ? "Modo escuro ativado" : "Modo claro ativado");
  }

  return (
    <div>
      <PageHeader
        title="Perfil"
        description="Gerencie suas informações e preferências."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="flex h-full flex-col">
          <CardContent className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <Avatar className="mb-3 h-24 w-24">
              {user?.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="font-semibold">{user?.name}</div>
            <div className="text-xs text-muted-foreground">
              {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
            </div>
            {user?.creci?.trim() ? (
              <div className="mt-1 text-xs font-medium text-primary">
                CRECI {user.creci.trim()}
              </div>
            ) : null}
            <input
              ref={avatarInputRef}
              type="file"
              accept={IMAGE_UPLOAD_ACCEPT}
              className="sr-only"
              disabled={savingAvatar}
              onChange={(event) => handleAvatarPick(event.target.files)}
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
                {savingAvatar
                  ? "Enviando..."
                  : user?.avatar
                    ? "Trocar foto"
                    : "Alterar foto"}
              </Button>
              {user?.avatar ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={savingAvatar}
                  onClick={handleRemoveAvatar}
                >
                  Remover
                </Button>
              ) : null}
            </div>
            <p className="mt-3 max-w-56 text-[11px] leading-relaxed text-muted-foreground">
              JPG, PNG ou WebP · até 5 MB. Ideal:{" "}
              <span className="font-medium text-foreground">1080 × 1080</span>.
              Retrato 1080 × 1920 também serve — recortamos o centro.
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input defaultValue={user?.name} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input defaultValue={user?.email} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input defaultValue={user?.phone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input defaultValue={user?.cargo ?? ""} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Salvar alterações</Button>
            </div>

            <div className="md:col-span-2 border-t pt-4 space-y-4">
              <div className="text-sm font-medium">Alterar senha</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senha-atual">Senha atual</Label>
                  <Input
                    id="senha-atual"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha-nova">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="senha-nova"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 8 caracteres, com maiúscula, minúscula e número.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? "Salvando..." : "Alterar senha"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {user && userCanInformarCreci(user) ? (
          <div className="lg:col-span-3">
            <ConfigCreciPanel onSaved={setUser} />
          </div>
        ) : null}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Aparência</CardTitle>
            <Badge variant="secondary">Em desenvolvimento</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              A personalização de cores do painel estará disponível em breve.
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Preferências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <div className="text-sm font-medium">Notificações push</div>
                <div className="text-xs text-muted-foreground">
                  Novos leads, tarefas e mensagens em tempo real
                </div>
              </div>
              <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">Modo escuro</div>
                <div className="text-xs text-muted-foreground">
                  Usar interface com tema escuro
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={handleDarkMode} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

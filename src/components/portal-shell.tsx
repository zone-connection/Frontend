import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell,
  Building2,
  Newspaper,
  ChevronDown,
  FileText,
  Handshake,
  Headset,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  ScrollText,
  X,
} from "lucide-react";
import {
  changePortalPassword,
  countNovidadesNaoLidas,
  fetchPortalNovidades,
  marcarPortalNovidadesLidas,
  type PortalNovidade,
  type PortalProprietario,
} from "@/lib/portal-api";
import { signOutPortal } from "@/lib/portal-auth";
import { ApiError } from "@/lib/api";
import { getWhatsAppUrl } from "@/lib/env";
import { DEFAULT_TENANT_LOGO, useTenantTheme } from "@/lib/tenant-theme";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

const SUPPORT_WHATSAPP_URL = getWhatsAppUrl(undefined, "558191702203");

const NAV = [
  { to: "/portal", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/portal/novidades", label: "Novidades", icon: Newspaper },
  { to: "/portal/imoveis", label: "Meus Imóveis", icon: Home },
  { to: "/portal/propostas", label: "Propostas", icon: ScrollText },
  { to: "/portal/visitas", label: "Visitas", icon: Building2 },
  { to: "/portal/negociacoes", label: "Negociações", icon: Handshake },
  { to: "/portal/documentos", label: "Documentos", icon: FileText },
  { to: "/portal/mensagens", label: "Mensagens", icon: MessageCircle },
] as const;

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "P";
  const b = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (a + b).toUpperCase();
}

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === "/portal" || pathname === "/portal/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function PortalShell({
  proprietario,
  children,
}: {
  proprietario: PortalProprietario;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { brandName, logoUrl } = useTenantTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [senhaOpen, setSenhaOpen] = useState(false);
  const [novidades, setNovidades] = useState<PortalNovidade[]>([]);
  const naoLidas = countNovidadesNaoLidas(novidades);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaBusy, setSenhaBusy] = useState(false);

  useEffect(() => {
    void fetchPortalNovidades()
      .then(setNovidades)
      .catch(() => setNovidades([]));
  }, []);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setSenhaBusy(true);
    try {
      await changePortalPassword(senhaAtual, senhaNova);
      toast.success("Senha atualizada.");
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível trocar a senha.",
      );
    } finally {
      setSenhaBusy(false);
    }
  }

  function renderNav(onNavigate?: () => void) {
    return (
      <nav className="sidebar-nav-scroll flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((item) => {
          const active = isActive(
            pathname,
            item.to,
            "exact" in item && item.exact,
          );
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "relative mb-0.5 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-300 ease-out",
                active
                  ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/75 hover:bg-white/6",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.to === "/portal/novidades" && naoLidas > 0 ? (
                <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                  {naoLidas > 9 ? "9+" : naoLidas}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  function renderAccountFooter() {
    return (
      <div className="border-t border-sidebar-border">
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-2 p-3 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
          title="Suporte técnico"
        >
          <Headset className="h-4 w-4 shrink-0" />
          <span>Suporte técnico</span>
        </a>
        <button
          type="button"
          onClick={() => {
            void signOutPortal().then(() =>
              navigate({ to: "/portal/login", search: { email: undefined } }),
            );
          }}
          className="flex w-full cursor-pointer items-center gap-2 p-3 text-xs text-[#f87171] hover:bg-[#f87171]/15 hover:text-[#fca5a5]"
          title="Sair"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sair da conta</span>
        </button>
      </div>
    );
  }

  const brandLabel =
    brandName === "Zone Connection" ? (
      <>
        Zone <span className="text-primary">Connection</span>
      </>
    ) : (
      brandName
    );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
          <img
            src={logoUrl || DEFAULT_TENANT_LOGO}
            alt={brandName}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">
              {brandLabel}
            </div>
            <div className="truncate text-[10px] text-sidebar-foreground/60">
              Portal do proprietário
            </div>
          </div>
        </div>
        {renderNav()}
        {renderAccountFooter()}
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out md:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <img
            src={logoUrl || DEFAULT_TENANT_LOGO}
            alt={brandName}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">
              {brandLabel}
            </div>
            <div className="truncate text-[10px] text-sidebar-foreground/60">
              Portal do proprietário
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {renderNav(() => setMenuOpen(false))}
        {renderAccountFooter()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur sm:gap-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1" />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="Notificações"
                >
                  <Bell className="h-4 w-4" />
                  {naoLidas > 0 ? (
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary">
                      {naoLidas > 9 ? "9+" : naoLidas}
                    </Badge>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" sideOffset={8} className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <p className="text-sm font-semibold">Novidades</p>
                  {naoLidas > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        void marcarPortalNovidadesLidas()
                          .then(setNovidades)
                          .catch((err) => {
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível marcar como lidas.",
                            );
                          });
                      }}
                    >
                      Marcar todas
                    </Button>
                  ) : null}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {novidades.length === 0 ? (
                    <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                      Nenhuma notificação
                    </div>
                  ) : (
                    novidades.slice(0, 8).map((item) => (
                      <Link
                        key={item.id}
                        to="/portal/imoveis/$id"
                        params={{ id: item.imovelId }}
                        className={cn(
                          "block border-b px-3 py-2.5 last:border-0 hover:bg-accent/60",
                          item.lida !== true && "bg-primary/5",
                        )}
                      >
                        <div className="text-xs font-medium leading-snug">
                          {item.texto}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <div className="border-t px-3 py-2">
                  <Link
                    to="/portal/novidades"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Ver todas
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full px-2.5 py-1.5 hover:bg-accent"
                  aria-label="Menu da conta"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="avatar-fallback-brand text-xs">
                      {initials(proprietario.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left leading-tight sm:block">
                    <div className="text-xs font-medium">{proprietario.nome}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Proprietário
                    </div>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSenhaOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" /> Trocar senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    void signOutPortal().then(() =>
                      navigate({
                        to: "/portal/login",
                        search: { email: undefined },
                      }),
                    );
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="max-w-full min-w-0 flex-1 overflow-x-clip p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>

      <Dialog open={senhaOpen} onOpenChange={setSenhaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
            <DialogDescription>
              Altere a senha de acesso ao portal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void onChangePassword(e)} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <Input
                id="senha-atual"
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha-nova">Nova senha</Label>
              <Input
                id="senha-nova"
                type="password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={senhaBusy}>
              {senhaBusy ? "Salvando…" : "Atualizar senha"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

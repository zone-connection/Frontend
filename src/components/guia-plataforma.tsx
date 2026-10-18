import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Layers,
  Megaphone,
  Share2,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const APP_ID = "1079705831674949";
const APP_NAME = "Aplicativo ZoneConnection";

const TOC = [
  { id: "regra", label: "Como funciona" },
  { id: "app", label: "1. Criar o app" },
  { id: "webhook", label: "2. Webhook e Dokploy" },
  { id: "tenant", label: "3. Tenant no CRM" },
  { id: "pagina", label: "4. Página da imobiliária" },
  { id: "page-id", label: "5. Page ID" },
  { id: "token", label: "6. Token da Página" },
  { id: "inscrever", label: "7. Inscrever a Página" },
  { id: "vincular", label: "8. Vincular no CRM" },
  { id: "campanha", label: "9. Campanha de anúncio" },
  { id: "conferir", label: "10. Conferir o lead" },
  { id: "erros", label: "Não faça isso" },
] as const;

function CopySnippet({
  label,
  value,
}: {
  label?: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/40">
      {label ? (
        <p className="border-b border-border/60 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="flex items-start gap-2 p-3">
        <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-relaxed text-foreground">
          {value}
        </pre>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => void copy()}
          aria-label="Copiar"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="ok"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
              >
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
              >
                <Copy className="h-3.5 w-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "tip" | "warn" | "stop";
  title: string;
  children: ReactNode;
}) {
  const styles = {
    tip: "border-sky-200/80 bg-sky-50/80 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-50",
    warn: "border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-50",
    stop: "border-red-200/80 bg-red-50/80 text-red-950 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-50",
  } as const;

  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", styles[tone])}>
      <p className="mb-1 flex items-center gap-2 font-semibold">
        {tone === "stop" ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {title}
      </p>
      <div className="space-y-1 text-[13px] leading-relaxed opacity-90">
        {children}
      </div>
    </div>
  );
}

function StepList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-sm leading-relaxed">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
            {index + 1}
          </span>
          <div className="min-w-0 pt-0.5">{item}</div>
        </li>
      ))}
    </ol>
  );
}

function GuideSection({
  id,
  kicker,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  icon: typeof BookOpen;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="overflow-hidden">
        <div className="flex items-start gap-4 border-b border-border/70 bg-muted/25 px-5 py-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {kicker}
            </p>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          </div>
        </div>
        <CardContent className="space-y-4 p-5 sm:p-6">{children}</CardContent>
      </Card>
    </section>
  );
}

export function GuiaPlataformaPage() {
  const [active, setActive] = useState<string>(TOC[0].id);

  const ids = useMemo(() => TOC.map((item) => item.id), []);

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.15, 0.4] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [ids]);

  function goTo(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/12 via-card to-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge className="w-fit bg-primary/15 text-primary hover:bg-primary/15">
              Super admin · plataforma
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Guia Meta Lead Ads
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Do app da plataforma até a campanha da imobiliária cair no tenant
              certo. Um app só. Uma Página por cliente. O CRM roteia pelo Page ID.
            </p>
          </div>
          <Button asChild>
            <Link to="/tenants">
              Abrir clientes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "1 app",
              text: "O Aplicativo ZoneConnection é da plataforma. Não crie outro por cliente.",
            },
            {
              icon: Building2,
              title: "1 Página / tenant",
              text: "Cada imobiliária anuncia na Página dela. Esse Page ID vai no tenant.",
            },
            {
              icon: Workflow,
              title: "Campanha → Página",
              text: "No Gerenciador você escolhe a Página, não o tenant. O CRM faz o resto.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
            >
              <item.icon className="mb-2 h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-6 lg:items-start">
        <nav className="sticky top-20 hidden w-56 shrink-0 self-start max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1 lg:block">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Seções
          </p>
          <ul className="space-y-0.5 border-l border-border pl-3">
            {TOC.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(item.id)}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                    active === item.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {TOC.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs",
                  active === item.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <GuideSection
            id="regra"
            kicker="Antes de começar"
            title="Como o lead chega no tenant certo"
            icon={Workflow}
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              A campanha no Facebook não aponta para o CRM. Ela aponta para uma{" "}
              <strong className="font-medium text-foreground">Página</strong>.
              A Meta envia o <code className="rounded bg-muted px-1">page_id</code>.
              O CRM procura o tenant que tem essa Página em{" "}
              <strong className="font-medium text-foreground">Meta Lead Ads</strong>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-sm font-semibold">Certo</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Imobiliária Silva anuncia na Página Silva → lead no tenant Silva.
                </p>
              </div>
              <div className="rounded-xl border border-red-200/70 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                <p className="text-sm font-semibold">Errado</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Anúncio do cliente na Página Zone Connection → tudo cai no tenant
                  da Zone Connection.
                </p>
              </div>
            </div>
            <Callout tone="warn" title="App não publicado">
              Lead de gente de fora não chega pelo webhook. A API puxa pela Graph
              a cada ~2 minutos, com o token da Página. Quando o app estiver Live
              (empresa verificada), o webhook avisa na hora — o roteamento por
              Page ID continua igual.
            </Callout>
          </GuideSection>

          <GuideSection
            id="app"
            kicker="Uma vez · plataforma"
            title="Criar o app Meta"
            icon={Layers}
          >
            <p className="text-sm text-muted-foreground">
              Isso já existe: <strong className="text-foreground">{APP_NAME}</strong>{" "}
              (App ID {APP_ID}). Só refaça se for um ambiente novo.
            </p>
            <StepList
              items={[
                <>
                  Abra{" "}
                  <a
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noreferrer"
                  >
                    developers.facebook.com/apps
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </a>
                </>,
                <>
                  <strong>Criar aplicativo</strong>. Caso de uso:{" "}
                  <em>Capturar e gerenciar leads de anúncios com a API de Marketing</em>
                  — não “criar anúncios” nem “gerenciar tudo na Página”.
                </>,
                <>Nome do app (ex.: Aplicativo ZoneConnection) e e-mail de contato.</>,
                <>No painel do app, adicione o produto <strong>Webhooks</strong>.</>,
              ]}
            />
            <CopySnippet label="App ID da plataforma" value={APP_ID} />
          </GuideSection>

          <GuideSection
            id="webhook"
            kicker="Uma vez · plataforma"
            title="Webhook e variáveis no Dokploy"
            icon={Share2}
          >
            <StepList
              items={[
                <>
                  No app: <strong>Webhooks</strong> → objeto <strong>Page</strong> →
                  assinar o campo <strong>leadgen</strong>.
                </>,
                <>
                  Callback URL = domínio público da API +{" "}
                  <code className="rounded bg-muted px-1">/api/webhooks/meta</code>.
                  Verificar e salvar com o mesmo verify token do Dokploy.
                </>,
                <>
                  No Dokploy, no app da API:{" "}
                  <code className="rounded bg-muted px-1">META_APP_SECRET</code> (chave
                  secreta do app) e{" "}
                  <code className="rounded bg-muted px-1">META_VERIFY_TOKEN</code>.
                </>,
              ]}
            />
            <CopySnippet
              label="Caminho do webhook"
              value="https://SEU-DOMINIO-DA-API/api/webhooks/meta"
            />
            <Callout tone="tip" title="App Review">
              Publicar o app e passar na revisão vale para todas as Páginas ligadas.
              Sem empresa verificada, o app fica em desenvolvimento — use a puxada
              da Graph e testes com quem tem papel no app.
            </Callout>
          </GuideSection>

          <GuideSection
            id="tenant"
            kicker="Cada imobiliária"
            title="Criar o tenant no CRM"
            icon={Building2}
          >
            <StepList
              items={[
                <>Em <strong>Clientes</strong>, cadastre a imobiliária se ainda não existir.</>,
                <>Abra <strong>Conexões</strong> desse tenant e deixe Meta Lead Ads pronto.</>,
                <>
                  O lead só aparece na lista daquele tenant. Página do tenant A não
                  mostra lead no tenant B.
                </>,
              ]}
            />
            <Button asChild variant="outline" size="sm">
              <Link to="/tenants">Ir para Clientes</Link>
            </Button>
          </GuideSection>

          <GuideSection
            id="pagina"
            kicker="Cada imobiliária"
            title="Página do Facebook"
            icon={Building2}
          >
            <p className="text-sm text-muted-foreground">
              Se ela já tem Página da marca, <strong className="text-foreground">não crie outra</strong>.
              Só crie se ainda não existir.
            </p>
            <StepList
              items={[
                <>
                  Facebook com a conta que administra (ideal: da imobiliária). Abra{" "}
                  <a
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    href="https://www.facebook.com/pages/create"
                    target="_blank"
                    rel="noreferrer"
                  >
                    facebook.com/pages/create
                  </a>
                  .
                </>,
                <>Tipo negócio / empresa. Nome = nome da imobiliária. Categoria Imobiliária.</>,
                <>Um administrador dessa Página precisa autorizar o token no passo 6.</>,
              ]}
            />
            <Callout tone="stop" title="Não use a Página Zone Connection para cliente">
              Tudo iria para o tenant que tem o Page ID da Zone Connection.
            </Callout>
          </GuideSection>

          <GuideSection
            id="page-id"
            kicker="Cada imobiliária"
            title="Achar o Page ID"
            icon={KeyRound}
          >
            <p className="text-sm font-medium">Na Página (computador)</p>
            <StepList
              items={[
                <>Abra a Página → Configurações → Sobre / transparência.</>,
                <>Copie o ID da Página (só números).</>,
              ]}
            />
            <p className="text-sm font-medium">No Graph API Explorer</p>
            <StepList
              items={[
                <>
                  App <strong>{APP_NAME}</strong>, token da Página no campo Token de
                  acesso.
                </>,
                <>GET abaixo. O <code className="rounded bg-muted px-1">id</code> é o Page ID.</>,
              ]}
            />
            <CopySnippet value="me?fields=id,name" />
          </GuideSection>

          <GuideSection
            id="token"
            kicker="Cada imobiliária"
            title="Token da Página (o que vai no CRM)"
            icon={KeyRound}
          >
            <Callout tone="warn" title="Não cole o token curto no tenant">
              O botão Generate Access Token do Explorer vale 1–2 horas. No CRM entra
              só o token da <strong>Página</strong>, depois da troca.
            </Callout>
            <p className="text-sm font-medium">6.1 Token curto (usuário)</p>
            <StepList
              items={[
                <>Explorer → app {APP_NAME}. Não use “Token do aplicativo”.</>,
                <>
                  Generate Access Token com{" "}
                  <code className="rounded bg-muted px-1">pages_show_list</code>,{" "}
                  <code className="rounded bg-muted px-1">pages_manage_metadata</code>,{" "}
                  <code className="rounded bg-muted px-1">leads_retrieval</code>,{" "}
                  <code className="rounded bg-muted px-1">business_management</code>.
                </>,
                <>Autorize como admin da Página do cliente. Esse é o token curto.</>,
                <>
                  <code className="rounded bg-muted px-1">me/accounts</code> pode
                  voltar vazio. Use o portfólio:
                </>,
              ]}
            />
            <CopySnippet value="me/businesses" />
            <p className="text-sm font-medium">6.2 Trocar por 60 dias (ainda é usuário)</p>
            <CopySnippet
              value={`oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=APP_SECRET&fb_exchange_token=TOKEN_CURTO`}
            />
            <p className="text-xs text-muted-foreground">
              APP_SECRET = Configurações do app → Básico. TOKEN_CURTO = passo 6.1.
              Resposta com <code className="rounded bg-muted px-1">expires_in: 5184000</code>{" "}
              = 60 dias. Esse access_token ainda não vai no CRM.
            </p>
            <p className="text-sm font-medium">6.3 Token da Página</p>
            <StepList
              items={[
                <>Cole o token de 60 dias no campo Token de acesso.</>,
                <>GET abaixo (troque ID_DO_PORTFOLIO).</>,
                <>Na Página da imobiliária, copie o access_token dela. Esse vai no CRM.</>,
              ]}
            />
            <CopySnippet value="ID_DO_PORTFOLIO/owned_pages?fields=id,name,access_token" />
            <p className="text-xs text-muted-foreground">
              Token da Página gerado assim em geral não expira, salvo senha
              trocada, app revogado ou App Secret alterado. Se o log mostrar OAuth
              inválido, gere de novo e atualize no tenant.
            </p>
          </GuideSection>

          <GuideSection
            id="inscrever"
            kicker="Cada imobiliária"
            title="Inscrever a Página no app"
            icon={Share2}
          >
            <p className="text-sm text-muted-foreground">
              Token da Página no Explorer. A Página precisa avisar o app da
              plataforma.
            </p>
            <CopySnippet label="Conferir" value="PAGE_ID/subscribed_apps" />
            <p className="text-xs text-muted-foreground">
              Tem que aparecer o app {APP_ID} com o campo leadgen.
            </p>
            <CopySnippet
              label="Se não aparecer, POST"
              value="PAGE_ID/subscribed_apps?subscribed_fields=leadgen"
            />
            <p className="text-xs text-muted-foreground">
              Resposta esperada: success true.
            </p>
          </GuideSection>

          <GuideSection
            id="vincular"
            kicker="Cada imobiliária"
            title="Colar Page ID e token no tenant"
            icon={Shield}
          >
            <StepList
              items={[
                <>Clientes → a imobiliária → Conexões → Meta Lead Ads.</>,
                <>Page ID = número do passo 5. Token = token da Página do passo 6.3.</>,
                <>Add. Status Ativa. O mesmo Page ID não pode estar em dois tenants.</>,
              ]}
            />
            <Button asChild variant="outline" size="sm">
              <Link to="/tenants">Abrir Clientes</Link>
            </Button>
          </GuideSection>

          <GuideSection
            id="campanha"
            kicker="Cada imobiliária"
            title="Campanha no Gerenciador de Anúncios"
            icon={Megaphone}
          >
            <p className="text-sm text-muted-foreground">
              Aqui você não escolhe o tenant. Você escolhe a Página.
            </p>
            <StepList
              items={[
                <>
                  Abra o{" "}
                  <a
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    href="https://www.facebook.com/adsmanager"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Gerenciador de Anúncios
                  </a>{" "}
                  da conta de anúncios dessa imobiliária (precisa ter permissão na
                  Página).
                </>,
                <>Criar campanha. Objetivo: captar leads / Lead ads (formulário instantâneo).</>,
                <>
                  No conjunto de anúncios, <strong>Identidade</strong> = Página do
                  cliente — nunca a Zone Connection.
                </>,
                <>Formulário instantâneo dessa mesma Página. Publique.</>,
              ]}
            />
          </GuideSection>

          <GuideSection
            id="conferir"
            kicker="Cada imobiliária"
            title="Conferir se o lead chegou"
            icon={BookOpen}
          >
            <StepList
              items={[
                <>Preencha o formulário (prévia ou anúncio real).</>,
                <>No CRM, no tenant daquela imobiliária: Leads → Chegaram, origem Facebook Ads.</>,
                <>
                  No Dokploy → Logs da API, busque MetaService ou “Importando lead da
                  Graph”.
                </>,
              ]}
            />
            <div className="overflow-hidden rounded-xl border border-border/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">No log</th>
                    <th className="px-3 py-2 font-medium">Significa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  <tr>
                    <td className="px-3 py-2 font-mono">444444444444</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      Ping dummy da Meta. Não é campanha.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">Importando lead da Graph</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      Puxada pela Graph (app ainda não Live).
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">page_id= ID real</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      Evento da Página certa.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">OAuth / token</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      Atualize o token da Página no tenant.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <CopySnippet value="PAGE_ID/leadgen_forms?fields=id,name,status" />
            <CopySnippet value="FORM_ID/leads?fields=id,created_time,field_data" />
          </GuideSection>

          <GuideSection
            id="erros"
            kicker="Checklist"
            title="Não faça isso"
            icon={AlertTriangle}
          >
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Criar um app Meta novo por cliente.",
                "Anunciar na Página Zone Connection para lead de outro tenant.",
                "Colocar no CRM o token curto ou o token de usuário de 60 dias. Só o da Página.",
                "Ligar a mesma Página em dois tenants.",
                "Colar token em print, chat ou e-mail.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  {item}
                </li>
              ))}
            </ul>
          </GuideSection>
        </div>
      </div>
    </div>
  );
}

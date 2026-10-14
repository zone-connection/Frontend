import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Send,
  Star,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { cn } from "@/lib/utils";

const STAGES = [
  { name: "Novo", state: "done" as const },
  { name: "Contato", state: "done" as const },
  { name: "Qualificado", state: "current" as const, days: "3 dias" },
  { name: "Visita", state: "next" as const },
  { name: "Proposta", state: "next" as const },
  { name: "Fechamento", state: "next" as const },
];

const HISTORY = [
  { id: "1", kind: "relato", title: "Ligação realizada", detail: "Cliente pediu retorno no período da tarde.", who: "Carlos Mendes", when: "Hoje às 10:32", tone: "bg-emerald-500" },
  { id: "2", kind: "envio", title: "Arquivo enviado", detail: "Proposta de compra.pdf", who: "Ana Souza", when: "Hoje às 09:15", tone: "bg-sky-500" },
  { id: "3", kind: "visualizacao", title: "Arquivo visualizado", detail: "Ficha cadastral.pdf", who: "Carlos Mendes", when: "Ontem às 16:42", tone: "bg-violet-500" },
  { id: "4", kind: "download", title: "Arquivo baixado", detail: "Documentos pessoais.pdf", who: "Ana Souza", when: "Ontem às 14:20", tone: "bg-cyan-600" },
  { id: "5", kind: "compartilhamento", title: "Arquivo compartilhado", detail: "Proposta de compra.pdf", who: "Carlos Mendes", when: "Ontem às 11:03", tone: "bg-indigo-500" },
  { id: "6", kind: "exclusao", title: "Arquivo excluído", detail: "Comprovante de residência.pdf", who: "Ana Souza", when: "10/10/2026 às 17:25", tone: "bg-rose-500" },
  { id: "7", kind: "relato", title: "Relato da triagem", detail: "Lead demonstrou interesse no imóvel, mas ainda está pesquisando.", who: "Carlos Mendes", when: "10/10/2026 às 15:18", tone: "bg-slate-400" },
];

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "relato", label: "Relatos da triagem" },
  { id: "envio", label: "Arquivos enviados" },
  { id: "visualizacao", label: "Visualizações" },
  { id: "download", label: "Downloads" },
  { id: "compartilhamento", label: "Compartilhamentos" },
  { id: "exclusao", label: "Exclusões" },
];

const TABS = ["Atividade", "Triagem", "WhatsApp", "Dados", "Documentações"];

const ACTIONS = [
  { label: "Ver triagem", icon: FileText },
  { label: "Reatribuir lead", icon: Users },
  { label: "Adicionar atividade", icon: Clock },
  { label: "Editar lead", icon: Pencil },
  { label: "Acessar contrato", icon: FileText },
];

export function LeadFichaView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState("Atividade");
  const [filter, setFilter] = useState("todos");
  const [note, setNote] = useState("");
  const items = HISTORY.filter((item) => filter === "todos" || item.kind === filter);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#F5F7FB] [scrollbar-width:thin]">
      <div className="flex items-center justify-between px-6 py-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Voltar para a lista de leads
        </button>
        <span className="text-xs text-slate-400">Criado em: 12/10/2026</span>
      </div>

      <div className="mx-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-lg font-semibold text-white">JS</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">João da Silva</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                  <Star className="h-3 w-3" /> Minha carteira
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Em atendimento
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Origem Ads</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Origem: Meta Ads</span>
                <span>Liberado em: 10/10/2026</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Equipe: Vendas SP</span>
                <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> Corretor: Carlos Mendes</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 hidden text-xs text-slate-400 xl:inline">Criado em: 12/10/2026</span>
            <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white">
              <Phone className="h-4 w-4" /> Ligar
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white">
              <FaWhatsapp className="h-4 w-4" /> WhatsApp
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white">
              <Trash2 className="h-4 w-4" /> Marcar como perdido
            </button>
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-6 mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Funil de vendas</h2>
          <div className="mt-4 flex items-center">
            {STAGES.map((stage, index) => (
              <div key={stage.name} className="flex min-w-0 flex-1 items-center">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs",
                      stage.state === "done" && "border-emerald-500 bg-emerald-500 text-white",
                      stage.state === "current" && "border-blue-600 bg-white text-blue-600",
                      stage.state === "next" && "border-slate-200 bg-white text-slate-300",
                    )}
                  >
                    {stage.state === "done" ? <Check className="h-4 w-4" /> : stage.state === "current" ? <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                  {stage.days ? <span className="mt-1 text-[10px] font-medium text-blue-600">{stage.days}</span> : <span className="mt-1 h-4" />}
                  <span className={cn("text-xs", stage.state === "current" ? "font-semibold text-blue-700" : "text-slate-500")}>{stage.name}</span>
                </div>
                {index < STAGES.length - 1 ? (
                  <span className={cn("mb-5 h-0.5 flex-1", index < 2 ? "bg-emerald-500" : "bg-slate-200")} />
                ) : null}
              </div>
            ))}
          </div>
        </section>
        <aside className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
          <Clock className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Prazo próximo</p>
            <p className="text-xs">Aguardando retorno do cliente</p>
            <p className="text-xs font-medium">Prazo em 4 horas</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4" />
        </aside>
      </div>

      <section className="mx-6 mt-3 rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm">
        <h2 className="px-3 text-sm font-semibold text-slate-800">Dados rápidos do lead</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <Quick icon={Phone} label="Telefone" value="(81) 9XXXX-XXXX" />
          <Quick icon={Mail} label="E-mail" value="joao@email.com" />
          <Quick icon={Building2} label="Renda" value="R$ 8.500,00" />
          <Quick icon={Star} label="Prioridade" value="Alta" pill />
          <Quick icon={MessageCircle} label="Origem" value="Meta Ads" />
          <Quick icon={Calendar} label="Data de criação" value="12/10/2026" />
        </div>
      </section>

      <div className="mx-6 mt-3 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm",
              tab === item ? "bg-[#2563EB] text-white" : "border border-slate-200 bg-white text-slate-600",
            )}
          >
            {item}
            {item === "WhatsApp" ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
          </button>
        ))}
      </div>

      <div className="mx-6 mb-6 mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Atividade</h2>
          <div className="mt-3 rounded-xl border border-slate-200 p-3">
            <textarea
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Registre uma atividade, ligação, retorno ou observação sobre o lead..."
              className="h-16 w-full resize-none bg-transparent text-sm outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{note.length}/500</span>
              <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-medium text-white">
                <Send className="h-3.5 w-3.5" /> Registrar atividade
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            <Clock className="h-4 w-4" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Atenção!</p>
              <p className="text-xs">O lead está atrasado na etapa atual.</p>
            </div>
            <div className="text-xs">
              <p>Motivo: Aguardando retorno do cliente</p>
              <p className="font-semibold text-orange-700">Tempo: 4 horas</p>
            </div>
            <ChevronRight className="h-4 w-4" />
          </div>
          <h3 className="mb-2 mt-5 text-sm font-semibold">Histórico de atividades</h3>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium",
                  filter === item.id ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <ul className="mt-3 divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white", item.tone)}>
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  <p className="truncate text-xs text-slate-500">{item.detail}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-medium text-slate-700">{item.who}</p>
                  <p className="text-[11px] text-slate-400">{item.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Ações rápidas</h2>
            <ul className="mt-2">
              {ACTIONS.map((action) => (
                <li key={action.label}>
                  <button type="button" className="flex w-full items-center gap-2 border-b border-slate-100 py-2.5 text-left text-sm text-slate-700 last:border-0">
                    <action.icon className="h-4 w-4 text-slate-400" />
                    <span className="flex-1">{action.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Status do monitoramento</h2>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ativo
            </p>
            <p className="mt-1 text-xs text-slate-500">O lead está sendo monitorado pela equipe.</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Ação principal da tela de origem</h2>
            <button type="button" className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-sm font-medium text-white">
              Ver imóveis sugeridos <ChevronRight className="h-4 w-4" />
            </button>
            <p className="mt-3 flex gap-2 text-[11px] text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              As ações e informações podem variar de acordo com a tela de origem e as permissões do usuário.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Quick({
  icon: Icon,
  label,
  value,
  pill,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  pill?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        {pill ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">{value}</span>
        ) : (
          <p className="text-sm font-medium text-slate-800">{value}</p>
        )}
      </div>
    </div>
  );
}

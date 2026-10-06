import { addDays, hojeYmd } from "@/components/tarefas-calendario";
import type { Tarefa } from "@/lib/tarefas-api";

export type TarefaVisivel = Tarefa & { demonstracao?: boolean };

function base(
  partial: Pick<Tarefa, "id" | "titulo" | "data" | "horario" | "prioridade" | "status"> & {
    atrasada?: boolean;
    responsavel: string;
    lead?: string;
    imovel?: string;
    atendimento?: string;
  },
): TarefaVisivel {
  return {
    id: partial.id,
    titulo: partial.titulo,
    descricao: "",
    data: partial.data,
    horario: partial.horario,
    prioridade: partial.prioridade,
    status: partial.status,
    atrasada: partial.atrasada ?? false,
    responsavel: { id: partial.responsavel, name: partial.responsavel },
    recorrencia: "nenhuma",
    diasSemana: [],
    intervaloDias: null,
    lembrete: "nenhum",
    lembreteMinutos: null,
    leadId: null,
    agendamentoId: null,
    imovelId: null,
    agendaEventoId: null,
    contexto: {
      lead: partial.lead ? { id: partial.lead, nome: partial.lead } : null,
      imovel: partial.imovel
        ? { id: partial.imovel, rotulo: partial.imovel }
        : null,
      atendimento: partial.atendimento
        ? { id: partial.atendimento, titulo: partial.atendimento }
        : null,
    },
    comentarios: [],
    demonstracao: true,
  };
}

export function tarefasDemonstracao(hoje = hojeYmd()): TarefaVisivel[] {
  const ontem = addDays(hoje, -1);
  const amanha = addDays(hoje, 1);
  return [
    base({
      id: "mock-joao",
      titulo: "Retornar contato de João Silva",
      data: ontem,
      horario: "14:00",
      prioridade: "alta",
      status: "aberta",
      atrasada: true,
      responsavel: "Eduardo Alves",
      lead: "João Silva",
    }),
    base({
      id: "mock-proposta",
      titulo: "Enviar proposta comercial",
      data: ontem,
      horario: "15:00",
      prioridade: "alta",
      status: "aberta",
      atrasada: true,
      responsavel: "Ana Costa",
      imovel: "Residencial Jardim",
    }),
    base({
      id: "mock-carlos-ontem",
      titulo: "Ligar para Carlos Silva",
      data: ontem,
      horario: "14:00",
      prioridade: "alta",
      status: "aberta",
      atrasada: true,
      responsavel: "Eduardo Alves",
      lead: "Carlos Silva",
    }),
    base({
      id: "mock-docs",
      titulo: "Enviar documentação do imóvel",
      data: hoje,
      horario: "16:30",
      prioridade: "media",
      status: "aberta",
      responsavel: "Ana Costa",
      imovel: "Apt. Boa Viagem",
    }),
    base({
      id: "mock-maria",
      titulo: "Fazer follow-up com Maria",
      data: hoje,
      horario: "18:00",
      prioridade: "baixa",
      status: "aberta",
      responsavel: "Eduardo Alves",
      lead: "Maria Oliveira",
    }),
    base({
      id: "mock-carlos-hoje",
      titulo: "Ligar para Carlos Silva",
      data: hoje,
      horario: "14:00",
      prioridade: "alta",
      status: "aberta",
      responsavel: "Eduardo Alves",
      lead: "Carlos Silva",
    }),
    base({
      id: "mock-visita",
      titulo: "Preparar visita ao apartamento",
      data: amanha,
      horario: "09:00",
      prioridade: "media",
      status: "aberta",
      responsavel: "Paulo Lima",
      atendimento: "Atendimento #1842",
    }),
    base({
      id: "mock-contrato",
      titulo: "Revisar contrato de locação",
      data: amanha,
      horario: "11:00",
      prioridade: "alta",
      status: "aberta",
      responsavel: "Eduardo Alves",
      imovel: "Casa em Casa Forte",
    }),
    base({
      id: "mock-cadastro",
      titulo: "Atualizar cadastro do cliente",
      data: hoje,
      horario: "10:00",
      prioridade: "baixa",
      status: "concluida",
      responsavel: "Fernanda Alves",
      lead: "Fernanda Santos",
    }),
    base({
      id: "mock-roberto",
      titulo: "Confirmar visita com Roberto",
      data: hoje,
      horario: "11:00",
      prioridade: "media",
      status: "concluida",
      responsavel: "Eduardo Alves",
      atendimento: "Atendimento #1839",
    }),
  ];
}

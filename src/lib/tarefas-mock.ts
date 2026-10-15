import { addDays } from "@/components/tarefas-calendario";
import type { AgendamentoTipo } from "@/lib/agenda-api";
import type { Tarefa, TarefaEtiqueta, TarefaPrioridade } from "@/lib/tarefas-api";

export function tarefaMock(id: string) {
  return id.startsWith("mock-");
}

export function tarefasMock(hoje: string, responsavel: { id: string; name: string }): Tarefa[] {
  const ontem = addDays(hoje, -1);
  const amanha = addDays(hoje, 1);
  const base = (
    parcial: Pick<Tarefa, "id" | "titulo" | "descricao" | "data" | "horario" | "prioridade" | "tipo" | "etiqueta" | "status"> & {
      lead?: string;
      imovel?: string;
    },
  ): Tarefa => ({
    id: parcial.id,
    titulo: parcial.titulo,
    descricao: parcial.descricao,
    data: parcial.data,
    horario: parcial.horario,
    prioridade: parcial.prioridade,
    tipo: parcial.tipo,
    etiqueta: parcial.etiqueta,
    status: parcial.status,
    atrasada: parcial.status === "aberta" && parcial.data < hoje,
    responsavel,
    recorrencia: "nenhuma",
    diasSemana: [],
    intervaloDias: null,
    lembrete: "nenhum",
    lembreteMinutos: null,
    leadId: null,
    agendamentoId: null,
    imovelId: null,
    empreendimentoId: null,
    agendaEventoId: null,
    contexto: {
      lead: parcial.lead ? { id: `${parcial.id}-lead`, nome: parcial.lead } : null,
      atendimento: null,
      imovel: parcial.imovel ? { id: `${parcial.id}-imovel`, rotulo: parcial.imovel } : null,
    },
    comentarios: [],
  });

  const linha = (
    id: string,
    titulo: string,
    descricao: string,
    data: string,
    horario: string,
    prioridade: TarefaPrioridade,
    tipo: AgendamentoTipo,
    etiqueta: TarefaEtiqueta,
    status: Tarefa["status"],
    lead?: string,
    imovel?: string,
  ) => base({ id: `mock-${id}`, titulo, descricao, data, horario, prioridade, tipo, etiqueta, status, lead, imovel });

  return [
    linha("1", "Reunião com cliente – João Silva", "Apresentar proposta do empreendimento Vista do Mar.", hoje, "07:00", "alta", "reuniao", "cliente", "aberta", "João Silva", "Vista do Mar"),
    linha("2", "Retorno de ligação – Fernanda Costa", "Cliente interessada no Residencial Aurora.", hoje, "08:30", "media", "ligacao", "ligacao", "aberta", "Fernanda Costa", "Residencial Aurora"),
    linha("3", "Atualizar cadastro – Carlos Mendes", "Enviar documentos pendentes.", hoje, "10:00", "baixa", "tarefa", "documentos", "aberta", "Carlos Mendes", "Solar das Torres"),
    linha("4", "Acompanhar captação – Zona Sul", "Visitar imóvel e enviar relatório fotográfico.", hoje, "11:30", "media", "visita", "captacao", "aberta", "Zona Sul", "Terreno 450m²"),
    linha("5", "Reunião interna – Equipe de vendas", "Alinhar metas e novos leads da semana.", hoje, "13:00", "baixa", "reuniao", "interna", "aberta", "Equipe de Vendas"),
    linha("6", "Follow-up – Cliente Letícia", "Verificar andamento do financiamento.", hoje, "15:00", "media", "ligacao", "followup", "aberta", "Letícia Souza", "Condomínio Bella Vida"),
    linha("7", "Enviar contrato – Ricardo Alves", "Contrato de compra e venda já revisado.", hoje, "16:30", "alta", "outro", "contrato", "aberta", "Ricardo Alves", "Reserva do Bosque"),
    linha("8", "Confirmar visita – Marina Dias", "Visita ao decorado no fim da tarde.", hoje, "18:00", "baixa", "visita", "captacao", "concluida", "Marina Dias", "Jardim das Águas"),
    linha("13", "Enviar boleto da reserva", "Segunda via para o cliente.", hoje, "18:30", "media", "tarefa", "contrato", "concluida", "João Silva"),
    linha("14", "Registrar feedback da visita", "Anotar objeções do plantão.", hoje, "19:00", "baixa", "tarefa", "interna", "concluida"),
    linha("15", "Atualizar funil da manhã", "Mover leads atendidos.", hoje, "19:30", "media", "tarefa", "documentos", "concluida"),
    linha("16", "Fechar relatório do dia", "Resumo para a equipe.", hoje, "20:00", "baixa", "tarefa", "interna", "concluida"),
    linha("9", "Ligar para proposta parada", "Cliente pediu retorno sobre as condições.", amanha, "09:00", "media", "ligacao", "ligacao", "aberta", "Paulo Carvalho"),
    linha("10", "Separar pasta de documentos", "Conferir RG, comprovante e ficha.", amanha, "14:00", "baixa", "tarefa", "documentos", "aberta", "Ana Ribeiro"),
    linha("11", "Retornar proposta vencida", "Prazo da reserva terminou ontem.", ontem, "09:30", "alta", "tarefa", "cliente", "aberta", "Eduardo Lima", "Park View"),
    linha("12", "Reagendar visita perdida", "Cliente não compareceu ao plantão.", ontem, "11:00", "media", "visita", "captacao", "aberta", "Camila Nunes"),
  ];
}

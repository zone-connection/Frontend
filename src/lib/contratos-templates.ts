export type ContratoFieldType =
  | "text"
  | "cpf"
  | "cnpj"
  | "phone"
  | "date"
  | "money"
  | "yesno"
  | "textarea"
  | "check";

export type ContratoField = {
  key: string;
  label: string;
  type: ContratoFieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
};

export type ContratoTemplateId =
  | "carta-cancelamento"
  | "recibo-pagamento"
  | "parentesco-sem-conjuge"
  | "parentesco-com-conjuge"
  | "intermediacao"
  | "checklist-renda-informal"
  | "saas-ouro"
  | "saas-prata-admin"
  | "saas-prata-financeiro";

export type ContratoTemplate = {
  id: ContratoTemplateId;
  titulo: string;
  descricao: string;
  fields: ContratoField[];
};

const SAAS_CONTRATO_FIELDS: ContratoField[] = [
  {
    key: "contratadaNome",
    label: "Contratada (nome)",
    type: "text",
    required: true,
    defaultValue: "ZONE CONNECTION",
  },
  {
    key: "contratadaRepresentante",
    label: "Representante da contratada",
    type: "text",
    required: true,
    defaultValue: "Eduardo Alves de Santana",
  },
  {
    key: "contratadaCpf",
    label: "CPF do representante da contratada",
    type: "cpf",
    required: true,
    defaultValue: "712.919.534-77",
  },
  {
    key: "contratadaCidade",
    label: "Sede da contratada",
    type: "text",
    required: true,
    defaultValue: "Camaragibe, Estado de Pernambuco",
  },
  {
    key: "contratanteNome",
    label: "Contratante (razão social)",
    type: "text",
    required: true,
    placeholder: "Imobiliária Exemplo LTDA",
  },
  {
    key: "contratanteCnpj",
    label: "CNPJ do contratante",
    type: "cnpj",
    required: true,
  },
  {
    key: "contratanteEndereco",
    label: "Sede do contratante",
    type: "textarea",
    required: true,
  },
  {
    key: "contratanteRepresentante",
    label: "Representante do contratante",
    type: "text",
    required: true,
  },
  {
    key: "contratanteCargo",
    label: "Cargo do representante",
    type: "text",
    required: true,
    defaultValue: "Diretor Executivo",
  },
  {
    key: "contratanteCpf",
    label: "CPF do representante do contratante",
    type: "cpf",
    required: true,
  },
  {
    key: "diaVencimento",
    label: "Dia de vencimento (todo mês)",
    type: "text",
    required: true,
    placeholder: "10",
  },
  { key: "data", label: "Data do contrato", type: "date", required: true },
];

export const SAAS_CONTRATO_IDS: ContratoTemplateId[] = [
  "saas-ouro",
  "saas-prata-admin",
  "saas-prata-financeiro",
];

export function isSaasContratoTemplate(id: ContratoTemplateId) {
  return SAAS_CONTRATO_IDS.includes(id);
}

const SAAS_CONTRATO_TEMPLATES: ContratoTemplate[] = [
  {
    id: "saas-ouro",
    titulo: "Licença SaaS — Plano Ouro",
    descricao:
      "Contrato de licença de uso com CRM, financeiro, administrativo e até 30 usuários.",
    fields: SAAS_CONTRATO_FIELDS,
  },
  {
    id: "saas-prata-admin",
    titulo: "Licença SaaS — Plano Prata Administrativo",
    descricao:
      "CRM Bronze mais módulo administrativo: equipes, ranking, metas, propostas e conversão.",
    fields: SAAS_CONTRATO_FIELDS,
  },
  {
    id: "saas-prata-financeiro",
    titulo: "Licença SaaS — Plano Prata Financeiro",
    descricao:
      "CRM Bronze mais financeiro: pagar, receber, fluxo de caixa e comissionamento.",
    fields: SAAS_CONTRATO_FIELDS,
  },
];

export const CONTRATO_TEMPLATES: ContratoTemplate[] = [
  {
    id: "carta-cancelamento",
    titulo: "Carta de cancelamento",
    descricao:
      "Solicitação de cancelamento de avaliação habitacional em construtora.",
    fields: [
      { key: "nome", label: "Nome completo", type: "text", required: true },
      {
        key: "rg",
        label: "RG",
        type: "text",
        required: true,
        placeholder: "0000000",
      },
      { key: "cpf", label: "CPF", type: "cpf", required: true },
      {
        key: "cidade",
        label: "Cidade",
        type: "text",
        required: true,
        defaultValue: "Paulista",
      },
      { key: "data", label: "Data", type: "date", required: true },
    ],
  },
  {
    id: "recibo-pagamento",
    titulo: "Recibo de pagamento",
    descricao:
      "Comprovante de recebimento com valor, pagador e referência — duas vias por página.",
    fields: [
      {
        key: "pagadorNome",
        label: "Nome do pagador",
        type: "text",
        required: true,
      },
      {
        key: "pagadorCpf",
        label: "CPF do pagador",
        type: "cpf",
        required: true,
      },
      {
        key: "valor",
        label: "Valor (R$)",
        type: "money",
        required: true,
      },
      {
        key: "valorExtenso",
        label: "Valor por extenso",
        type: "text",
        required: true,
        placeholder: "mil reais",
      },
      {
        key: "referente",
        label: "Referente à",
        type: "textarea",
        required: true,
        placeholder: "Sinal do imóvel, honorários, taxa…",
      },
      {
        key: "cidade",
        label: "Cidade",
        type: "text",
        required: true,
      },
      { key: "data", label: "Data", type: "date", required: true },
      {
        key: "empresaNome",
        label: "Quem recebe (imobiliária)",
        type: "text",
        required: true,
      },
      {
        key: "empresaTelefone",
        label: "Telefone",
        type: "phone",
        required: false,
      },
    ],
  },
  {
    id: "parentesco-sem-conjuge",
    titulo: "Declaração de parentesco (sem cônjuge)",
    descricao:
      "Parenteco, residência e ausência de rendimentos — sem cônjuge do parente.",
    fields: [
      {
        key: "nomeParente",
        label: "Nome do parente",
        type: "text",
        required: true,
      },
      {
        key: "cpfParente",
        label: "CPF do parente",
        type: "cpf",
        required: true,
      },
      {
        key: "estadoCivil",
        label: "Estado civil do parente",
        type: "text",
        required: true,
        placeholder: "solteiro(a)",
      },
      {
        key: "grauParentesco",
        label: "Grau de parentesco",
        type: "text",
        required: true,
        placeholder: "filho(a), mãe, pai…",
      },
      {
        key: "nomeProponente",
        label: "Nome do proponente",
        type: "text",
        required: true,
      },
      {
        key: "cpfProponente",
        label: "CPF do proponente",
        type: "cpf",
        required: true,
      },
      { key: "data", label: "Data", type: "date", required: true },
    ],
  },
  {
    id: "parentesco-com-conjuge",
    titulo: "Declaração de parentesco (com cônjuge)",
    descricao:
      "Parenteco, residência e ausência de rendimentos — com cônjuge do parente.",
    fields: [
      {
        key: "nomeParente",
        label: "Nome do parente",
        type: "text",
        required: true,
      },
      {
        key: "cpfParente",
        label: "CPF do parente",
        type: "cpf",
        required: true,
      },
      {
        key: "estadoCivil",
        label: "Estado civil do parente",
        type: "text",
        required: true,
      },
      {
        key: "grauParentesco",
        label: "Grau de parentesco",
        type: "text",
        required: true,
      },
      {
        key: "nomeProponente",
        label: "Nome do proponente",
        type: "text",
        required: true,
      },
      {
        key: "cpfProponente",
        label: "CPF do proponente",
        type: "cpf",
        required: true,
      },
      {
        key: "endereco",
        label: "Endereço residencial compartilhado",
        type: "text",
        required: true,
      },
      {
        key: "nomeConjuge",
        label: "Nome do cônjuge/companheiro do parente",
        type: "text",
        required: true,
      },
      { key: "data", label: "Data", type: "date", required: true },
    ],
  },
  {
    id: "intermediacao",
    titulo: "Contrato de intermediação",
    descricao:
      "Intermediação para compra/venda de imóvel entre contratante e contratada.",
    fields: [
      {
        key: "contratanteNome",
        label: "Contratante — nome",
        type: "text",
        required: false,
      },
      {
        key: "contratanteCpf",
        label: "Contratante — CPF",
        type: "cpf",
        required: false,
      },
      {
        key: "contratanteRg",
        label: "Contratante — RG",
        type: "text",
        required: false,
      },
      {
        key: "contratanteTel",
        label: "Contratante — telefone",
        type: "phone",
        required: false,
      },
      {
        key: "contratanteEmail",
        label: "Contratante — e-mail",
        type: "text",
        required: false,
      },
      {
        key: "contratanteEndereco",
        label: "Contratante — endereço",
        type: "text",
        required: false,
      },
      {
        key: "contratanteCep",
        label: "Contratante — CEP",
        type: "text",
        required: false,
      },
      {
        key: "proprietarioNome",
        label: "Proprietário — nome/razão social",
        type: "text",
        required: false,
      },
      {
        key: "proprietarioCnpj",
        label: "Proprietário — CNPJ/CPF",
        type: "cnpj",
        required: false,
      },
      {
        key: "proprietarioEndereco",
        label: "Proprietário — endereço",
        type: "text",
        required: false,
      },
      {
        key: "proprietarioTel",
        label: "Proprietário — telefone",
        type: "phone",
        required: false,
      },
      {
        key: "construtora",
        label: "Construtora",
        type: "text",
        required: false,
      },
      {
        key: "empreendimento",
        label: "Empreendimento",
        type: "text",
        required: false,
      },
      {
        key: "unidade",
        label: "Unidade (bloco/apto)",
        type: "text",
        required: false,
      },
      { key: "andar", label: "Andar", type: "text", required: false },
      {
        key: "descricaoImovel",
        label: "Descrição do imóvel",
        type: "text",
        required: false,
      },
      {
        key: "precoImovel",
        label: "Preço do imóvel (R$)",
        type: "money",
        required: false,
      },
      {
        key: "valorIntermediacao",
        label: "Valor da intermediação (R$)",
        type: "money",
        required: false,
      },
      {
        key: "valorIntermediacaoExtenso",
        label: "Valor da intermediação por extenso",
        type: "text",
        required: false,
        placeholder: "Dois Mil Reais",
      },
      {
        key: "banco",
        label: "Banco (pagamento)",
        type: "text",
        required: false,
        defaultValue: "Inter",
      },
      {
        key: "agencia",
        label: "Agência",
        type: "text",
        required: false,
        defaultValue: "0001-9",
      },
      {
        key: "conta",
        label: "Conta",
        type: "text",
        required: false,
        defaultValue: "1902391-0",
      },
      {
        key: "pix",
        label: "PIX",
        type: "text",
        required: false,
      },
      {
        key: "representanteLegal",
        label: "Representante legal (conta)",
        type: "text",
        required: false,
      },
      {
        key: "contratadaNome",
        label: "Contratada (imobiliária)",
        type: "text",
        required: false,
      },
      {
        key: "contratadaCnpj",
        label: "Contratada — CNPJ",
        type: "cnpj",
        required: false,
      },
      {
        key: "contratadaCreci",
        label: "Contratada — CRECI",
        type: "text",
        required: false,
      },
      {
        key: "contratadaEmail",
        label: "Contratada — e-mail",
        type: "text",
        required: false,
      },
      {
        key: "contratadaEndereco",
        label: "Contratada — endereço",
        type: "text",
        required: false,
      },
      {
        key: "cidade",
        label: "Cidade do contrato",
        type: "text",
        required: false,
      },
      { key: "data", label: "Data", type: "date", required: false },
      {
        key: "testemunha1Nome",
        label: "Testemunha 1 — nome",
        type: "text",
        required: false,
      },
      {
        key: "testemunha1Cpf",
        label: "Testemunha 1 — CPF",
        type: "cpf",
        required: false,
      },
      {
        key: "testemunha2Nome",
        label: "Testemunha 2 — nome",
        type: "text",
        required: false,
      },
      {
        key: "testemunha2Cpf",
        label: "Testemunha 2 — CPF",
        type: "cpf",
        required: false,
      },
    ],
  },
  {
    id: "checklist-renda-informal",
    titulo: "Checklist renda informal / mista",
    descricao:
      "Checklist de renda informal ou mista para análise habitacional.",
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "cpf", label: "CPF", type: "cpf", required: true },
      {
        key: "rendaSolicitada",
        label: "Renda solicitada",
        type: "money",
        required: true,
      },
      {
        key: "profissao",
        label: "Profissão exata",
        type: "text",
        required: true,
      },
      {
        key: "rendaParcialExtratos",
        label: "Renda parcial apurada nos extratos",
        type: "money",
        required: true,
      },
      {
        key: "bolsaFamilia",
        label: "Cliente possui Bolsa Família?",
        type: "yesno",
        required: true,
      },
      {
        key: "bolsaFamiliaValor",
        label: "Valor mensal do Bolsa Família",
        type: "money",
        required: false,
      },
      {
        key: "vinculoEmpregaticio",
        label: "Possui vínculo empregatício?",
        type: "yesno",
        required: false,
      },
      {
        key: "empresa",
        label: "Empresa",
        type: "text",
        required: false,
      },
      {
        key: "salarioContracheque",
        label: "Salário (conforme contracheque)",
        type: "money",
        required: false,
      },
      {
        key: "docExtratos",
        label: "Extratos bancários dos últimos 6 meses",
        type: "check",
        required: false,
      },
      {
        key: "docContracheques",
        label: "Contracheques (renda mista)",
        type: "check",
        required: false,
      },
      {
        key: "docFgts",
        label: "Extrato do FGTS com recolhimento do mesmo mês do contracheque",
        type: "check",
        required: false,
      },
      {
        key: "docIdentidade",
        label: "Documento de identificação",
        type: "check",
        required: false,
      },
      {
        key: "docOutros",
        label: "Outros documentos",
        type: "check",
        required: false,
      },
      {
        key: "docOutrosTexto",
        label: "Quais outros documentos",
        type: "text",
        required: false,
      },
      {
        key: "observacoes",
        label: "Observações",
        type: "textarea",
        required: false,
      },
      {
        key: "cidade",
        label: "Cidade",
        type: "text",
        required: true,
      },
      { key: "data", label: "Data", type: "date", required: true },
    ],
  },
  ...SAAS_CONTRATO_TEMPLATES,
];

export function getContratoTemplate(id: ContratoTemplateId) {
  return CONTRATO_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function emptyContratoForm(template: ContratoTemplate) {
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    values[field.key] = field.defaultValue ?? "";
  }
  return values;
}

export function contratoTemplatesForRole(role?: string | null) {
  return CONTRATO_TEMPLATES.filter((template) => {
    if (role === "super_admin") return isSaasContratoTemplate(template.id);
    if (isSaasContratoTemplate(template.id)) return false;
    if (role === "corretor" && template.id === "recibo-pagamento") return false;
    return true;
  });
}

type LeadContratoSource = {
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  bairro: string;
  estadoCivil?: string | null;
  construtora?: { nome: string } | null;
  empreendimento?: { nome: string; cidade?: string | null } | null;
  prospeccao?: { endereco?: string | null } | null;
};

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Preenche campos do contrato com o que já existe no lead. */
export function applyLeadToContratoForm(
  values: Record<string, string>,
  lead: LeadContratoSource,
): Record<string, string> {
  const next = { ...values };
  const nome = lead.nome.trim();
  const telefone = lead.telefone.trim();
  const email = lead.email.trim();
  const cidade = lead.cidade.trim();
  const endereco = [
    lead.prospeccao?.endereco?.trim(),
    lead.bairro.trim(),
    lead.cidade.trim(),
  ]
    .filter(Boolean)
    .join(" — ");

  const fill = (key: string, value: string) => {
    if (!value || !(key in next)) return;
    if (!next[key]?.trim()) next[key] = value;
  };

  fill("nome", nome);
  fill("pagadorNome", nome);
  fill("contratanteNome", nome);
  fill("nomeProponente", nome);
  fill("contratanteTel", telefone);
  fill("contratanteEmail", email);
  fill("cidade", cidade || lead.empreendimento?.cidade?.trim() || "");
  fill("contratanteEndereco", endereco);
  fill("endereco", endereco);
  fill("estadoCivil", lead.estadoCivil?.trim() || "");
  fill("construtora", lead.construtora?.nome?.trim() || "");
  fill("empreendimento", lead.empreendimento?.nome?.trim() || "");
  fill("proprietarioNome", lead.construtora?.nome?.trim() || "");
  fill("data", todayIsoDate());
  return next;
}

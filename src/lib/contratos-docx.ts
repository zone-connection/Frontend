import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
import { loadContractLogo, type LoadedLogo } from "@/lib/contratos-pdf";

type Values = Record<string, string>;

const TEAL = "0E8C98";
const LINE = "D6DEE2";
const LABEL = "60686E";

function field(values: Values, key: string) {
  return (values[key] ?? "").trim() || "____________________";
}

function longDate(iso: string) {
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const [year, month, day] = iso.slice(0, 10).split("-");
  const index = Number(month) - 1;
  if (year && day && months[index]) {
    return `${Number(day)} de ${months[index]} de ${year}`;
  }
  return "____ de ____________ de ________";
}

function hexColor(value?: string | null, fallback = TEAL) {
  const hex = value?.trim().replace(/^#/, "");
  return hex && /^[\da-f]{6}$/i.test(hex) ? hex.toUpperCase() : fallback;
}

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function fadedLogo(logo: LoadedLogo) {
  if (typeof document === "undefined") return dataUrlBytes(logo.dataUrl);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("logo"));
    element.src = logo.dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = logo.width;
  canvas.height = logo.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrlBytes(logo.dataUrl);
  ctx.globalAlpha = 0.1;
  ctx.drawImage(image, 0, 0);
  return dataUrlBytes(canvas.toDataURL("image/png"));
}

const thin = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: LINE,
} as const;

const borders = { top: thin, bottom: thin, left: thin, right: thin };

function run(text: string, opts?: { bold?: boolean; color?: string; size?: number }) {
  return new TextRun({
    text,
    bold: opts?.bold,
    color: opts?.color ?? "1A1A1A",
    size: opts?.size ?? 20,
    font: "Calibri",
  });
}

function paragraph(
  text: string,
  opts?: { bold?: boolean; color?: string; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; space?: number },
) {
  return new Paragraph({
    alignment: opts?.align,
    spacing: { after: opts?.space ?? 120, line: 276 },
    children: [run(text, opts)],
  });
}

function cell(
  text: string,
  opts?: {
    span?: number;
    bold?: boolean;
    color?: string;
    fill?: string;
    size?: number;
    width?: number;
  },
) {
  return new TableCell({
    borders,
    columnSpan: opts?.span,
    width: opts?.width
      ? { size: opts.width, type: WidthType.DXA }
      : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts?.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill }
      : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [
          run(text, {
            bold: opts?.bold,
            color: opts?.color,
            size: opts?.size ?? 18,
          }),
        ],
      }),
    ],
  });
}

function sheet(rows: TableCell[][], accent: string) {
  return new Table({
    width: { size: 10080, type: WidthType.DXA },
    rows: rows.map(
      (cells, index) =>
        new TableRow({
          cantSplit: true,
          children:
            index === 0 && cells.length === 1
              ? cells
              : cells,
        }),
    ),
  });
}

function pairRow(
  label: string,
  value: string,
  label2?: string,
  value2?: string,
) {
  if (label2 === undefined) {
    return [
      cell(label, { bold: true, color: LABEL, size: 16, width: 1800 }),
      cell(value, { bold: true, span: 3, width: 8280 }),
    ];
  }
  return [
    cell(label, { bold: true, color: LABEL, size: 16, width: 1800 }),
    cell(value, { bold: true, width: 3240 }),
    cell(label2, { bold: true, color: LABEL, size: 16, width: 2000 }),
    cell(value2 ?? "", { bold: true, width: 3040 }),
  ];
}

function partyTable(
  title: string,
  accent: string,
  fill: string,
  rows: Array<[string, string] | [string, string, string, string]>,
) {
  return sheet([
    [cell(title, { span: 4, bold: true, color: accent, fill, size: 20 })],
    ...rows.map((row) =>
      row.length === 2
        ? pairRow(row[0], row[1])
        : pairRow(row[0], row[1], row[2], row[3]),
    ),
  ], accent);
}

function factTable(accent: string, fill: string, values: Values) {
  const unidade = [
    (values.unidade ?? "").trim(),
    (values.andar ?? "").trim() ? `Andar ${(values.andar ?? "").trim()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const label = (text: string, span = 1) =>
    cell(text, { span, bold: true, color: LABEL, fill, size: 15 });
  const value = (text: string, span = 1) =>
    cell(text, { span, bold: true, size: 20 });
  return sheet([
    [label("CONSTRUTORA"), label("EMPREENDIMENTO")],
    [value(field(values, "construtora")), value(field(values, "empreendimento"))],
    [label("BLOCO"), label("UNIDADE")],
    [value(field(values, "bloco")), value(unidade || "____________________")],
    [label("DESCRIÇÃO DO IMÓVEL"), label("VALOR DA UNIDADE")],
    [
      value(field(values, "descricaoImovel")),
      value(`R$ ${field(values, "precoImovel")}`),
    ],
    [label("VALOR DA INTERMEDIAÇÃO", 2)],
    [value(`R$ ${field(values, "valorIntermediacao")}`, 2)],
  ], accent);
}

function gap() {
  return new Paragraph({ spacing: { after: 160 }, children: [] });
}

function safeName(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 40);
}

export async function downloadContratoDocx(
  values: Values,
  opts?: { logoUrl?: string | null; primaryColor?: string | null },
) {
  const logo = await loadContractLogo(opts?.logoUrl);
  const accent = hexColor(opts?.primaryColor ?? logo?.primaryHex);
  const fill = "F4F8F9";
  const cidade = (values.cidade ?? "").trim();
  const foro = cidade
    ? `Fica eleito o Foro da Comarca de ${cidade}, que será o competente para dirimir quaisquer questões oriundas do presente acordo, renunciando as partes a qualquer outro, por mais privilegiado que seja.`
    : "Fica eleito o Foro da Comarca de Recife, Estado de Pernambuco, que será o competente para dirimir quaisquer questões oriundas do presente acordo, renunciando as partes a qualquer outro, por mais privilegiado que seja.";

  const headerChildren: Paragraph[] = [
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 18, color: accent, space: 1 },
      },
      spacing: { after: 80 },
      children: [],
    }),
  ];

  if (logo) {
    const bytes = dataUrlBytes(logo.dataUrl);
    const faded = await fadedLogo(logo);
    const ratio = logo.width / logo.height || 1;
    const headerW = 78;
    headerChildren.unshift(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new ImageRun({
            type: logo.format === "JPEG" ? "jpg" : "png",
            data: bytes,
            transformation: {
              width: headerW,
              height: Math.round(headerW / ratio),
            },
          }),
          new ImageRun({
            type: "png",
            data: faded,
            transformation: { width: 280, height: Math.round(280 / ratio) },
            floating: {
              horizontalPosition: {
                relative: HorizontalPositionRelativeFrom.PAGE,
                align: HorizontalPositionAlign.CENTER,
              },
              verticalPosition: {
                relative: VerticalPositionRelativeFrom.PAGE,
                align: VerticalPositionAlign.CENTER,
              },
              behindDocument: true,
            },
          }),
        ],
      }),
    );
  }

  const contratadaExtra = [
    `CNPJ: ${field(values, "contratadaCnpj")}`,
    (values.contratadaCreci ?? "").trim()
      ? `CRECI: ${values.contratadaCreci.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("   ");

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 700, bottom: 800, left: 900, right: 900 },
          },
        },
        headers: { default: new Header({ children: headerChildren }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  run(field(values, "contratadaNome") === "____________________" ? "Contrato de intermediação" : field(values, "contratadaNome"), { size: 16, color: "666666" }),
                  run("    ", { size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: "666666" }),
                  run(" / ", { size: 16, color: "666666" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 16, color: "666666" }),
                ],
              }),
            ],
          }),
        },
        children: [
          paragraph("CONTRATO DE INTERMEDIAÇÃO", {
            bold: true,
            color: accent,
            size: 28,
            align: AlignmentType.CENTER,
            space: 0,
          }),
          paragraph("PARA COMPRA/VENDA DE IMÓVEL", {
            bold: true,
            color: accent,
            size: 28,
            align: AlignmentType.CENTER,
            space: 200,
          }),
          paragraph(
            "Por este instrumento particular, as partes qualificadas na Cláusula 1ª resolvem, por livre e espontânea vontade, firmar o presente contrato de intermediação para fins de compra/venda de imóvel conforme os termos e condições estabelecidos nas cláusulas seguintes:",
            { size: 20, space: 200 },
          ),
          paragraph("CLÁUSULA 1ª – DAS PARTES", {
            bold: true,
            color: accent,
            size: 22,
            space: 120,
          }),
          partyTable("CONTRATANTE", accent, fill, [
            ["NOME", field(values, "contratanteNome"), "CPF", field(values, "contratanteCpf")],
            ["RG", field(values, "contratanteRg"), "ÓRGÃO EMISSOR", field(values, "contratanteRgOrgao")],
            ["TELEFONE", field(values, "contratanteTel"), "E-MAIL", field(values, "contratanteEmail")],
            ["ENDEREÇO", field(values, "contratanteEndereco")],
            ["CEP", field(values, "contratanteCep")],
          ]),
          gap(),
          partyTable("PROPRIETÁRIO", accent, fill, [
            ["NOME / RAZÃO SOCIAL", field(values, "proprietarioNome"), "CNPJ/CPF", field(values, "proprietarioCnpj")],
            ["ENDEREÇO", field(values, "proprietarioEndereco")],
            ["TELEFONE", field(values, "proprietarioTel")],
          ]),
          gap(),
          partyTable("CONTRATADA", accent, fill, [
            ["IMOBILIÁRIA", field(values, "contratadaNome"), "CNPJ", field(values, "contratadaCnpj")],
            ["CRECI", field(values, "contratadaCreci"), "E-MAIL", field(values, "contratadaEmail")],
            ["ENDEREÇO", field(values, "contratadaEndereco")],
          ]),
          gap(),
          paragraph("CLÁUSULA 2ª – OBJETO DO CONTRATO", {
            bold: true,
            color: accent,
            size: 22,
            space: 120,
          }),
          paragraph(
            "O presente contrato tem por finalidade a contratação dos serviços profissionais de corretagem da CONTRATADA pelo CONTRATANTE, nos moldes do artigo 726 do Código Civil, e será considerado concluído, quando da assinatura do contrato de promessa de compra e venda entre o CONTRATANTE e o PROPRIETÁRIO do imóvel comercializado.",
          ),
          factTable(accent, fill, values),
          gap(),
          paragraph("CLÁUSULA 3ª – HONORÁRIOS DE CORRETAGEM – DO PAGAMENTO", {
            bold: true,
            color: accent,
            size: 22,
            space: 120,
          }),
          paragraph(
            `3.1 Para pagamento dos serviços de intermediação, o CONTRATANTE pagará à CONTRATADA, a título de honorários de corretagem, o valor de R$ ${field(values, "valorIntermediacao")} (${field(values, "valorIntermediacaoExtenso")}).`,
          ),
          paragraph(
            "3.2 O pagamento dos honorários à CONTRATADA ocorrerá no momento em que o CONTRATANTE assinar o contrato de compra e venda com o PROPRIETÁRIO do imóvel em questão.",
          ),
          sheet([
            [cell("DADOS PARA PAGAMENTO", { bold: true, color: accent, fill, size: 20 })],
            [cell(`Banco: ${field(values, "banco")}`, { size: 20 })],
            [cell(`Agência: ${field(values, "agencia")}    Conta: ${field(values, "conta")}`, { size: 20 })],
            [cell(`PIX (CNPJ ou chave): ${field(values, "pix")}`, { size: 20 })],
            [cell(`Representante legal: ${field(values, "representanteLegal")}`, { size: 20 })],
          ], accent),
          gap(),
          paragraph(
            "3.4 Serão devidos os honorários de corretagem, independentemente do arrependimento do CONTRATANTE após a assinatura do contrato de compra e venda.",
          ),
          paragraph("CLÁUSULA 4ª – DISPOSIÇÕES GERAIS", {
            bold: true,
            color: accent,
            size: 22,
            space: 120,
          }),
          paragraph(
            "4.1 Cumpre a CONTRATADA apresentar, ao oferecer o imóvel, dados rigorosamente certos, nunca omitindo detalhes que o depreciem, informando às partes dos riscos e demais circunstâncias que possam influenciar o negócio.",
          ),
          paragraph(
            "4.2 A CONTRATADA poderá firmar parcerias ou com outros corretores de imóveis com vistas à execução do presente contrato.",
          ),
          paragraph("CLÁUSULA 5ª – DA IRREVOGABILIDADE E IRRETRATABILIDADE", {
            bold: true,
            color: accent,
            size: 22,
            space: 120,
          }),
          paragraph(
            "As partes celebram o presente contrato de forma irrevogável e irretratável, relativo ao serviço de corretagem, ainda que o CONTRATANTE se arrependa e requeira o destrato de compra e venda do imóvel do PROPRIETÁRIO.",
          ),
          paragraph("CLÁUSULA 6ª – DA PROTEÇÃO DOS DADOS PESSOAIS", {
            bold: true,
            color: accent,
            size: 22,
            space: 120,
          }),
          paragraph(
            "6.1 A CONTRATADA se compromete a obedecer os preceitos da legislação que regula o tratamento de dados pessoais no Brasil, em especial a Lei 12.965/14 (Marco Civil da Internet) e Lei 13.709/2018 (Lei Geral de Proteção de Dados), mantendo o mais completo e absoluto sigilo sobre os dados pessoais que lhe foram confiados, não podendo sob qualquer fundamento ou pretexto divulgar, compartilhar, comercializar (no todo ou em parte) ou deles dar conhecimento a terceiros, sob as penas da lei e responsabilizando-se perante o CONTRATANTE, pelos prejuízos causados pela não observância desta cláusula.",
          ),
          paragraph(
            "6.2 Havendo indícios de descumprimento parcial ou total desta cláusula, os CONTRATADOS estarão sujeitos a responsabilização por danos materiais e morais/extra patrimoniais.",
          ),
          paragraph("CLÁUSULA 7ª – DO FORO DE COMPETÊNCIA", {
            bold: true,
            color: accent,
            size: 22,
            space: 120,
          }),
          paragraph(foro),
          paragraph(
            "E, para firmeza de todo o conteúdo aqui exposto, assinam o presente contrato em 03 (três) vias de igual teor.",
          ),
          paragraph(`${field(values, "cidade")}, ${longDate(values.data ?? "")}`, {
            bold: true,
            align: AlignmentType.CENTER,
            space: 280,
          }),
          sheet([
            [
              cell("CONTRATANTE", { bold: true, color: accent, size: 18 }),
              cell("CONTRATADO", { bold: true, color: accent, size: 18 }),
            ],
            [
              cell(`\n\n${field(values, "contratanteNome")}\nCPF: ${field(values, "contratanteCpf")}`, { size: 18 }),
              cell(`\n\n${field(values, "contratadaNome")}\n${contratadaExtra}`, { size: 18 }),
            ],
            [
              cell("TESTEMUNHA 1", { bold: true, color: accent, size: 18 }),
              cell("TESTEMUNHA 2", { bold: true, color: accent, size: 18 }),
            ],
            [
              cell(
                `\n\n${(values.testemunha1Nome ?? "").trim() || "____________________"}\nCPF: ${(values.testemunha1Cpf ?? "").trim() || "____________________"}`,
                { size: 18 },
              ),
              cell(
                `\n\n${(values.testemunha2Nome ?? "").trim() || "____________________"}\nCPF: ${(values.testemunha2Cpf ?? "").trim() || "____________________"}`,
                { size: 18 },
              ),
            ],
          ], accent),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `contrato-intermediacao-${safeName(field(values, "contratanteNome"))}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}

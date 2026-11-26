import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { loadContractLogo, resolveContratoBrandHex } from "@/lib/contratos-pdf";
import {
  listaDocumentoFileSlug,
  type ListaDocumentoPdfInput,
} from "@/lib/lista-documentos-pdf";

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function downloadListaDocumentoDocx(input: ListaDocumentoPdfInput) {
  const hex = (await resolveContratoBrandHex(input.logoUrl, input.primaryColor)).replace("#", "");
  const logo = await loadContractLogo(input.logoUrl);
  const children: Paragraph[] = [];

  if (logo) {
    const ratio = logo.width / logo.height || 1;
    const width = 140;
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new ImageRun({
            type: logo.format === "JPEG" ? "jpg" : "png",
            data: dataUrlBytes(logo.dataUrl),
            transformation: { width, height: Math.round(width / ratio) },
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "LISTA DE DOCUMENTOS",
          bold: true,
          size: 18,
          color: hex,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: "Tipo de renda: ", bold: true, size: 36, font: "Calibri" }),
        new TextRun({ text: input.nome, bold: true, size: 36, color: hex, font: "Calibri" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: input.intro, size: 21, font: "Calibri" })],
    }),
  );

  input.itens.forEach((item, index) => {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 40 },
        children: [
          new TextRun({
            text: `${index + 1}. ${item.titulo}`,
            bold: true,
            size: 22,
            font: "Calibri",
          }),
        ],
      }),
    );
    if (item.descricao.trim()) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: item.descricao, size: 20, font: "Calibri" })],
        }),
      );
    }
  });

  children.push(
    new Paragraph({
      spacing: { before: 280, after: 80 },
      children: [
        new TextRun({ text: "Importante", bold: true, size: 22, color: hex, font: "Calibri" }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: input.aviso, size: 20, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360 },
      children: [
        new TextRun({
          text: input.brandName.toUpperCase(),
          bold: true,
          size: 16,
          color: "64748B",
          font: "Calibri",
        }),
      ],
    }),
  );

  const file = await Packer.toBlob(
    new Document({
      sections: [{ children }],
    }),
  );
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lista-documentos-${listaDocumentoFileSlug(input.nome)}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}

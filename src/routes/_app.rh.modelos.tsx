import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { FILTER_BAR_SURFACE, FILTER_CONTROL, FILTER_NATIVE, TABLE_LUX, TABLE_SHELL } from "@/lib/filter-bar";
import { baixar, enviarArquivo, modelos } from "@/lib/rh-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/rh/modelos")({
  component: Page,
});

function Page() {
  const [lista, setLista] = useState<{ id: string; tipo: string; nome: string }[]>([]);
  const [erro, setErro] = useState("");

  async function carregar() {
    try {
      setErro("");
      setLista(await modelos());
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível carregar os modelos.");
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Modelos de contrato"
        description="Modelos distintos para corretor com CRECI e sem CRECI. Valide o texto juridicamente antes de usar."
      />
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
      <form
        className={cn(FILTER_BAR_SURFACE, "flex flex-wrap items-end gap-2")}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const arquivo = (form.elements.namedItem("arquivo") as HTMLInputElement).files?.[0];
          const nome = (form.elements.namedItem("nome") as HTMLInputElement).value;
          const tipo = (form.elements.namedItem("tipo") as HTMLSelectElement).value;
          if (!arquivo) return;
          void enviarArquivo("/rh/modelos", arquivo, { nome, tipo }).then(() => carregar());
          form.reset();
        }}
      >
        <Input name="nome" placeholder="Nome do modelo" required className={cn(FILTER_CONTROL, "max-w-xs")} />
        <select name="tipo" className={cn(FILTER_NATIVE, "w-40")}>
          <option value="com_creci">Com CRECI</option>
          <option value="sem_creci">Sem CRECI</option>
        </select>
        <Input name="arquivo" type="file" accept=".pdf,.docx" required className={cn(FILTER_CONTROL, "max-w-xs")} />
        <Button type="submit">Enviar modelo</Button>
      </form>
      {lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#E2E8EC] bg-white px-3 py-10 text-center text-sm text-[#5C6B76]">
          Nenhum modelo enviado.
        </p>
      ) : (
        <div className={TABLE_SHELL}>
          <Table className={TABLE_LUX}>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Arquivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{item.tipo === "com_creci" ? "Com CRECI" : "Sem CRECI"}</TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      className="text-sm font-medium text-[#079ED4]"
                      onClick={() =>
                        void baixar(`/rh/modelos/${item.id}`).then(({ blob, filename }) => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = filename || item.nome;
                          a.click();
                          URL.revokeObjectURL(url);
                        })
                      }
                    >
                      Baixar
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

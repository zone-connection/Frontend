import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { baixar, enviarArquivo, modelos } from "@/lib/rh-api";

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
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#D0BEF5] bg-gradient-to-br from-[#E6DBFF] to-[#F8F5FF] p-4"
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
        <Input name="nome" placeholder="Nome do modelo" required className="max-w-xs" />
        <select name="tipo" className="h-10 rounded-lg border bg-background px-2 text-sm">
          <option value="com_creci">Com CRECI</option>
          <option value="sem_creci">Sem CRECI</option>
        </select>
        <Input name="arquivo" type="file" accept=".pdf,.docx" required className="max-w-xs" />
        <Button type="submit">Enviar modelo</Button>
      </form>
      <ul className="space-y-1 text-sm">
        {lista.map((item) => (
          <li
            key={item.id}
            className={
              item.tipo === "com_creci"
                ? "rounded-2xl border border-[#9DCEF5] bg-gradient-to-br from-[#D3ECFE] to-[#F4F9FE] px-4 py-3"
                : "rounded-2xl border border-[#8FD9CF] bg-gradient-to-br from-[#C9F4EC] to-[#F3FBFA] px-4 py-3"
            }
          >
            <button
              type="button"
              className="font-medium text-primary underline"
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
              {item.nome}
            </button>
            <span className="text-muted-foreground">
              {" "}
              · {item.tipo === "com_creci" ? "com CRECI" : "sem CRECI"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

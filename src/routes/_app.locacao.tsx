import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSignature, Kanban, Store } from "lucide-react";

export const Route = createFileRoute("/_app/locacao")({
  head: () => ({ meta: [{ title: "Locação — Zone Connection" }] }),
  component: LocacaoVisaoGeralPage,
});

const PASTAS = [
  {
    title: "Funil",
    description:
      "O quadro de locação ainda não tem telas. Quando existir, o processo do imóvel para alugar fica aqui, separado do funil de lançamentos.",
    icon: Kanban,
  },
  {
    title: "Carteira",
    description:
      "Estoque, visitas e interessados de locação ainda não têm telas. O cadastro físico do imóvel continua em Catálogo.",
    icon: Store,
  },
  {
    title: "Contratos",
    description:
      "Contratos de locação ainda não têm telas. O fechamento de lançamento continua em Fechamento.",
    icon: FileSignature,
  },
];

function LocacaoVisaoGeralPage() {
  return (
    <>
      <PageHeader
        title="Locação"
        description="Esta seção reúne a operação de aluguel. Funil, carteira e contratos ainda não têm telas."
      />
      <div className="grid gap-3 md:grid-cols-3">
        {PASTAS.map((pasta) => {
          const Icon = pasta.icon;
          return (
            <Card key={pasta.title}>
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <div className="rounded-lg border bg-muted/40 p-2">
                  <Icon className="h-5 w-5 text-brand-accent" />
                </div>
                <CardTitle className="text-base">{pasta.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{pasta.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

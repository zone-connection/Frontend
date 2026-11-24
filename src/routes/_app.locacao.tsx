import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/_app/locacao")({
  head: () => ({ meta: [{ title: "Locação — Zone Connection" }] }),
  component: LocacaoVisaoGeralPage,
});

function LocacaoVisaoGeralPage() {
  return (
    <>
      <PageHeader
        title="Locação"
        description="As locações cadastradas aparecem aqui."
      />
      <div className="rounded-2xl border border-[#E2E8EC] bg-white px-6 py-14 text-center text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-[#141a22]">
        Nenhuma locação cadastrada.
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ComercialFunilBoard } from "@/routes/_app.funil";

export const Route = createFileRoute("/_app/funil-clientes")({
  head: () => ({ meta: [{ title: "Funil de Clientes — Zone Connection" }] }),
  component: FunilClientes,
});

function FunilClientes() {
  return <ComercialFunilBoard tipoFiltro="cliente" />;
}

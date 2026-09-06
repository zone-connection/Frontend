import { createFileRoute } from "@tanstack/react-router";
import { ComercialFunilBoard, FunilEnterGate } from "@/routes/_app.funil";

export const Route = createFileRoute("/_app/funil-clientes")({
  head: () => ({ meta: [{ title: "Funil de Clientes — Zone Connection" }] }),
  component: FunilClientes,
});

function FunilClientes() {
  return (
    <FunilEnterGate>
      <ComercialFunilBoard tipoFiltro="cliente" />
    </FunilEnterGate>
  );
}

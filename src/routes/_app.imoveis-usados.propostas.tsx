import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/imoveis-usados/propostas")({
  beforeLoad: () => {
    throw redirect({ to: "/propostas", search: { origem: "usado" } });
  },
});

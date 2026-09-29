import { createFileRoute } from "@tanstack/react-router";
import { MuralChavesPage } from "@/components/mural-chaves-page";

export const Route = createFileRoute("/_app/mural-chaves")({
  head: () => ({ meta: [{ title: "Mural de Chaves — Zone Connection" }] }),
  component: MuralChavesPage,
});

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/processos")({
  beforeLoad: () => {
    throw redirect({ to: "/documentacao" });
  },
});

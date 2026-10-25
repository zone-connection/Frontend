import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/marketing/pages/AboutPage";
import { marketingHead } from "@/marketing/seo";

export const Route = createFileRoute("/about")({
  ssr: true,
  head: () =>
    marketingHead({
      title: "Sobre | Eduardo & Priscilla, fundadores da Zone Connection",
      description:
        "Conheça a Zone Connection, Eduardo Alves e Priscilla Marinho, e os sites, CRMs e sistemas que já estão no ar.",
      path: "/about",
    }),
  component: AboutPage,
});

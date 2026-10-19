import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  LayoutTemplate,
  Menu,
  MessageSquareText,
  Network,
  X,
} from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { HOME_ANCHORS } from "../home/routes";

// Links de texto simples, sem "pílula" no hover (estilo do site de referência)
const navLinkClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-medium text-brand-dark/80 transition-colors hover:text-brand-dark focus-visible:text-brand-dark";

// CTA principal: pílula escura com sombra e seta
const ctaClass =
  "group inline-flex items-center justify-center gap-2.5 rounded-full bg-brand-dark px-5 py-2 text-[15px] font-semibold whitespace-nowrap text-white shadow-lg shadow-brand-dark/25 transition-all hover:-translate-y-px hover:bg-brand-dark/90";

const loginClass =
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[15px] font-medium text-brand-dark/80 transition-colors hover:text-brand-dark";

const CONTACT_WHATSAPP_MSG = "Olá! Gostaria de falar com a Zone Connection.";

const PRODUCTS = [
  {
    title: "CRM Imobiliário",
    description:
      "Centralize vendas, agenda, imóveis, financeiro e a operação inteira.",
    to: "/produtos/crm-imobiliario",
    icon: Network,
  },
  {
    title: "IA para WhatsApp",
    description:
      "Automatize o atendimento, qualifique leads e distribua no CRM.",
    to: "/produtos/ia-whatsapp",
    icon: MessageSquareText,
  },
  {
    title: "Sites e Landing Pages",
    description:
      "Site institucional para a imobiliária e landing page para o corretor.",
    to: "/produtos/sites-institucionais",
    icon: LayoutTemplate,
  },
] as const;

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [desktopProductsOpen, setDesktopProductsOpen] = useState(false);
  const productsCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
        setProductsOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (productsCloseTimeout.current) {
        clearTimeout(productsCloseTimeout.current);
      }
    };
  }, []);

  function openDesktopProducts() {
    if (productsCloseTimeout.current) {
      clearTimeout(productsCloseTimeout.current);
      productsCloseTimeout.current = null;
    }
    setDesktopProductsOpen(true);
  }

  function closeDesktopProductsDelayed() {
    if (productsCloseTimeout.current) {
      clearTimeout(productsCloseTimeout.current);
    }
    productsCloseTimeout.current = setTimeout(() => {
      setDesktopProductsOpen(false);
      productsCloseTimeout.current = null;
    }, 140);
  }

  function closeMobile() {
    setIsOpen(false);
    setProductsOpen(false);
  }

  const whatsappHref = getWhatsAppUrl(CONTACT_WHATSAPP_MSG);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/80">
      <nav
        className="mx-auto grid max-w-368 grid-cols-[auto_1fr_auto] items-center gap-6 px-6 py-2.5 lg:px-19"
        aria-label="Navegação principal"
      >
        <Link to="/" onClick={closeMobile} className="shrink-0">
          <span className="block sm:hidden">
            <Logo size="sm" />
          </span>
          <span className="hidden sm:block">
            <Logo size="sm" />
          </span>
        </Link>

        <div className="hidden items-center justify-center gap-2 lg:flex xl:gap-4">
          <Link to="/" className={navLinkClass}>
            Sobre
          </Link>

          <DropdownMenu
            modal={false}
            open={desktopProductsOpen}
            onOpenChange={setDesktopProductsOpen}
          >
            <DropdownMenuTrigger
              className={cn(
                navLinkClass,
                "cursor-pointer outline-none data-[state=open]:text-brand-dark",
              )}
              onMouseEnter={openDesktopProducts}
              onMouseLeave={closeDesktopProductsDelayed}
            >
              Produtos
              <ChevronDown
                className={cn(
                  "h-4 w-4 opacity-70 transition-transform duration-200",
                  desktopProductsOpen && "rotate-180",
                )}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              sideOffset={12}
              className="w-[min(92vw,42rem)] cursor-default overflow-hidden rounded-3xl border-border p-0 shadow-xl"
              onMouseEnter={openDesktopProducts}
              onMouseLeave={closeDesktopProductsDelayed}
            >
              <div className="grid grid-cols-[1.4fr_0.9fr]">
                <div className="flex flex-col gap-1 p-3">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
                    Nossas soluções
                  </p>
                  {PRODUCTS.map((product) => {
                    const Icon = product.icon;
                    return (
                      <DropdownMenuItem
                        key={product.to}
                        asChild
                        className="cursor-pointer rounded-2xl p-0 focus:bg-transparent"
                      >
                        <Link
                          to={product.to}
                          className="group flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-muted focus:bg-surface-muted"
                        >
                          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-brand-accent shadow-sm transition-colors group-hover:border-brand-accent/30 group-hover:bg-brand-accent/10">
                            <Icon size={20} strokeWidth={1.75} />
                          </span>
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
                              {product.title}
                              <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                            </span>
                            <span className="text-xs leading-relaxed text-text-muted">
                              {product.description}
                            </span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </div>

                <div className="relative overflow-hidden bg-brand-dark p-5 text-white">
                  <div
                    className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand-accent/25"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/5"
                    aria-hidden
                  />
                  <div className="relative flex h-full flex-col justify-between gap-6">
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
                        Ecossistema
                      </p>
                      <p className="text-lg font-semibold leading-snug">
                        Tecnologia conectada para a imobiliária evoluir.
                      </p>
                      <p className="text-sm leading-relaxed text-white/70">
                        CRM, IA no WhatsApp e presença digital em um só
                        ecossistema.
                      </p>
                    </div>
                    <Link
                      to="/demonstracao"
                      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark transition-colors hover:bg-white/90"
                    >
                      Ver demonstração
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <a href={HOME_ANCHORS.ecosystem} className={navLinkClass}>
            Soluções
          </a>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link to="/login" className={loginClass}>
            Login
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass}
          >
            Fale conosco
          </a>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-dark transition-colors hover:bg-surface-muted lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            className="overflow-hidden border-t border-border lg:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              <Link
                to="/"
                className="px-1 py-3 text-sm font-medium text-brand-dark/80 hover:text-brand-dark"
                onClick={closeMobile}
              >
                Sobre
              </Link>

              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-1 py-3 text-sm font-medium text-brand-dark/80 hover:text-brand-dark"
                  aria-expanded={productsOpen}
                  onClick={() => setProductsOpen((open) => !open)}
                >
                  Produtos
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      productsOpen && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence>
                  {productsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mb-3 flex flex-col gap-2">
                        {PRODUCTS.map((product) => {
                          const Icon = product.icon;
                          return (
                            <Link
                              key={product.to}
                              to={product.to}
                              className="flex items-start gap-3 rounded-2xl border border-border bg-surface-muted/40 px-3 py-3 transition-colors hover:border-brand-accent/30 hover:bg-brand-accent/5"
                              onClick={closeMobile}
                            >
                              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-accent shadow-sm">
                                <Icon size={18} strokeWidth={1.75} />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-brand-dark">
                                  {product.title}
                                </span>
                                <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                                  {product.description}
                                </span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <a
                href={HOME_ANCHORS.ecosystem}
                className="px-1 py-3 text-sm font-medium text-brand-dark/80 hover:text-brand-dark"
                onClick={closeMobile}
              >
                Soluções
              </a>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-1 py-3 text-sm font-medium text-brand-dark/80 hover:text-brand-dark"
                onClick={closeMobile}
              >
                Fale conosco
              </a>

              <div className="mt-3 flex flex-col gap-3 border-t border-border pt-4">
                <Link to="/login" className={loginClass} onClick={closeMobile}>
                  Login
                </Link>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ctaClass}
                  onClick={closeMobile}
                >
                  Fale conosco
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { getWhatsAppUrl } from "@/lib/env";
import { HOME_ANCHORS } from "@/marketing/home/routes";
import { Logo } from "./Logo";

const INSTAGRAM_URL = "https://www.instagram.com/zone.connection/";

const socialIconClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-brand-dark/80 transition-colors hover:border-brand-dark/20 hover:bg-surface-muted hover:text-brand-dark";

const footerLinkClass =
  "text-sm text-text-muted transition-colors hover:text-brand-dark";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-0 border-t border-border bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-12 lg:py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4">
            <Logo size="sm" />
            <p className="max-w-xs text-sm text-text-muted">
              Tecnologia para o mercado imobiliário — um ecossistema de soluções
              conectadas.
            </p>
            <div className="flex items-center gap-2">
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={socialIconClass}
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="h-5 w-5" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={socialIconClass}
                aria-label="Instagram"
              >
                <Instagram size={18} strokeWidth={1.75} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            <nav className="flex flex-col gap-2.5" aria-label="Institucional">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
                Institucional
              </p>
              <Link to="/" className={footerLinkClass}>
                Início
              </Link>
              <Link to="/about" className={footerLinkClass}>
                Sobre
              </Link>
              <a href={HOME_ANCHORS.solutions} className={footerLinkClass}>
                Soluções
              </a>
              <Link to="/demonstracao" className={footerLinkClass}>
                Demonstração
              </Link>
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLinkClass}
              >
                Contato
              </a>
              <Link to="/login" className={footerLinkClass}>
                Entrar
              </Link>
            </nav>

            <nav className="flex flex-col gap-2.5" aria-label="Produtos">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
                Produtos
              </p>
              <Link to="/produtos/crm-imobiliario" className={footerLinkClass}>
                CRM Imobiliário
              </Link>
              <Link to="/produtos/ia-whatsapp" className={footerLinkClass}>
                IA para WhatsApp
              </Link>
              <Link
                to="/produtos/sites-institucionais"
                className={footerLinkClass}
              >
                Sites e Landing Pages
              </Link>
            </nav>

            <nav className="flex flex-col gap-2.5" aria-label="Legal">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
                Legal
              </p>
              <Link to="/privacidade" className={footerLinkClass}>
                Privacidade
              </Link>
              <Link to="/termos" className={footerLinkClass}>
                Termos de Uso
              </Link>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted sm:text-sm">
            © {year} Zone Connection. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link
              to="/privacidade"
              className="text-xs text-text-muted transition-colors hover:text-brand-dark sm:text-sm"
            >
              Política de Privacidade
            </Link>
            <Link
              to="/termos"
              className="text-xs text-text-muted transition-colors hover:text-brand-dark sm:text-sm"
            >
              Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

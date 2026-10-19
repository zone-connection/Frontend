import type { ReactNode } from "react";
import { FiChevronRight } from "react-icons/fi";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { FaMeta } from "react-icons/fa6";
import { SiGmail, SiGooglecalendar } from "react-icons/si";

type App = {
    id: string;
    label: string;
    logo: ReactNode;
    /** Posição e tamanho do círculo no desktop. */
    desktop: string;
    /** Classe de atraso da animação flutuante (já existe no CSS global). */
    float: string;
};

/*
    Facebook, Instagram, Meta, Google Agenda e Gmail usam os ícones oficiais do react-icons.
    Órulo e OLX não existem no pacote: troque os textos abaixo pelos SVG/PNG oficiais
    (ex.: <img src="/logos/olx.svg" alt="" className="size-1/2 object-contain" />).
*/
const apps: App[] = [
    {
        id: "meta",
        label: "Meta",
        logo: <FaMeta className="size-1/2" style={{ color: "#0081FB" }} />,
        desktop: "-top-6 left-[26%] size-20",
        float: "",
    },
    {
        id: "facebook",
        label: "Facebook",
        logo: <FaFacebook className="size-1/2" style={{ color: "#1877F2" }} />,
        desktop: "left-[5%] top-[14%] size-16",
        float: "podio-float-delay-1",
    },
    {
        id: "instagram",
        label: "Instagram",
        logo: <FaInstagram className="size-1/2" style={{ color: "#E4405F" }} />,
        desktop: "bottom-[10%] left-[9%] size-20",
        float: "podio-float-delay-2",
    },
    {
        id: "agenda",
        label: "Google Agenda",
        logo: <SiGooglecalendar className="size-1/2" style={{ color: "#4285F4" }} />,
        desktop: "right-[22%] top-[8%] size-16",
        float: "podio-float-delay-3",
    },
    {
        id: "orulo",
        label: "Órulo",
        logo: (
            <span className="text-lg font-extrabold tracking-tight text-brand-dark">
                órulo
            </span>
        ),
        desktop: "right-[6%] top-[38%] size-20",
        float: "podio-float-delay-1",
    },
    {
        id: "olx",
        label: "OLX",
        logo: (
            <span className="text-lg font-extrabold tracking-tight" style={{ color: "#6E0AD6" }}>
                OLX
            </span>
        ),
        desktop: "-bottom-5 left-[38%] size-16",
        float: "podio-float-delay-2",
    },
    {
        id: "gmail",
        label: "Gmail",
        logo: <SiGmail className="size-1/2" style={{ color: "#EA4335" }} />,
        desktop: "bottom-[8%] right-[7%] size-16",
        float: "podio-float-delay-3",
    },
];

function LogoBadge({ app, className }: { app: App; className: string }) {
    return (
        <div
            aria-hidden="true"
            className={`flex items-center justify-center rounded-full bg-white shadow-lg shadow-brand-dark/10 ${className}`}
        >
            {app.logo}
        </div>
    );
}

export function IntegrationsSection() {
    return (
        <section className="bg-white py-5">
            <div className="w-full px-6">
                <div className="relative overflow-hidden rounded-3xl bg-muted px-6 py-16 md:min-h-128 md:py-0">
                    {/* Logos: grade no mobile */}
                    <div className="mb-10 flex flex-wrap justify-center gap-3 md:hidden">
                        {apps.map((app) => (
                            <LogoBadge key={app.id} app={app} className="size-14" />
                        ))}
                    </div>

                    {/* Logos: espalhados no desktop */}
                    <div className="hidden md:block">
                        {apps.map((app) => (
                            <LogoBadge
                                key={app.id}
                                app={app}
                                className={`podio-float absolute ${app.float} ${app.desktop}`}
                            />
                        ))}
                    </div>

                    <div className="relative mx-auto flex max-w-md flex-col items-center text-center md:min-h-128 md:justify-center">
                        <h2 className="text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
                            Conecte sua imobiliária às ferramentas que você já usa
                        </h2>
                        <p className="mt-4 text-base leading-relaxed text-text-muted">
                            Redes sociais, portais, agenda e e-mail trabalhando junto com o
                            CRM da Zone Connection, tudo em um só lugar.
                        </p>
                        <p className="sr-only">
                            Integrações: {apps.map((a) => a.label).join(", ")}.
                        </p>
                        <a
                            href="#contato"
                            className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-module-title transition hover:text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        >
                            Conheça nossas integrações
                            <FiChevronRight className="size-4" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
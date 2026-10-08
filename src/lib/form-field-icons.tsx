import { createContext, useContext, type ReactNode } from "react";
import {
  BadgeCheck,
  Banknote,
  BedDouble,
  Briefcase,
  Building2,
  CalendarDays,
  Car,
  Clock3,
  FileText,
  Flag,
  Globe,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  Share2,
  Tag,
  Type,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export const FormFieldIconContext = createContext(false);

export function useFormFieldIcons() {
  return useContext(FormFieldIconContext);
}

function texto(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(texto).join(" ");
  if (children && typeof children === "object" && "props" in children) {
    return texto((children as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

const REGRAS: { teste: RegExp; icon: LucideIcon }[] = [
  { teste: /e-?mail/i, icon: Mail },
  { teste: /telefone|whatsapp|celular/i, icon: Phone },
  { teste: /nome|empresa|contato/i, icon: UserRound },
  { teste: /respons[aá]vel|corretor/i, icon: UserRound },
  { teste: /equipe|gerente/i, icon: Users },
  { teste: /origem/i, icon: Share2 },
  { teste: /data|cadastro|nascimento|vencimento/i, icon: CalendarDays },
  { teste: /hor[aá]rio|hora\b/i, icon: Clock3 },
  { teste: /cidade|bairro|endere[cç]o|localidade|cep/i, icon: MapPin },
  { teste: /renda|or[cç]amento|valor|pre[cç]o|vgv|comiss[aã]o/i, icon: Banknote },
  { teste: /quarto/i, icon: BedDouble },
  { teste: /vaga/i, icon: Car },
  { teste: /tag/i, icon: Tag },
  { teste: /cpf|rg|documento|contrato/i, icon: FileText },
  { teste: /senha/i, icon: Lock },
  { teste: /cargo|fun[cç][aã]o/i, icon: Briefcase },
  { teste: /creci/i, icon: BadgeCheck },
  { teste: /t[ií]tulo/i, icon: Type },
  { teste: /prioridade/i, icon: Flag },
  { teste: /site|url|instagram|linkedin/i, icon: Globe },
  { teste: /empreendimento|im[oó]vel|lan[cç]amento/i, icon: Building2 },
  { teste: /c[oó]digo|n[uú]mero/i, icon: Hash },
];

export function iconForLabel(children: ReactNode): LucideIcon | null {
  const nome = texto(children).trim();
  if (!nome) return null;
  return REGRAS.find((regra) => regra.teste.test(nome))?.icon ?? null;
}

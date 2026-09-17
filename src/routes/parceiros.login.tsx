import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Handshake, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInParceiro } from "@/lib/parceiros-auth";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/parceiros/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: ParceiroLoginPage,
});

function ParceiroLoginPage() {
  const navigate = useNavigate();
  const { email: emailFromQuery } = Route.useSearch();
  const [email, setEmail] = useState(emailFromQuery ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const me = await signInParceiro(email, password);
      toast.success(`Olá, ${me.nome.split(" ")[0]}`);
      navigate({ to: "/parceiros" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={(e) => void onSubmit(e)} className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-8">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Handshake className="h-4 w-4" />
          Corretores parceiros
        </p>
        <h1 className="text-2xl font-semibold">Entrar no portal</h1>
        <p className="text-sm text-muted-foreground">
          Acesso só de corretor convidado. Não use o login do CRM.
        </p>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Acesso interno?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Entrar no CRM
          </Link>
        </p>
      </form>
    </div>
  );
}

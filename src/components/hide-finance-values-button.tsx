import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHideFinanceiroValues } from "@/lib/financeiro-prefs";

export function HideFinanceValuesButton() {
  const [hideValues, setHideValues] = useHideFinanceiroValues();
  return (
    <Button
      type="button"
      variant="outline"
      className="border-border bg-background text-foreground shadow-sm hover:bg-muted"
      aria-pressed={hideValues}
      title={hideValues ? "Mostrar valores" : "Ocultar valores"}
      onClick={() => setHideValues(!hideValues)}
    >
      {hideValues ? (
        <EyeOff className="mr-1 size-4" />
      ) : (
        <Eye className="mr-1 size-4" />
      )}
      {hideValues ? "Mostrar valores" : "Ocultar valores"}
    </Button>
  );
}

export function useFinanceValueBlur() {
  return useHideFinanceiroValues()[0];
}

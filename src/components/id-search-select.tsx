import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

export type IdSearchOption = {
  id: string;
  label: string;
  /** Texto extra para a busca (ex.: cidade). */
  keywords?: string;
  /** Linha secundária visível na lista, como o telefone. */
  hint?: string;
};

export function IdSearchSelect({
  value,
  options,
  onChange,
  placeholder = "Selecione",
  searchPlaceholder = "Pesquisar…",
  emptyLabel = "Nenhum item cadastrado",
  noneLabel = "—",
  allowNone = true,
  disabled,
}: {
  value: string;
  options: IdSearchOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  noneLabel?: string;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.id === value);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between pl-4 pr-4 font-normal"
        >
          <span className="truncate">
            {selected?.label || (value ? value : placeholder)}
          </span>
          <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>
              {options.length === 0 ? emptyLabel : "Nenhum resultado."}
            </CommandEmpty>
            <CommandGroup>
              {allowNone ? (
                <CommandItem
                  value={`__none__ ${noneLabel}`}
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{noneLabel}</span>
                </CommandItem>
              ) : null}
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={`${opt.label} ${opt.keywords ?? ""} ${opt.id}`}
                  onSelect={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.hint ? (
                      <span className="block truncate text-xs text-muted-foreground">{opt.hint}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

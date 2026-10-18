import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import { CONSTRUTORA_CORES_PRESET } from "@/lib/construtoras-api";

type CorPickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  previewLabel?: string;
  disabled?: boolean;
};

export function CorPicker({
  id = "cor",
  label = "Cor do nome",
  value,
  onChange,
  previewLabel,
  disabled,
}: CorPickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          type="color"
          value={value || "#3b82f6"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-14 cursor-pointer p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="#3b82f6"
          maxLength={7}
          className="max-w-[140px] font-mono text-sm"
        />
        {!disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
          >
            Limpar
          </Button>
        ) : null}
        {previewLabel?.trim() && value ? (
          <Badge
            className={catalogColorBadgeClass(value)}
            style={catalogColorBadgeStyle(value)}
            title={previewLabel.trim()}
          >
            {previewLabel.trim()}
          </Badge>
        ) : null}
      </div>
      {!disabled ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {CONSTRUTORA_CORES_PRESET.map((hex) => {
            const selected = value?.toLowerCase() === hex.toLowerCase();
            return (
              <motion.button
                key={hex}
                type="button"
                title={hex}
                className="h-7 w-7 rounded-full border border-border"
                style={{
                  backgroundColor: hex,
                  boxShadow: selected ? "0 0 0 2px #fff, 0 0 0 4px #079ED4" : undefined,
                }}
                onClick={() => onChange(hex)}
                disabled={disabled}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.92 }}
                animate={{ scale: selected ? 1.08 : 1 }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

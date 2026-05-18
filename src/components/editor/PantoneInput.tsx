import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pantoneToHex } from "@/lib/pantone";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onChange: (hex: string, pantone: string) => void;
  label?: string;
  className?: string;
}

/**
 * Lets the user type a Pantone code (e.g. "186 C", "PMS 2945").
 * Resolved hex is applied via onChange. If unrecognized, shows a hint
 * and does not overwrite the current color.
 */
export function PantoneInput({ value = "", onChange, label = "Pantone code", className }: Props) {
  const [text, setText] = useState(value);
  const [resolved, setResolved] = useState<string | null>(pantoneToHex(value));

  useEffect(() => {
    setText(value);
    setResolved(pantoneToHex(value));
  }, [value]);

  const handle = (v: string) => {
    setText(v);
    const hex = pantoneToHex(v);
    setResolved(hex);
    if (hex) onChange(hex, v);
  };

  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => handle(e.target.value)}
          placeholder="e.g. 186 C"
          className="h-9 text-xs"
        />
        <div
          className="h-9 w-9 rounded-md border border-border shrink-0"
          style={{ background: resolved || "transparent" }}
          title={resolved || "Unrecognized"}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {text
          ? resolved
            ? `Matched ${resolved.toUpperCase()}`
            : "Pantone code not in library — type a hex below or try another code."
          : "Enter a Solid Coated Pantone code."}
      </p>
    </div>
  );
}

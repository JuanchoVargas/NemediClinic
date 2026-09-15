import * as React from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return Math.trunc(value).toLocaleString("es-CO");
}

function parseDigits(input: string): number {
  const digits = input.replace(/\D/g, "");
  return digits === "" ? 0 : Number(digits);
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder, className, ...rest }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={formatCurrency(value)}
        onChange={(e) => onChange(parseDigits(e.target.value))}
        placeholder={placeholder}
        className={className}
        {...rest}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

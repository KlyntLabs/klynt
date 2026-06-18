import { cn, focusRing } from "@/lib/utils";
import { Controller, useFormContext } from "react-hook-form";
import { FormField } from "./form-field";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export function SelectField({ name, label, options, placeholder }: SelectFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField label={label} htmlFor={name} error={fieldState.error?.message}>
          <select
            {...field}
            id={name}
            className={cn(
              "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background",
              fieldState.error && "border-destructive focus-visible:ring-destructive",
              focusRing
            )}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      )}
    />
  );
}

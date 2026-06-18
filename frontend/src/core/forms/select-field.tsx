import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
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
              "w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400",
              fieldState.error && "border-red-500 focus:ring-red-400"
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

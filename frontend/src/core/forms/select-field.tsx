import { Controller, useFormContext } from "react-hook-form";
import { cn, focusRing } from "@/lib/utils";
import { FormField } from "./form-field";

interface SelectOption {
  value: string;
  label: string;
}

export interface SelectComponentProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface SelectFieldComponents {
  Select?: React.ComponentType<SelectComponentProps>;
}

interface SelectFieldProps {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  components?: SelectFieldComponents;
}

function DefaultSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SelectComponentProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background",
        ariaInvalid && "border-destructive focus-visible:ring-destructive",
        focusRing,
        className
      )}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
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
  );
}

export function SelectField({
  name,
  label,
  options,
  placeholder,
  components = {},
}: SelectFieldProps) {
  const { control } = useFormContext();
  const SelectComponent = components.Select ?? DefaultSelect;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField label={label} htmlFor={name} error={fieldState.error?.message}>
          <SelectComponent
            id={name}
            value={field.value}
            onChange={field.onChange}
            options={options}
            placeholder={placeholder}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
        </FormField>
      )}
    />
  );
}

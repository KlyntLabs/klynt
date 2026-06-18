import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/core/ui/input";
import { FormField } from "./form-field";

interface InputFieldProps {
  name: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
}

export function InputField({ name, label, type = "text", placeholder }: InputFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField label={label} htmlFor={name} error={fieldState.error?.message}>
          <Input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            hasError={!!fieldState.error}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
        </FormField>
      )}
    />
  );
}

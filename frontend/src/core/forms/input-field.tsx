import { Controller, useFormContext } from "react-hook-form";
import { Input, type InputProps } from "@/components/ui/input";
import { FormField } from "./form-field";

interface InputFieldComponents {
  Input?: React.ComponentType<InputProps>;
}

interface InputFieldProps {
  name: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  components?: InputFieldComponents;
}

export function InputField({
  name,
  label,
  type = "text",
  placeholder,
  components = {},
}: InputFieldProps) {
  const { control } = useFormContext();
  const InputComponent = components.Input ?? Input;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField label={label} htmlFor={name} error={fieldState.error?.message}>
          <InputComponent
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
        </FormField>
      )}
    />
  );
}

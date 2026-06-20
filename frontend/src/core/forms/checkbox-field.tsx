import { Controller, useFormContext } from "react-hook-form";
import { Label, type LabelProps } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CheckboxFieldComponents {
  Label?: React.ComponentType<LabelProps>;
}

interface CheckboxFieldProps {
  name: string;
  label: React.ReactNode;
  className?: string;
  components?: CheckboxFieldComponents;
}

export function CheckboxField({ name, label, className, components = {} }: CheckboxFieldProps) {
  const { control } = useFormContext();
  const LabelComponent = components.Label ?? Label;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("mb-4 flex items-start gap-2", className)}>
          <input
            {...field}
            id={name}
            type="checkbox"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary"
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
          <div>
            <LabelComponent htmlFor={name}>{label}</LabelComponent>
            {fieldState.error && (
              <p id={`${name}-error`} className="text-sm text-destructive" role="alert">
                {fieldState.error.message}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
}

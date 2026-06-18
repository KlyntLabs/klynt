import { Label } from "@/core/ui/label";
import { Controller, useFormContext } from "react-hook-form";

interface CheckboxFieldProps {
  name: string;
  label: React.ReactNode;
}

export function CheckboxField({ name, label }: CheckboxFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="mb-4 flex items-start gap-2">
          <input
            {...field}
            id={name}
            type="checkbox"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            className="mt-1 h-4 w-4"
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
          <div>
            <Label htmlFor={name}>{label}</Label>
            {fieldState.error && (
              <p id={`${name}-error`} className="text-sm text-red-600" role="alert">
                {fieldState.error.message}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
}

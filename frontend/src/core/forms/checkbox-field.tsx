import { Label } from "@/core/ui/label";
import { cn } from "@/lib/utils";
import { Controller, useFormContext } from "react-hook-form";

interface CheckboxFieldProps {
  name: string;
  label: React.ReactNode;
  className?: string;
}

export function CheckboxField({ name, label, className }: CheckboxFieldProps) {
  const { control } = useFormContext();

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
            <Label htmlFor={name}>{label}</Label>
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

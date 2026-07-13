import { TextArea } from "@astryxdesign/core/TextArea";
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";

interface FormTextAreaProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  control: Control<TValues>;
  name: TName;
  label: string;
  placeholder?: string;
  description?: string;
  rows?: number;
  isRequired?: boolean;
  isDisabled?: boolean;
  /** Forwarded as data-testid. TypeScript never checks hyphenated JSX attributes, so passing
   *  `data-testid` directly compiles fine and is then silently dropped — hence an explicit prop. */
  testId?: string;
  rules?: Omit<RegisterOptions<TValues, TName>, "disabled" | "setValueAs" | "valueAsDate">;
}

/**
 * TextArea half of the react-hook-form ↔ Astryx bridge. Same contract as FormTextInput:
 * RHF owns the value, and `fieldState.error` becomes Astryx's `status`, which is what sets
 * aria-invalid and renders the message.
 */
export function FormTextArea<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  placeholder,
  description,
  rows,
  isRequired,
  isDisabled,
  testId,
  rules,
}: FormTextAreaProps<TValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <TextArea
          label={label}
          placeholder={placeholder}
          description={description}
          rows={rows}
          isRequired={isRequired}
          isDisabled={isDisabled}
          data-testid={testId}
          value={field.value ?? ""}
          onChange={(value) => field.onChange(value)}
          onBlur={field.onBlur}
          ref={field.ref}
          status={
            fieldState.error ? { type: "error", message: fieldState.error.message } : undefined
          }
        />
      )}
    />
  );
}

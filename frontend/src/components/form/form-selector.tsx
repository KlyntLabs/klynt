import { Selector } from "@astryxdesign/core/Selector";
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";

export interface FormSelectorOption {
  value: string;
  label: string;
}

interface FormSelectorProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  control: Control<TValues>;
  name: TName;
  label: string;
  options: FormSelectorOption[];
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  /** Forwarded as data-testid. TypeScript never checks hyphenated JSX attributes, so passing
   *  `data-testid` directly compiles fine and is then silently dropped — hence an explicit prop. */
  testId?: string;
  rules?: Omit<RegisterOptions<TValues, TName>, "disabled" | "setValueAs" | "valueAsDate">;
}

/**
 * Selector half of the react-hook-form ↔ Astryx bridge. Same contract as FormTextInput:
 * RHF owns the value, and `fieldState.error` becomes Astryx's `status`, which is what sets
 * aria-invalid and renders the message.
 *
 * Unlike TextInput, Astryx's Selector onChange is `(value)` only — there is no event — so
 * RHF's onChange receives the bare value.
 */
export function FormSelector<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  options,
  placeholder,
  description,
  isRequired,
  isDisabled,
  testId,
  rules,
}: FormSelectorProps<TValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Selector
          label={label}
          options={options}
          placeholder={placeholder}
          description={description}
          isRequired={isRequired}
          isDisabled={isDisabled}
          data-testid={testId}
          htmlName={field.name}
          value={field.value ?? ""}
          onChange={(value) => field.onChange(value)}
          // No `ref` here, unlike the TextInput and TextArea bridges: Astryx's Selector declares
          // no ref prop, so RHF cannot focus it on a failed submit. Upstream gap, not an omission.
          onBlur={field.onBlur}
          status={
            fieldState.error ? { type: "error", message: fieldState.error.message } : undefined
          }
        />
      )}
    />
  );
}

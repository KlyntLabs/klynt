import { TextInput } from "@astryxdesign/core/TextInput";
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";

interface FormTextInputProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  control: Control<TValues>;
  name: TName;
  label: string;
  type?: "text" | "password" | "email";
  placeholder?: string;
  description?: string;
  autoComplete?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  /** Forwarded as data-testid. TypeScript never checks hyphenated JSX attributes, so passing
   *  `data-testid` directly compiles fine and is then silently dropped — hence an explicit prop. */
  testId?: string;
  rules?: Omit<RegisterOptions<TValues, TName>, "disabled" | "setValueAs" | "valueAsDate">;
}

/**
 * The React Hook Form ↔ Astryx bridge.
 *
 * Astryx has no RHF binding, and its docs are explicit that `TextInput` should NOT be
 * wrapped in `Field` — it already owns its label, description and validation status. So the
 * bridge is thin by design: hand RHF's value/onChange/onBlur to the input, and translate
 * `fieldState.error` into Astryx's `status` prop.
 *
 * That last translation is the part that matters. `status={{type: 'error'}}` is what sets
 * `aria-invalid` and renders the message; passing the error text anywhere else would show it
 * on screen while leaving the field valid as far as assistive tech is concerned.
 *
 * Note Astryx's onChange is `(value, event)`, not the React `(event)` handler — RHF accepts
 * a bare value, so the two line up without an adapter.
 *
 * Replaces the six-component shadcn stack (Form > FormField > FormItem > FormLabel >
 * FormControl > Input + FormMessage, plus a render prop) with one component per field.
 */
export function FormTextInput<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  description,
  autoComplete,
  isRequired,
  isDisabled,
  testId,
  rules,
}: FormTextInputProps<TValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <TextInput
          // autoComplete is spread, not passed as a typed prop: Astryx's BaseProps extends
          // React.HTMLAttributes rather than InputHTMLAttributes, so input-only attributes are
          // absent from TextInputProps even though rest props DO reach the input. (`htmlName`
          // exists as a bespoke patch for `name`, which suggests the base type is the real bug.)
          // Auth forms depend on this reaching the DOM — see the test.
          {...({ autoComplete } as { autoComplete?: string })}
          label={label}
          type={type}
          placeholder={placeholder}
          description={description}
          isRequired={isRequired}
          isDisabled={isDisabled}
          data-testid={testId}
          htmlName={field.name}
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

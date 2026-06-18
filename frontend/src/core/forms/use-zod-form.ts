import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldValues, type Resolver, type UseFormProps, useForm } from "react-hook-form";
import type { z } from "zod";
import type { $ZodType } from "zod/v4/core";

// biome-ignore lint/suspicious/noExplicitAny: Zod v4 internal generics are not exposed publicly
export function useZodForm<TSchema extends $ZodType<FieldValues, any, any>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver">
) {
  return useForm<z.infer<TSchema>>({
    ...options,
    resolver: zodResolver(schema) as Resolver<z.infer<TSchema>, unknown, z.infer<TSchema>>,
  });
}

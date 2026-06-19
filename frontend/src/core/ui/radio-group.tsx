import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn, focusRing } from "@/lib/utils";

const RadioGroup = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
  ref?: React.Ref<React.ElementRef<typeof RadioGroupPrimitive.Root>>;
}) => <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-3", className)} {...props} />;

const RadioGroupItem = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
  ref?: React.Ref<React.ElementRef<typeof RadioGroupPrimitive.Item>>;
}) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "aspect-square h-5 w-5 rounded-full border-2 border-border bg-background shadow-hard-sm",
      "data-[state=checked]:border-border",
      focusRing,
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
);

export { RadioGroup, RadioGroupItem };

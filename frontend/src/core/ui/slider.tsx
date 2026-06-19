import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sliderVariants = cva(
  "relative flex touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-5 data-[orientation=vertical]:flex-col data-[orientation=vertical]:justify-end",
  {
    variants: {
      orientation: {
        horizontal: "h-5 w-full",
        vertical: "h-48 w-5",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
);

export interface SliderProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, "orientation">,
    VariantProps<typeof sliderVariants> {
  ref?: React.Ref<React.ElementRef<typeof SliderPrimitive.Root>>;
  thumbLabel?: string;
}

export function Slider({
  className,
  orientation = "horizontal",
  thumbLabel = "Slider",
  value,
  defaultValue,
  disabled,
  ref,
  ...props
}: SliderProps) {
  const values = value ?? defaultValue;
  const thumbs = Array.isArray(values) ? values : [undefined];

  return (
    <SliderPrimitive.Root
      ref={ref}
      orientation={orientation ?? "horizontal"}
      disabled={disabled}
      value={value}
      defaultValue={defaultValue}
      className={cn(sliderVariants({ orientation }), className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-full w-full grow overflow-hidden rounded-full border-2 border-border bg-muted shadow-hard-sm">
        <SliderPrimitive.Range
          className={cn(
            "absolute rounded-full bg-primary",
            orientation === "horizontal" ? "h-full" : "w-full"
          )}
        />
      </SliderPrimitive.Track>
      {thumbs.map((_, index) => (
        <SliderPrimitive.Thumb
          // biome-ignore lint/suspicious/noArrayIndexKey: thumbs correspond directly to the value array order
          key={index}
          className="block h-5 w-5 rounded-full border-2 border-border bg-background shadow-hard transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
          aria-label={`${thumbLabel}${thumbs.length > 1 ? ` ${index + 1}` : ""}`}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  ref?: React.Ref<HTMLLabelElement>;
}

export function Label({ className, ref, ...props }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: reusable label primitive
    <label
      ref={ref}
      className={cn(
        "mb-1 block text-sm font-bold leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}

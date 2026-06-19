import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  ref?: React.Ref<React.ElementRef<typeof TooltipPrimitive.Content>>;
}

function TooltipContent({ className, sideOffset = 4, ref, ...props }: TooltipContentProps) {
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-md border-2 border-border bg-foreground px-3 py-1.5 text-xs font-bold text-background shadow-hard",
        className
      )}
      {...props}
    />
  );
}

interface TooltipArrowProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow> {
  ref?: React.Ref<React.ElementRef<typeof TooltipPrimitive.Arrow>>;
}

function TooltipArrow({ className, ref, ...props }: TooltipArrowProps) {
  return (
    <TooltipPrimitive.Arrow ref={ref} className={cn("fill-foreground", className)} {...props} />
  );
}

export { Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger };

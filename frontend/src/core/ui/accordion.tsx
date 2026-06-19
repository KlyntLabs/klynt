import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn, focusRing } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
  ref?: React.Ref<React.ElementRef<typeof AccordionPrimitive.Item>>;
}) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-2 border-border bg-card rounded-md shadow-hard-sm", className)}
    {...props}
  />
);

const AccordionTrigger = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
  ref?: React.Ref<React.ElementRef<typeof AccordionPrimitive.Trigger>>;
}) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 w-full items-center justify-between p-4 font-bold text-card-foreground transition-all [&[data-state=open]>svg]:rotate-180",
        focusRing,
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className="h-5 w-5 shrink-0 text-foreground transition-transform duration-200"
        aria-hidden="true"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);

const AccordionContent = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & {
  ref?: React.Ref<React.ElementRef<typeof AccordionPrimitive.Content>>;
}) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm text-card-foreground transition-all"
    {...props}
  >
    <div className={cn("p-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
);

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };

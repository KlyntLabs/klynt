import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

export function Card({ className, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border-2 border-border bg-card text-card-foreground shadow-hard",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ref, ...props }: CardProps) {
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />;
}

export function CardTitle({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLHeadingElement> }) {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-bold leading-none tracking-tight text-card-foreground",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> }) {
  return <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ref, ...props }: CardProps) {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ref, ...props }: CardProps) {
  return <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

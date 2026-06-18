import { cn } from "@/lib/utils";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
  width: number;
  height: number;
  lazy?: boolean;
}

export function Image({ alt, width, height, lazy = true, className, ...props }: ImageProps) {
  return (
    // biome-ignore lint/a11y/useAltText: alt is required via TypeScript and destructured above
    <img
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      className={cn("h-auto max-w-full", className)}
      {...props}
    />
  );
}

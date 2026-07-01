export function BrandLogo({ label, alt }: { label: string; alt: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1">
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={alt}
      >
        <rect width="32" height="32" rx="7" fill="hsl(var(--foreground))" />
        <path d="M8 10h3v8h5v-8h3v12h-3v-4h-5v4H8V10z" fill="var(--color-brand)" />
        <circle cx="22" cy="12" r="2" fill="var(--color-brand)" />
      </svg>
      <span className="text-[13px] font-semibold tracking-tight text-foreground">{label}</span>
    </div>
  );
}

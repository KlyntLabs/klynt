interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ children, ...props }: LabelProps) {
  return (
    <>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: reusable label primitive */}
      <label className="mb-1 block text-sm font-medium" {...props}>
        {children}
      </label>
    </>
  );
}

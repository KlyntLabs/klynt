import { useMe } from "./hooks/use-me";

interface AuthHydratorProps {
  children: React.ReactNode;
}

export function AuthHydrator({ children }: AuthHydratorProps) {
  useMe();
  return <>{children}</>;
}

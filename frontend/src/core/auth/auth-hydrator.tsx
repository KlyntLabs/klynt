import { useAuthModule } from "./auth-module";

interface AuthHydratorProps {
  children: React.ReactNode;
}

export function AuthHydrator({ children }: AuthHydratorProps) {
  useAuthModule();
  return <>{children}</>;
}

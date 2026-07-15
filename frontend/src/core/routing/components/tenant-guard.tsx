import { Center } from "@astryxdesign/core/Center";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useTenantPublic } from "@/features/tenant/hooks/use-tenant";
import { InvalidTenantPage } from "./invalid-tenant-page";

interface TenantGuardProps {
  slug: string;
  children: React.ReactNode;
}

export function TenantGuard({ slug, children }: TenantGuardProps) {
  const { data: tenant, isLoading, error } = useTenantPublic(slug);

  if (isLoading) {
    return (
      <Center height="100vh">
        <Spinner />
      </Center>
    );
  }

  if (error || !tenant) {
    return <InvalidTenantPage />;
  }

  return <>{children}</>;
}

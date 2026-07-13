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
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !tenant) {
    return <InvalidTenantPage />;
  }

  return <>{children}</>;
}

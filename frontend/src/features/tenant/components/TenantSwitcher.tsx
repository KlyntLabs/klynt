import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/core/auth/auth-store";
import { buildTenantUrl } from "@/core/routing/subdomain-router";
import { listMyTenants } from "../api/tenant-api";

export function TenantSwitcher() {
  const { t } = useTranslation("ui");
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: listMyTenants,
  });
  const activeTenant = useAuthStore((state) => state.activeTenant);

  if (isLoading || !tenants) {
    return (
      <Button variant="ghost" disabled>
        {t("tenant.loading")}
      </Button>
    );
  }

  const current = activeTenant ?? tenants[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">{current?.name ?? t("tenant.noTenant")}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {tenants.map((tenant) => (
          <DropdownMenuItem key={tenant.id} asChild>
            <a href={buildTenantUrl(tenant.slug)}>{tenant.name}</a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

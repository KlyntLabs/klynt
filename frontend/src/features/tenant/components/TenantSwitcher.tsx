import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { Popover } from "@astryxdesign/core/Popover";
import { VStack } from "@astryxdesign/core/VStack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/core/auth/auth-store";
import { buildTenantUrl } from "@/core/routing/subdomain-router";
import { listMyTenants } from "../api/tenant-api";

export function TenantSwitcher() {
  const { t } = useTranslation("ui");
  const [isOpen, setIsOpen] = useState(false);
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: listMyTenants,
  });
  const activeTenant = useAuthStore((state) => state.activeTenant);

  if (isLoading || !tenants) {
    return <Button variant="ghost" label={t("tenant.loading")} isDisabled />;
  }

  const current = activeTenant ?? tenants[0];

  return (
    // Popover + Link, not DropdownMenu. Astryx is explicit that DropdownMenu is for actions,
    // not navigation ("use a navigation component instead"), and its item shape has no href
    // at all — only {label, onClick}. Switching tenants is a cross-subdomain page load
    // (ADR-010), so these must stay real anchors: middle-click, open-in-new-tab and
    // copy-link all depend on it.
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="below"
      alignment="start"
      label={t("tenant.switchLabel")}
      content={
        <VStack gap={1}>
          {tenants.map((tenant) => (
            <Link key={tenant.id} href={buildTenantUrl(tenant.slug)}>
              {tenant.name}
            </Link>
          ))}
        </VStack>
      }
    >
      <Button variant="ghost" label={current?.name ?? t("tenant.noTenant")} />
    </Popover>
  );
}

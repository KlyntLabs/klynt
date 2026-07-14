import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Item } from "@astryxdesign/core/Item";
import { Popover } from "@astryxdesign/core/Popover";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthModule } from "@/core/auth/auth-module";
import { routePaths } from "@/core/routing/route-paths";
import styles from "./user-menu.module.css";

export function UserMenu() {
  const { t } = useTranslation("home");
  const { user, isLoading, logout } = useAuthModule();
  const navigate = useNavigate();
  // Controlled so selecting an item closes the popover. Astryx's Popover owns
  // light-dismiss and Escape, so the old click-outside listener and ref are gone.
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <Skeleton width={28} height={28} radius="rounded" data-testid="user-menu-loading" />;
  }

  if (!user) {
    return (
      <Button
        label={t("desktop.menubar.signIn")}
        variant="primary"
        size="sm"
        onClick={() => navigate(routePaths.login)}
      />
    );
  }

  const close = () => setIsOpen(false);

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="below"
      alignment="end"
      label={t("desktop.menubar.profile")}
      content={
        <VStack gap={1}>
          <Item
            startContent={<Avatar name={user.name} size="medium" />}
            label={user.name}
            description={user.email}
          />
          <Divider />
          <Item
            startContent={<UserIcon size={14} />}
            label={t("desktop.menubar.profile")}
            onClick={() => {
              navigate(routePaths.dashboard);
              close();
            }}
          />
          <Item
            startContent={<Settings size={14} />}
            label={t("desktop.menubar.settings")}
            onClick={close}
          />
          <Divider />
          <Item
            startContent={<LogOut size={14} />}
            label={t("desktop.menubar.signOut")}
            onClick={() => {
              logout();
              close();
            }}
          />
        </VStack>
      }
    >
      <button type="button" data-testid="user-menu-trigger" className={styles.trigger}>
        <Avatar name={user.name} size="small" />
        <Text type="label" weight="medium" maxLines={1} className={styles.name}>
          {user.name}
        </Text>
        <ChevronDown size={12} />
      </button>
    </Popover>
  );
}

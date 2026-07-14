import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
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

/**
 * How wide the name may run before it ellipsises. Past Astryx's spacing scale (which stops at
 * 48px) and Text has no width prop, so it rides on a VStack — `SizeValue`: "numbers are treated
 * as pixels", which makes the wrapper's maxWidth the native home for it.
 */
const NAME_MAX_WIDTH = 100;

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
          {/* Item's startContent is a generic slot, not Button's sized icon slot, so the glyphs
              have to bring their own size — via Icon's size prop, never a pixel number. */}
          <Item
            startContent={<Icon icon={UserIcon} size="sm" />}
            label={t("desktop.menubar.profile")}
            onClick={() => {
              navigate(routePaths.dashboard);
              close();
            }}
          />
          <Item
            startContent={<Icon icon={Settings} size="sm" />}
            label={t("desktop.menubar.settings")}
            onClick={close}
          />
          <Divider />
          <Item
            startContent={<Icon icon={LogOut} size="sm" />}
            label={t("desktop.menubar.signOut")}
            onClick={() => {
              logout();
              close();
            }}
          />
        </VStack>
      }
    >
      {/*
       * The trigger IS an Astryx Button.
       *
       * It used to be an `<HStack as="button">` carrying a `type="button"` spread-cast, plus a
       * CSS module for the native-button reset, the pill radius and an *asymmetric* inline
       * padding that no prop could express. All of it is gone. Button renders a real
       * `<button type="button">` — which is exactly what Popover's trigger contract asks for
       * ("Must contain a <button> or [role='button'] element — the popover locates it") — and it
       * brings the ghost surface, the pill, the padding, the hover and the focus ring itself.
       *
       * The avatar/name/chevron row goes through `children`, not the `icon` slot: Button's icon
       * slot force-sizes whatever it wraps (`iconSizeStyles[size]`), which would squash the
       * Avatar, whereas `children` renders as-is in place of the label. `label` still supplies
       * the accessible name.
       */}
      {/* No onClick: Popover finds this button and attaches its own click/keydown handlers. */}
      <Button variant="ghost" size="sm" label={user.name} data-testid="user-menu-trigger">
        <HStack gap={1.5} align="center">
          <Avatar name={user.name} size="small" />
          <VStack maxWidth={NAME_MAX_WIDTH}>
            <Text type="label" weight="medium" maxLines={1}>
              {user.name}
            </Text>
          </VStack>
          <Icon icon={ChevronDown} size="xsm" />
        </HStack>
      </Button>
    </Popover>
  );
}

import { useParams } from "react-router-dom";
import { useAuthModule } from "@/core/auth/auth-module";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildUserDesktop } from "@/features/desktop/factory/user-desktop";

export default function UserDesktopPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { user } = useAuthModule();
  const config = buildUserDesktop({ user, profileId });
  return <DesktopEnvironment config={config} />;
}

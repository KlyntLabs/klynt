import { useParams } from "react-router-dom";
import { useAuth } from "@/core/auth/auth-identity";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildUserDesktop } from "@/features/desktop/factory/user-desktop";

export default function UserDesktopPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { user } = useAuth();
  const config = buildUserDesktop({ user, profileId });
  return <DesktopEnvironment config={config} />;
}

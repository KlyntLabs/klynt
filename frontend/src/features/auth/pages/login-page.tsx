import { AuthKioskDesktop } from "@/features/desktop/components/AuthKioskDesktop";
import { buildAuthKioskDesktop } from "@/features/desktop/factory/auth-kiosk-desktop";

export default function LoginPage() {
  return <AuthKioskDesktop config={buildAuthKioskDesktop("login")} />;
}

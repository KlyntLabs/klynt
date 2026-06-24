import { AuthKioskDesktop } from "@/features/desktop/components/AuthKioskDesktop";
import { buildAuthKioskDesktop } from "@/features/desktop/factory/auth-kiosk-desktop";

export default function RegisterPage() {
  return <AuthKioskDesktop config={buildAuthKioskDesktop("register")} />;
}

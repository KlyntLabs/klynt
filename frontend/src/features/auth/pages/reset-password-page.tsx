import { AuthKioskDesktop } from "@/features/desktop/components/AuthKioskDesktop";
import { buildAuthKioskDesktop } from "@/features/desktop/factory/auth-kiosk-desktop";

export default function ResetPasswordPage() {
  return <AuthKioskDesktop config={buildAuthKioskDesktop("reset-password")} />;
}

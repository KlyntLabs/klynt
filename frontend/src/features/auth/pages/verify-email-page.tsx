import { AuthKioskDesktop } from "@/features/desktop/components/AuthKioskDesktop";
import { buildAuthKioskDesktop } from "@/features/desktop/factory/auth-kiosk-desktop";

export default function VerifyEmailPage() {
  return <AuthKioskDesktop config={buildAuthKioskDesktop("verify-email")} />;
}

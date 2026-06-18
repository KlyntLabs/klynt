import { RegisterForm } from "@/features/auth/components/register-form";
import { useTranslation } from "react-i18next";

export default function RegisterPage() {
  const { t } = useTranslation("auth");

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">{t("register.title")}</h1>
      <RegisterForm />
    </div>
  );
}

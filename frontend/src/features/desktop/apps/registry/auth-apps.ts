import { Key, Lock, LogIn, Mail, UserPlus } from "lucide-react";
import { ForgotPasswordApp } from "@/features/auth/components/forgot-password-app";
import { LoginApp } from "@/features/auth/components/login-app";
import { RegisterApp } from "@/features/auth/components/register-app";
import { ResetPasswordApp } from "@/features/auth/components/reset-password-app";
import { VerifyEmailApp } from "@/features/auth/components/verify-email-app";
import type { AppRegistry } from "../types";

export const authApps: AppRegistry = [
  {
    id: "login",
    title: "auth:login.title",
    icon: LogIn,
    category: "system",
    component: LoginApp,
    defaultSize: { width: 420, height: 480 },
    singleton: true,
  },
  {
    id: "register",
    title: "auth:register.title",
    icon: UserPlus,
    category: "system",
    component: RegisterApp,
    defaultSize: { width: 420, height: 520 },
    singleton: true,
  },
  {
    id: "verify-email",
    title: "auth:verifyEmail.title",
    icon: Mail,
    category: "system",
    component: VerifyEmailApp,
    defaultSize: { width: 420, height: 240 },
    singleton: true,
  },
  {
    id: "forgot-password",
    title: "auth:forgotPassword.title",
    icon: Lock,
    category: "system",
    component: ForgotPasswordApp,
    defaultSize: { width: 420, height: 360 },
    singleton: true,
  },
  {
    id: "reset-password",
    title: "auth:resetPassword.title",
    icon: Key,
    category: "system",
    component: ResetPasswordApp,
    defaultSize: { width: 420, height: 380 },
    singleton: true,
  },
];

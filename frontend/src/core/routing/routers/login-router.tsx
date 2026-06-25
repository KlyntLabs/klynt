import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { GuestRoute } from "@/core/auth";

const LoginPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.LoginPage }))
);

export const loginRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <GuestRoute>
        <Suspense fallback={<Spinner />}>
          <LoginPage />
        </Suspense>
      </GuestRoute>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

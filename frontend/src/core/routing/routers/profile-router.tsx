import { Spinner } from "@astryxdesign/core/Spinner";
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

const PublicProfilePage = lazy(() =>
  import("@/features/user/pages/public-profile-page").then((module) => ({
    default: module.PublicProfilePage,
  }))
);

export function createProfileRouter(username: string) {
  return createBrowserRouter([
    {
      path: "/",
      element: (
        <Suspense fallback={<Spinner />}>
          <PublicProfilePage username={username} />
        </Suspense>
      ),
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);
}

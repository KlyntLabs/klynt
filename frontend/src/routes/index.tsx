import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RootLayout } from "@/app/layout/root-layout";
import { routePaths } from "@/routes/route-paths";

const router = createBrowserRouter([
  {
    path: routePaths.home,
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <div className="p-6">Welcome to Klynt</div>,
      },
      {
        path: routePaths.dashboard,
        element: <div className="p-6">Dashboard (coming soon)</div>,
      },
      {
        path: routePaths.login,
        element: <div className="p-6">Login (coming soon)</div>,
      },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}

import { RouterProvider } from "react-router-dom";
import { router } from "./route-tree";

export function AppRouter() {
  return <RouterProvider router={router} />;
}

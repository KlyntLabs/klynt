import { Link } from "react-router-dom";
import { routePaths } from "./route-paths";

export default function NotFoundPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to={routePaths.home} className="mt-4 inline-block text-blue-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}

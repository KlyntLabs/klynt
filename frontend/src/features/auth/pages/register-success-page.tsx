import { routePaths } from "@/core/routing/route-paths";
import { Link, useLocation } from "react-router-dom";

interface LocationState {
  user?: { name: string; email: string };
}

export default function RegisterSuccessPage() {
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Account created</h1>
      {state?.user ? (
        <p className="text-slate-700">
          Welcome, {state.user.name}. A verification link has been sent to {state.user.email}.
        </p>
      ) : (
        <p className="text-slate-700">A verification link has been sent to your email.</p>
      )}
      <Link to={routePaths.home} className="mt-4 inline-block text-blue-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}

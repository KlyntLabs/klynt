import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useVerifyEmail } from "@/core/auth/hooks/use-verify-email";

export function VerifyEmailApp() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const verify = useVerifyEmail();

  useEffect(() => {
    if (token && !verify.isPending && !verify.isSuccess && !verify.isError) {
      verify.mutate({ token });
    }
  }, [token, verify]);

  return (
    <div className="flex items-center justify-center h-full">
      <Spinner />
    </div>
  );
}

import { Spinner } from "@astryxdesign/core/Spinner";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useVerifyEmail } from "@/core/auth/hooks/use-verify-email";

export function VerifyEmailApp() {
  const { token: tokenParam } = useParams<{ token: string }>();
  const token = tokenParam ?? "";
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

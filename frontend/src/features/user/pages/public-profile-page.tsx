import { useAuthModule } from "@/core/auth/auth-module";

export interface PublicProfilePageProps {
  username: string;
}

export function PublicProfilePage({ username }: PublicProfilePageProps) {
  const { user } = useAuthModule();
  const isOwner = user?.username === username;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{username}</h1>
        <p className="text-muted-foreground">
          {isOwner
            ? "This is your public profile."
            : "This profile is private. Only the owner can see detailed information."}
        </p>
      </div>
    </div>
  );
}

export default PublicProfilePage;

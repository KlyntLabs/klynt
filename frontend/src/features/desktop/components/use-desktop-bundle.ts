import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { AppSummary } from "@/features/desktop/api/desktop-apps-api";
import { desktopAppsApi } from "@/features/desktop/api/desktop-apps-api";

export function useDesktopBundle(slug: string): {
  apps: AppSummary[];
  etag: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ["desktop-bundle", slug],
    queryFn: async () => {
      const response = await desktopAppsApi.getDesktop(slug);
      return response.data.data;
    },
    enabled: slug.length > 0,
  });

  const refetch = useCallback(() => {
    void queryRefetch();
  }, [queryRefetch]);

  return {
    apps: data?.apps ?? [],
    etag: data?.etag ?? null,
    isLoading,
    error: error ?? null,
    refetch,
  };
}

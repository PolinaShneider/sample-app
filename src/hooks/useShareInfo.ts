"use client";

import { useQuery } from "@tanstack/react-query";
import { getShareByToken } from "@/data/share";

export function useShareInfo(token: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["share", token],
    queryFn: () => getShareByToken(token!),
    enabled: !!token,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

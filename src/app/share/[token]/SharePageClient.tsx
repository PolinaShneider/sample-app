"use client";

import { useParams } from "next/navigation";
import { useShareInfo } from "@/hooks/useShareInfo";
import { ShareDownload } from "./ShareDownload";

export function SharePageClient() {
  const params = useParams();
  const token = params?.token as string | undefined;
  const { data, isLoading, error } = useShareInfo(token);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
        <main className="mx-auto w-full max-w-md space-y-6 text-center">
          <p className="text-sm text-zinc-500">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
        <main className="mx-auto w-full max-w-md space-y-6 text-center">
          <h1 className="text-xl font-semibold text-white">Shared file</h1>
          <p className="text-sm text-red-400">{error ?? "Not found"}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <main className="mx-auto w-full max-w-md space-y-6 text-center">
        <h1 className="text-xl font-semibold text-white">Shared file</h1>
        <p className="break-words text-lg font-medium text-zinc-200" title={data.original_filename}>
          {data.original_filename}
        </p>
        <p className="text-sm text-zinc-400">
          {data.pii_redacted ? "This file has PII redacted." : "Click below to download."}
        </p>
        <ShareDownload share={data} />
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createShare, revokeShare } from "@/data/share";

export function ShareModal({
  fileId,
  onClose,
}: {
  fileId: string;
  onClose: () => void;
}) {
  const [piiRedacted, setPiiRedacted] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createShare(fileId, piiRedacted),
    onSuccess: ({ share_url, token }) => {
      setShareUrl(share_url);
      setShareToken(token);
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : "Failed to create link");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokeShare(shareToken!),
    onSuccess: () => {
      setShareUrl(null);
      setShareToken(null);
    },
  });

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">Share link</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!shareUrl ? (
          <div className="mt-6 space-y-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={piiRedacted}
                onChange={(e) => setPiiRedacted(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span className="text-sm text-zinc-700">
                Black out PII before sharing
              </span>
            </label>
            <p className="text-xs text-zinc-500">
              When enabled, emails, phones, and SSN-like patterns are redacted
              in the shared file.
            </p>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create link"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-xs text-zinc-500">
              Anyone with this link can download the file. No login required.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900"
              />
              <button
                type="button"
                onClick={copyLink}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Copy
              </button>
            </div>
            <div className="flex gap-2">
              {shareToken && (
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate()}
                  disabled={revokeMutation.isPending}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {revokeMutation.isPending ? "Revoking..." : "Revoke link"}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

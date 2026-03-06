"use client";

import { useState } from "react";
import { useFiles } from "@/hooks/useFiles";
import { ShareModal } from "./ShareModal";

export function DashboardClient() {
  const { files, isLoading, upload, uploadPending, download, remove } = useFiles();
  const [shareFileId, setShareFileId] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are allowed.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be 50MB or less.");
      return;
    }

    try {
      await upload(file);
      e.target.value = "";
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleDownload(id: string) {
    try {
      await download(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await remove(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-sm font-medium text-zinc-900">Upload PDF</h2>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white p-8 transition hover:border-zinc-400 hover:bg-zinc-50">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            disabled={uploadPending}
            className="hidden"
          />
          {uploadPending ? (
            <span className="text-sm text-zinc-500">Uploading...</span>
          ) : (
            <>
              <span className="text-sm font-medium text-zinc-600">
                Drop a PDF here or click to browse
              </span>
              <span className="mt-1 text-xs text-zinc-500">
                Max 50MB per file
              </span>
            </>
          )}
        </label>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium text-zinc-900">Your files</h2>

        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : files.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            No files yet. Upload a PDF to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {f.filename}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatSize(f.size_bytes)} · {formatDate(f.created_at)}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(f.id)}
                    className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareFileId(f.id)}
                    className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {shareFileId && (
        <ShareModal
          fileId={shareFileId}
          onClose={() => setShareFileId(null)}
        />
      )}
    </div>
  );
}

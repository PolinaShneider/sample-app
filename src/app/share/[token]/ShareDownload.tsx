"use client";

import { useState } from "react";
import type { ShareInfo } from "@/data/share";

export function ShareDownload({ share }: { share: ShareInfo }) {
  const [loading, setLoading] = useState(false);

  function handleDownload() {
    setLoading(true);
    const a = document.createElement("a");
    a.href = share.download_url;
    a.download = share.filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-zinc-900 shadow-lg transition hover:bg-zinc-100 disabled:opacity-50"
    >
      {loading ? "Preparing..." : "Download file"}
    </button>
  );
}

export type ShareInfo = {
  download_url: string;
  filename: string;
  original_filename: string;
  pii_redacted: boolean;
};

export type CreateShareResult = {
  token: string;
  share_url: string;
};

export async function getShareByToken(token: string): Promise<ShareInfo> {
  const res = await fetch(`/api/share/${token}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to load share");
  }
  return res.json();
}

export async function createShare(fileId: string, piiRedacted: boolean): Promise<CreateShareResult> {
  const res = await fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, pii_redacted: piiRedacted }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to create link");
  }
  return res.json();
}

export async function revokeShare(token: string): Promise<void> {
  const res = await fetch("/api/share", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to revoke link");
  }
}

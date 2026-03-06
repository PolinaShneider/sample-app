export type FileRecord = {
  id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
};

export type CreateUploadResult = {
  file_id: string;
  upload_url: string;
  s3_key: string;
};

export async function listFiles(): Promise<FileRecord[]> {
  const res = await fetch("/api/files");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to list files");
  }
  const data = await res.json();
  return data.files ?? [];
}

export async function createUpload(filename: string, sizeBytes: number): Promise<CreateUploadResult> {
  const res = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, size_bytes: sizeBytes }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to create upload");
  }
  return res.json();
}

export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) {
    throw new Error("Failed to upload file to storage");
  }
}

export async function confirmUpload(fileId: string): Promise<void> {
  const res = await fetch(`/api/files/${fileId}/confirm`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to confirm upload");
  }
}

export async function getDownloadUrl(fileId: string): Promise<string> {
  const res = await fetch(`/api/files/${fileId}/download`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to get download URL");
  }
  const data = await res.json();
  return data.download_url;
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to delete");
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getServerSession } from "@/server/auth";
import { getSql } from "@/server/db";
import { getPresignedPutUrl } from "@/server/s3";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PDF_MIME = "application/pdf";

const postSchema = z.object({
  filename: z.string().min(1),
  size_bytes: z.number().int().positive().max(MAX_FILE_SIZE),
});

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, filename, size_bytes, mime_type, created_at
      FROM files
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ files: rows });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { filename, size_bytes } = parsed.data;

  if (!filename.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  const fileId = crypto.randomUUID();
  const ext = filename.replace(/^.*\./, "") || "pdf";
  const safeName = `${nanoid(8)}-${filename}`;
  const s3Key = `uploads/${session.user.id}/${fileId}-${safeName}`;

  try {
    const uploadUrl = await getPresignedPutUrl(s3Key, PDF_MIME);

    const sql = getSql();
    await sql`
      INSERT INTO files (id, user_id, filename, s3_key, size_bytes, mime_type)
      VALUES (${fileId}, ${session.user.id}, ${filename}, ${s3Key}, ${size_bytes}, ${PDF_MIME})
    `;

    return NextResponse.json({
      file_id: fileId,
      upload_url: uploadUrl,
      s3_key: s3Key,
    });
  } catch (error) {
    console.error("Error creating upload:", error);
    return NextResponse.json(
      { error: "Failed to create upload" },
      { status: 500 }
    );
  }
}

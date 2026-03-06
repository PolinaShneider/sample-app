import { NextResponse } from "next/server";
import { getServerSession } from "@/server/auth";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSql } from "@/server/db";
import { getObjectAsBuffer, putObject } from "@/server/s3";
import { redactPiiInPdf } from "@/server/pdf";

export const runtime = "nodejs";

const postSchema = z.object({
  file_id: z.string().uuid(),
  pii_redacted: z.boolean().default(false),
});

const deleteSchema = z.object({
  token: z.string().min(1),
});

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

  const { file_id, pii_redacted } = parsed.data;

  try {
    const sql = getSql();
    const [file] = await sql`
      SELECT id, s3_key, filename
      FROM files
      WHERE id = ${file_id} AND user_id = ${session.user.id}
    `;

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const token = nanoid(21);
    let s3KeyRedacted: string | null = null;

    if (pii_redacted) {
      const buffer = await getObjectAsBuffer(file.s3_key as string);
      if (!buffer) {
        return NextResponse.json(
          { error: "File not found in storage" },
          { status: 404 }
        );
      }
      const redactedPdfBuffer = await redactPiiInPdf(buffer);
      s3KeyRedacted = `shares/${token}`;
      await putObject(
        s3KeyRedacted,
        redactedPdfBuffer,
        "application/pdf"
      );
    }

    await sql`
      INSERT INTO share_links (file_id, token, pii_redacted, s3_key_redacted)
      VALUES (${file_id}, ${token}, ${pii_redacted}, ${s3KeyRedacted})
    `;

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const shareUrl = `${baseUrl}/share/${token}`;

    return NextResponse.json({ token, share_url: shareUrl });
  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token } = parsed.data;

  try {
    const sql = getSql();
    const [link] = await sql`
      SELECT sl.id
      FROM share_links sl
      JOIN files f ON f.id = sl.file_id
      WHERE sl.token = ${token} AND f.user_id = ${session.user.id}
    `;

    if (!link) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    await sql`
      UPDATE share_links
      SET revoked_at = NOW()
      WHERE token = ${token}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error revoking share link:", error);
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    );
  }
}

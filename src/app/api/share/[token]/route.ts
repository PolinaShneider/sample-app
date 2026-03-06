import { NextResponse } from "next/server";
import { getSql } from "@/server/db";
import { getObject, getPresignedGetUrl } from "@/server/s3";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const sql = getSql();
    const [link] = await sql`
      SELECT sl.pii_redacted, sl.s3_key_redacted, f.s3_key, f.filename
      FROM share_links sl
      JOIN files f ON f.id = sl.file_id
      WHERE sl.token = ${token} AND sl.revoked_at IS NULL
    `;

    if (!link) {
      return NextResponse.json(
        { error: "Share link not found or revoked" },
        { status: 404 }
      );
    }

    const s3Key = link.pii_redacted && link.s3_key_redacted
      ? (link.s3_key_redacted as string)
      : (link.s3_key as string);

    const downloadUrl = await getPresignedGetUrl(s3Key, 3600);

    const filename = link.filename as string;
    const baseName = filename.replace(/\.[^.]+$/, "");
    const ext = filename.split(".").pop() || "pdf";

    return NextResponse.json({
      download_url: downloadUrl,
      filename: `${baseName}${link.pii_redacted ? "-redacted" : ""}.${ext}`,
      original_filename: filename,
      pii_redacted: link.pii_redacted,
    });
  } catch (error) {
    console.error("Error fetching share:", error);
    return NextResponse.json(
      { error: "Failed to fetch share" },
      { status: 500 }
    );
  }
}

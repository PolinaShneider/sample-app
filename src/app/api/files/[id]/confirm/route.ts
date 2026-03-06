import { NextResponse } from "next/server";
import { getServerSession } from "@/server/auth";
import { getSql } from "@/server/db";
import { getObjectAsBuffer } from "@/server/s3";
import { extractTextFromPdf } from "@/server/pdf";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const sql = getSql();
    const [row] = await sql`
      SELECT id, s3_key
      FROM files
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    if (!row) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const s3Key = row.s3_key as string;
    const buffer = await getObjectAsBuffer(s3Key);
    if (!buffer) {
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }

    const extractedText = await extractTextFromPdf(buffer);

    await sql`
      INSERT INTO file_text_content (file_id, extracted_text, updated_at)
      VALUES (${id}, ${extractedText}, NOW())
      ON CONFLICT (file_id)
      DO UPDATE SET extracted_text = ${extractedText}, updated_at = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error confirming upload / extracting text:", error);
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}

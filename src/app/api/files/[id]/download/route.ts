import { NextResponse } from "next/server";
import { getServerSession } from "@/server/auth";
import { getSql } from "@/server/db";
import { getPresignedGetUrl } from "@/server/s3";

export const runtime = "nodejs";

export async function GET(
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
      SELECT s3_key
      FROM files
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    if (!row) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const url = await getPresignedGetUrl(row.s3_key as string, 3600);

    return NextResponse.json({ download_url: url });
  } catch (error) {
    console.error("Error getting download URL:", error);
    return NextResponse.json(
      { error: "Failed to get download URL" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "@/server/auth";
import { getSql } from "@/server/db";

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
      SELECT id, filename, size_bytes, mime_type, created_at
      FROM files
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    if (!row) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const [deleted] = await sql`
      DELETE FROM files
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

import { del } from "@vercel/blob";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const email = session.user?.email as string;
    const { id } = await params;

    const { rows } = await sql`
      SELECT file_url FROM documents
      WHERE id = ${id} AND user_email = ${email}
    `;

    if (rows[0]?.file_url) {
      await del(rows[0].file_url);
    }

    await sql`
      DELETE FROM documents
      WHERE id = ${id} AND user_email = ${email}
    `;

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

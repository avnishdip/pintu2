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
    await sql`
      DELETE FROM weight_entries
      WHERE id = ${id} AND user_email = ${email}
    `;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

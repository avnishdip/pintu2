import { sql } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const email = session.user?.email as string;

    const [bp, weight, temp, docs] = await Promise.all([
      sql`SELECT count(*)::int AS count FROM blood_pressure WHERE user_email = ${email}`,
      sql`SELECT count(*)::int AS count FROM weight_entries WHERE user_email = ${email}`,
      sql`SELECT count(*)::int AS count FROM temperature_entries WHERE user_email = ${email}`,
      sql`SELECT count(*)::int AS count FROM documents WHERE user_email = ${email}`,
    ]);

    return Response.json({
      data: {
        bp: bp.rows[0].count,
        weight: weight.rows[0].count,
        temp: temp.rows[0].count,
        docs: docs.rows[0].count,
      },
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

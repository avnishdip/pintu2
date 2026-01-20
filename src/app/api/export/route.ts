import { sql } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const email = session.user?.email as string;

    const [bp, weight, temp, docs] = await Promise.all([
      sql`SELECT entry_date, systolic, diastolic, notes FROM blood_pressure WHERE user_email = ${email} ORDER BY entry_date DESC`,
      sql`SELECT entry_date, weight, notes FROM weight_entries WHERE user_email = ${email} ORDER BY entry_date DESC`,
      sql`SELECT entry_date, temperature, notes FROM temperature_entries WHERE user_email = ${email} ORDER BY entry_date DESC`,
      sql`SELECT entry_date, doc_type, file_name, file_url, file_size, notes FROM documents WHERE user_email = ${email} ORDER BY entry_date DESC`,
    ]);

    return Response.json({
      data: {
        bp: bp.rows,
        weight: weight.rows,
        temp: temp.rows,
        docs: docs.rows,
      },
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

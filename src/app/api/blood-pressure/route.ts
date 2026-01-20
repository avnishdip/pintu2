import { sql } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const email = session.user?.email as string;
    const { rows } = await sql`
      SELECT id, entry_date, systolic, diastolic, notes
      FROM blood_pressure
      WHERE user_email = ${email}
      ORDER BY entry_date DESC, created_at DESC
    `;
    return Response.json({ data: rows });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const email = session.user?.email as string;
    const body = await request.json();
    const { entry_date, systolic, diastolic, notes } = body;

    if (!entry_date || !systolic || !diastolic) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO blood_pressure (user_email, entry_date, systolic, diastolic, notes)
      VALUES (${email}, ${entry_date}, ${systolic}, ${diastolic}, ${notes || null})
      RETURNING id, entry_date, systolic, diastolic, notes
    `;

    return Response.json({ data: rows[0] }, { status: 201 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

import { sql } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const email = session.user?.email as string;
    const payload = await request.json();

    const bp = Array.isArray(payload?.bp) ? payload.bp : [];
    const weight = Array.isArray(payload?.weight) ? payload.weight : [];
    const temp = Array.isArray(payload?.temp) ? payload.temp : [];

    await sql`DELETE FROM blood_pressure WHERE user_email = ${email}`;
    await sql`DELETE FROM weight_entries WHERE user_email = ${email}`;
    await sql`DELETE FROM temperature_entries WHERE user_email = ${email}`;

    for (const entry of bp) {
      await sql`
        INSERT INTO blood_pressure (user_email, entry_date, systolic, diastolic, notes)
        VALUES (${email}, ${entry.entry_date}, ${entry.systolic}, ${entry.diastolic}, ${entry.notes || null})
      `;
    }

    for (const entry of weight) {
      await sql`
        INSERT INTO weight_entries (user_email, entry_date, weight, notes)
        VALUES (${email}, ${entry.entry_date}, ${entry.weight}, ${entry.notes || null})
      `;
    }

    for (const entry of temp) {
      await sql`
        INSERT INTO temperature_entries (user_email, entry_date, temperature, notes)
        VALUES (${email}, ${entry.entry_date}, ${entry.temperature}, ${entry.notes || null})
      `;
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

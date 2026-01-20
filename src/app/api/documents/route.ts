import { put } from "@vercel/blob";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const email = session.user?.email as string;
    const { rows } = await sql`
      SELECT id, entry_date, doc_type, file_name, file_url, file_size, notes
      FROM documents
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
    const formData = await request.formData();
    const entryDate = formData.get("entry_date")?.toString();
    const docType = formData.get("doc_type")?.toString();
    const notes = formData.get("notes")?.toString() || null;
    const file = formData.get("file") as File | null;

    if (!entryDate || !docType || !file) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const blob = await put(file.name, file, {
      access: "public",
    });

    const { rows } = await sql`
      INSERT INTO documents (user_email, entry_date, doc_type, file_name, file_url, file_size, notes)
      VALUES (${email}, ${entryDate}, ${docType}, ${file.name}, ${blob.url}, ${file.size.toString()}, ${notes})
      RETURNING id, entry_date, doc_type, file_name, file_url, file_size, notes
    `;

    return Response.json({ data: rows[0] }, { status: 201 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

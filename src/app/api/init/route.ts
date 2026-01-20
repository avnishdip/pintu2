import { sql } from "@/lib/db";

export async function POST() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blood_pressure (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email TEXT NOT NULL,
      entry_date DATE NOT NULL,
      systolic INT NOT NULL,
      diastolic INT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS weight_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email TEXT NOT NULL,
      entry_date DATE NOT NULL,
      weight NUMERIC(6,2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS temperature_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email TEXT NOT NULL,
      entry_date DATE NOT NULL,
      temperature NUMERIC(4,1) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email TEXT NOT NULL,
      entry_date DATE NOT NULL,
      doc_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  return Response.json({ ok: true });
}

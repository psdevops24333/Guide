import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key)
    return NextResponse.json({ ok: false, error: "env vars ไม่ครบ" });

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("manuals").select("id").limit(1);

  return NextResponse.json({
    ok: !error,
    result: error ? error.message : "✅ เชื่อมต่อสำเร็จ",
    data,
  });
}

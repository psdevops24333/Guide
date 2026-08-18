import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Section = { id: string; image_url: string; content: string; step_order: number };
type Manual = { id: string; title: string; sections: Section[] };

export default async function SharedManual({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: manual } = await supabase
    .from("manuals")
    .select("*, sections(*)")
    .eq("share_id", shareId)
    .single<Manual>();

  if (!manual) return <main className="p-8">ไม่พบคู่มือนี้</main>;

  const sections = [...manual.sections].sort((a, b) => a.step_order - b.step_order);

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">{manual.title}</h1>
      {sections.map((sec, i) => (
        <section key={sec.id} className="mb-10">
          <h2 className="text-xl font-semibold mb-3">ขั้นตอนที่ {i + 1}</h2>
          <img src={sec.image_url} alt={`ขั้นตอนที่ ${i + 1}`} className="mb-4 rounded-lg border shadow" />
          <div className="whitespace-pre-wrap bg-white border rounded-lg p-4">{sec.content}</div>
        </section>
      ))}
    </main>
  );
}

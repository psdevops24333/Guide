"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Section = { id: string; image: string; text: string };
type Manual = { id: string; share_id: string; title: string; created_at: string };

export default function Home() {
  const [sections, setSections] = useState<Section[]>([]);
  const [title, setTitle] = useState("คู่มือใหม่");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadManuals = useCallback(async () => {
    const { data, error } = await supabase
      .from("manuals")
      .select("id, share_id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setManuals(data);
  }, []);

  useEffect(() => { loadManuals(); }, [loadManuals]);

  const handleUpload = async (file: File) => {
    setAnalyzing(true);
    setMessage("");
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const reader = new FileReader();
      reader.onload = () =>
        setSections((prev) => [
          ...prev,
          { id: crypto.randomUUID(), image: reader.result as string, text: data.text },
        ]);
      reader.readAsDataURL(file);
    } catch (e) {
      setMessage("❌ วิเคราะห์ภาพไม่สำเร็จ: " + (e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateSection = (id: string, text: string) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));

  const removeSection = (id: string) =>
    setSections((prev) => prev.filter((s) => s.id !== id));

  const saveManual = async () => {
    if (sections.length === 0) return setMessage("⚠️ ยังไม่มีขั้นตอนให้เซฟ");
    setSaving(true);
    setMessage("");
    try {
      const { data: manual, error: mErr } = await supabase
        .from("manuals")
        .insert({ title })
        .select()
        .single();
      if (mErr) throw mErr;

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const fileName = `${manual.id}/${Date.now()}-${i}.png`;
        const blob = await (await fetch(sec.image)).blob();
        const { error: upErr } = await supabase.storage
          .from("manual-images")
          .upload(fileName, blob, { contentType: "image/png" });
        if (upErr) throw upErr;

        const imageUrl = supabase.storage.from("manual-images").getPublicUrl(fileName).data.publicUrl;

        const { error: sErr } = await supabase.from("sections").insert({
          manual_id: manual.id,
          image_url: imageUrl,
          content: sec.text,
          step_order: i + 1,
        });
        if (sErr) throw sErr;
      }

      setMessage(`✅ เซฟสำเร็จ! ลิงก์แชร์: ${window.location.origin}/manual/${manual.share_id}`);
      setSections([]);
      loadManuals();
    } catch (e) {
      setMessage("❌ เซฟไม่สำเร็จ: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📖 คู่มือการตั้งค่า</h1>

      {/* อัปโหลดรูป */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 bg-white"
        onClick={() => fileRef.current?.click()}
      >
        <p className="text-lg">🖼️ คลิกเพื่ออัปโหลดรูปหน้าจอ (Screenshot)</p>
        <p className="text-sm text-gray-500 mt-1">AI จะวิเคราะห์และเขียนขั้นตอนให้อัตโนมัติ</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
      </div>
      {analyzing && <p className="mt-4 text-blue-600">⏳ กำลังวิเคราะห์ภาพด้วย AI...</p>}

      {/* ชื่อคู่มือ */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-6 w-full p-3 border rounded-lg bg-white font-semibold"
      />

      {/* ขั้นตอนที่วิเคราะห์แล้ว */}
      {sections.map((sec, i) => (
        <div key={sec.id} className="mt-6 bg-white border rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">ขั้นตอนที่ {i + 1}</h2>
            <button onClick={() => removeSection(sec.id)} className="text-red-500 text-sm">
              🗑️ ลบ
            </button>
          </div>
          <img src={sec.image} alt={`ขั้นตอนที่ ${i + 1}`} className="max-h-64 rounded-lg border mb-3" />
          <textarea
            value={sec.text}
            onChange={(e) => updateSection(sec.id, e.target.value)}
            rows={8}
            className="w-full p-3 border rounded-lg font-mono text-sm"
          />
        </div>
      ))}

      {sections.length > 0 && (
        <button
          onClick={saveManual}
          disabled={saving}
          className="mt-6 w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {saving ? "กำลังเซฟ..." : "💾 เซฟคู่มือ"}
        </button>
      )}

      {message && <p className="mt-4 text-sm break-all">{message}</p>}

      {/* รายการคู่มือที่เซฟแล้ว */}
      {manuals.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-3">คู่มือที่บันทึกแล้ว</h2>
          <ul className="space-y-2">
            {manuals.map((m) => (
              <li key={m.id} className="bg-white border rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{m.title}</p>
                  <a href={`/manual/${m.share_id}`} className="text-blue-600 text-sm">
                    🔗 เปิดลิงก์แชร์
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Section = { id: string; image: string; text: string };
type Manual = { id: string; share_id: string; title: string; created_at: string };
type ChatMsg = { role: "user" | "model"; content: string; image?: string };

export default function Home() {
  // สเตตหลัก
  const [sections, setSections] = useState<Section[]>([]);
  const [title, setTitle] = useState("คู่มือใหม่");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // สเตตแชท
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [chatting, setChatting] = useState(false);

  const loadManuals = useCallback(async () => {
    const { data } = await supabase
      .from("manuals")
      .select("id, share_id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setManuals(data);
  }, []);

  useEffect(() => { loadManuals(); }, [loadManuals]);

  // อัปโหลดหลายรูปพร้อมกัน
  const handleUploadMultiple = async (files: FileList | File[]) => {
    setAnalyzing(true);
    setMessage("");
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("image", file);
      try {
        const res = await fetch("/api/analyze", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const reader = new FileReader();
        reader.onload = () => {
          setSections((prev) => [...prev, { id: crypto.randomUUID(), image: reader.result as string, text: data.text }]);
        };
        reader.readAsDataURL(file);
      } catch (e) {
        setMessage(`❌ วิเคราะห์ภาพ ${file.name} ไม่สำเร็จ: ` + (e as Error).message);
      }
    }
    setAnalyzing(false);
  };

  // ส่งข้อความแชท
  const sendChatMessage = async () => {
    if (!chatInput.trim() && !chatImage) return;
    setChatting(true);

    const newUserMsg: ChatMsg = { role: "user", content: chatInput, image: chatImage || undefined };
    const newHistory = [...chatMessages, newUserMsg];
    setChatMessages(newHistory);
    setChatInput("");
    setChatImage(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory, imageBase64: newUserMsg.image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatMessages((prev) => [...prev, { role: "model", content: data.text }]);
    } catch (e) {
      alert("Chat error: " + (e as Error).message);
    } finally {
      setChatting(false);
    }
  };

  // เพิ่มคำตอบแชทเป็นขั้นตอนในคู่มือ
  const addChatToManual = (content: string, imageUrl?: string) => {
    setSections((prev) => [
      ...prev,
      { id: crypto.randomUUID(), image: imageUrl || "https://placehold.co/600x400/png?text=No+Image", text: content },
    ]);
  };

  // เซฟคู่มือ
  const saveManual = async () => {
    if (sections.length === 0) return setMessage("⚠️ ยังไม่มีขั้นตอนให้เซฟ");
    setSaving(true);
    setMessage("");
    try {
      const { data: manual, error: mErr } = await supabase.from("manuals").insert({ title }).select().single();
      if (mErr) throw mErr;

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        let imageUrl = sec.image;

        if (sec.image.startsWith("data:")) {
          const fileName = `${manual.id}/${Date.now()}-${i}.png`;
          const blob = await (await fetch(sec.image)).blob();
          await supabase.storage.from("manual-images").upload(fileName, blob, { contentType: "image/png" });
          imageUrl = supabase.storage.from("manual-images").getPublicUrl(fileName).data.publicUrl;
        }

        await supabase.from("sections").insert({
          manual_id: manual.id,
          image_url: imageUrl,
          content: sec.text,
          step_order: i + 1,
        });
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
    <main className="max-w-6xl mx-auto p-6 flex flex-col lg:flex-row gap-8">
      {/* ฝั่งซ้าย: ทำคู่มือ */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-6">📖 คู่มือการตั้งค่า</h1>
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 bg-white"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-lg">🖼️ คลิกหรือลากรูปมาวาง (เลือกได้หลายรูป)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleUploadMultiple(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {analyzing && <p className="mt-4 text-blue-600">⏳ กำลังวิเคราะห์ภาพ...</p>}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-6 w-full p-3 border rounded-lg font-semibold"
        />

        {sections.map((sec, i) => (
          <div key={sec.id} className="mt-6 bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between mb-3">
              <h2 className="font-bold">ขั้นตอนที่ {i + 1}</h2>
              <button onClick={() => setSections((prev) => prev.filter((s) => s.id !== sec.id))} className="text-red-500">
                🗑️ ลบ
              </button>
            </div>
            <img src={sec.image} className="max-h-64 rounded-lg border mb-3 object-contain" alt="" />
            <textarea
              value={sec.text}
              onChange={(e) => setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, text: e.target.value } : s)))}
              rows={5}
              className="w-full p-3 border rounded-lg font-mono text-sm"
            />
          </div>
        ))}

        {sections.length > 0 && (
          <button onClick={saveManual} disabled={saving} className="mt-6 w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
            {saving ? "กำลังเซฟ..." : "💾 เซฟคู่มือ"}
          </button>
        )}
        {message && <p className="mt-4 text-sm font-bold">{message}</p>}
      </div>

      {/* ฝั่งขวา: แชทกับ AI */}
      <div className="lg:w-96 bg-gray-50 border rounded-xl p-4 flex flex-col h-[800px]">
        <h2 className="text-xl font-bold mb-4">💬 คุยกับผู้ช่วย AI</h2>
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {chatMessages.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg ${m.role === "user" ? "bg-blue-100 ml-8" : "bg-white border mr-8"}`}>
              {m.image && <img src={m.image} className="w-full rounded mb-2" alt="" />}
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              {m.role === "model" && (
                <button
                  onClick={() => addChatToManual(m.content, chatMessages[i - 1]?.image)}
                  className="mt-2 text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                >
                  ➕ เพิ่มลงในคู่มือ
                </button>
              )}
            </div>
          ))}
          {chatting && <p className="text-sm text-gray-500">AI กำลังพิมพ์...</p>}
        </div>

        <div className="border-t pt-4 space-y-2">
          {chatImage && <img src={chatImage} className="h-20 rounded border" alt="" />}
          <div className="flex gap-2">
            <button
              className="px-3 border rounded bg-white"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = () => setChatImage(r.result as string);
                    r.readAsDataURL(f);
                  }
                };
                input.click();
              }}
            >
              🖼️
            </button>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              className="flex-1 border rounded p-2 text-sm"
              placeholder="พิมพ์ถาม AI..."
            />
            <button onClick={sendChatMessage} disabled={chatting} className="bg-blue-600 text-white px-4 rounded text-sm disabled:opacity-50">
              ส่ง
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

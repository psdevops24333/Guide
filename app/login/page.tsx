"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ถ้าล็อกอินอยู่แล้ว → ข้ามไปหน้าแรก
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) router.replace("/");
    });
  }, [router]);

  const handleSubmit = async () => {
    setMsg("");
    if (!email || !password) return setMsg("❌ กรอกอีเมลและรหัสผ่านก่อน");
    setLoading(true);

    const res =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (res.error) return setMsg("❌ " + res.error.message);

    if (mode === "signup" && !res.data.session) {
      return setMsg("📧 สมัครสำเร็จ! ตรวจสอบอีเมลเพื่อยืนยัน (หรือปิด Confirm email ใน Supabase)");
    }

    router.replace("/"); // ✅ redirect ไปหน้าแรกหลังล็อกอิน
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">📖 คู่มือการตั้งค่า</h1>
          <p className="text-gray-500 mt-2">
            {mode === "login" ? "เข้าสู่ระบบเพื่อดำเนินการต่อ" : "สร้างบัญชีใหม่เพื่อเริ่มใช้งาน"}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="อีเมล"
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="รหัสผ่าน"
            className="w-full p-3 border rounded-lg"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-sm text-blue-600"
          >
            {mode === "login" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
          </button>
          {msg && <p className="text-sm font-bold">{msg}</p>}
        </div>
      </div>
    </main>
  );
}

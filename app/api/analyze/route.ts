import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "ไม่พบรูปภาพ" }, { status: 400 });

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey)
      return NextResponse.json({ error: "ไม่ได้ตั้งค่า GOOGLE_API_KEY" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการตั้งค่าระบบ อ่านภาพหน้าจอนี้แล้วเขียนคู่มือการตั้งค่าทีละขั้นตอนเป็นภาษาไทย:
1. บอกว่าหน้าจอ/เมนูนี้คืออะไร
2. อธิบายแต่ละช่องหรือตัวเลือกที่เห็นในภาพ ว่าควรกรอกหรือเลือกอะไร (ให้ตัวอย่างค่า)
3. แนะนำว่าหลังจากนี้ควรทำอะไรต่อ
เขียนเป็น Markdown ใช้หัวข้อและ bullet ให้อ่านง่าย ไม่ต้องทายข้อมูลที่มองไม่เห็นในภาพ`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: bytes.toString("base64"), mimeType: file.type } },
    ]);

    return NextResponse.json({ text: result.response.text() });
  } catch (err) {
    console.error("Gemini analyze error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

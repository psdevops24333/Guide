import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, imageBase64 } = await req.json();
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "No API Key" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // จัดเตรียมประวัติแชท (ยกเว้นข้อความล่าสุด)
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const latestMsg = messages[messages.length - 1];
    const parts: any[] = [{ text: latestMsg.content }];

    // แนบรูปภาพถ้ามี
    if (imageBase64) {
      const mimeType = imageBase64.substring(imageBase64.indexOf(":") + 1, imageBase64.indexOf(";"));
      const base64Data = imageBase64.split(",")[1];
      parts.push({ inlineData: { data: base64Data, mimeType } });
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(parts);

    return NextResponse.json({ text: result.response.text() });
  } catch (err) {
    console.error("Chat Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

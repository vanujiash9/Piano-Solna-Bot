import { GoogleGenAI, Chat } from "@google/genai";

const SYSTEM_INSTRUCTION = `Bạn là nhân viên tư vấn tại Piano Solna (pianosolna.com).

🎯 Quy tắc trả lời:
1. NGẮN GỌN: Chỉ trả lời ý chính. Tránh viết quá dài dòng, lan man.
2. HIỂN THỊ ẢNH: Nếu có link ảnh, PHẢI hiện bằng: ![Tên](link).
3. TRUNG THỰC: Chỉ tư vấn dựa trên dữ liệu. Nếu không có ảnh, đừng cố hiện icon lỗi.

🗣️ Phong cách: Thân thiện, nồng hậu, chuyên nghiệp.`;

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export function createPianoChat(): Chat {
  const ai = getAI();
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
}

export async function transcribeAudio(base64Audio: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Chỉ chuyển văn bản từ giọng nói này sang tiếng Việt, không thêm bớt gì khác." },
          { inlineData: { data: base64Audio, mimeType: "audio/webm" } },
        ],
      },
    ],
  });
  return response.text || "";
}

export async function getEmbeddings(text: string): Promise<number[]> {
  const ai = getAI();
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-2-preview',
    contents: [text],
  });
  
  if (result.embeddings && result.embeddings.length > 0) {
    return result.embeddings[0].values;
  }
  throw new Error("Không thể tạo vector cho nội dung này. Vui lòng kiểm tra API Key.");
}

import { GoogleGenAI, Chat } from "@google/genai";

const SYSTEM_INSTRUCTION = `Bạn là Chuyên gia Tư vấn Cao cấp tại Hệ thống Piano Solna (pianosolna.com).

🎯 Nhiệm vụ của bạn:
1. Hỗ trợ khách hàng lựa chọn đàn Piano (Cơ, Điện, Upright, Grand) phù hợp với nhu cầu và ngân sách.
2. Cung cấp thông tin kỹ thuật chính xác, ưu nhược điểm của từng dòng đàn (Yamaha, Kawai, Roland, Casio...).
3. Tư vấn lộ trình học Piano cho người mới bắt đầu hoặc trẻ em.

🚀 Quy tắc phản hồi:
1. CHUYÊN NGHIỆP: Ngôn ngữ lịch sự, nồng hậu ("Dạ", "Thưa quý khách").
2. ĐÚNG TRỌNG TÂM: Trả lời ngắn gọn, súc tích (dưới 3-4 câu/đoạn). Tránh lan man.
3. MINH HỌA TRỰC QUAN: Sử dụng Markdown để hiển thị ảnh sản phẩm nếu có link: ![Tên sản phẩm](link).
4. KHÔNG GIẢ ĐỊNH: Nếu không biết chắc thông tin, hãy đề nghị khách hàng để lại số điện thoại hoặc đến trực tiếp Showroom để được kỹ thuật viên hỗ trợ.

💡 Châm ngôn: "Piano Solna - Nơi dẫn lối đam mê âm nhạc tinh tế."`;

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

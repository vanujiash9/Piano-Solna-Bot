import { getEmbeddings } from "../services/geminiService";
import { searchKnowledge } from "./supabase";

export async function getContextualPrompt(userQuery: string): Promise<string> {
  try {
    // 1. Get embedding for the query
    const embedding = await getEmbeddings(userQuery);

    // 2. Search for relevant context
    const matches = await searchKnowledge(embedding);

    if (!matches || matches.length === 0) {
      return userQuery;
    }

    // 3. Construct context string
    const contextStr = matches
      .map((m: any) => `💎 SẢN PHẨM: ${m.brand || m.title} ${m.model || ''}
   - Giá: ${m.price}
   - Link Ảnh Bắt Buộc Sử Dụng: ${m.image_url || 'KHÔNG CÓ ẢNH'}
   - Mô tả: ${m.content}
   - Danh mục: ${m.category || 'Piano'}`)
      .join('\n\n---\n\n');

    // 4. Return augmented prompt
    return `Dữ liệu kho hàng:
${contextStr}

YÊU CẦU:
- Trả lời NGẮN GỌN câu hỏi: "${userQuery}"
- Nếu có link ảnh phía trên cho sản phẩm đang nhắc đến, bạn PHẢI hiện ảnh bằng ![tên](link).
- Nếu không có dữ liệu, hãy nói "Để mình kiểm tra lại kho rồi báo bạn" và mời ghé showroom: 140/27/11 Vườn Lài, Q.12.`;

  } catch (error) {
    console.error('RAG Error:', error);
    return userQuery;
  }
}

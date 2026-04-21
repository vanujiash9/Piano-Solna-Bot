import { createClient } from '@supabase/supabase-js';
import { getEmbeddings } from '../services/geminiService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function checkSupabaseConnection() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { connected: false, message: 'Chưa cấu hình Supabase' };
  }

  try {
    // A very basic check to see if we can reach Supabase.
    // We try to fetch the auth session which doesn't require specific tables.
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
        return { connected: false, message: 'Lỗi kết nối mạng' };
      }
      return { connected: false, message: 'Lỗi API Key/URL' };
    }
    
    return { connected: true, message: 'Đã kết nối Supabase' };
  } catch (err) {
    return { connected: false, message: 'Lỗi kết nối' };
  }
}

export async function searchKnowledge(embedding: number[]) {
  try {
    // 1. Gọi RPC để lấy danh sách ID khớp nhất (RPC có thể cũ, chỉ cần trả về ID và similarity)
    const [pianosRes, coursesRes, servicesRes] = await Promise.all([
      supabase.rpc('match_piano_knowledge', { query_embedding: embedding, match_threshold: 0.1, match_count: 5 }),
      supabase.rpc('match_piano_courses', { query_embedding: embedding, match_threshold: 0.1, match_count: 3 }),
      supabase.rpc('match_piano_services', { query_embedding: embedding, match_threshold: 0.1, match_count: 3 })
    ]);

    const allMatches: any[] = [];

    // 2. Với mỗi kết quả, truy vấn ngược lại bảng để lấy ĐẦY ĐỦ các cột (bao gồm image_url)
    // Điều này giúp hệ thống chạy được ngay cả khi người dùng chưa cập nhật SQL RPC
    if (pianosRes.data && pianosRes.data.length > 0) {
      const ids = pianosRes.data.map((m: any) => m.id);
      const { data: fullRows } = await supabase.from('piano_knowledge').select('*').in('id', ids);
      if (fullRows) {
        allMatches.push(...fullRows.map(row => ({
          ...row,
          similarity: pianosRes.data.find((m: any) => m.id === row.id)?.similarity
        })));
      }
    }

    if (coursesRes.data && coursesRes.data.length > 0) {
      const ids = coursesRes.data.map((m: any) => m.id);
      const { data: fullRows } = await supabase.from('piano_courses').select('*').in('id', ids);
      if (fullRows) {
        allMatches.push(...fullRows.map(row => ({
          ...row,
          similarity: coursesRes.data.find((m: any) => m.id === row.id)?.similarity
        })));
      }
    }

    if (servicesRes.data && servicesRes.data.length > 0) {
      const ids = servicesRes.data.map((m: any) => m.id);
      const { data: fullRows } = await supabase.from('piano_services').select('*').in('id', ids);
      if (fullRows) {
        allMatches.push(...fullRows.map(row => ({
          ...row,
          similarity: servicesRes.data.find((m: any) => m.id === row.id)?.similarity
        })));
      }
    }

    return allMatches.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export async function addKnowledge(data: {
  category: string;
  brand: string;
  model: string;
  content: string;
  price: string;
  image_url?: string;
}) {
  try {
    const searchString = `${data.category} ${data.brand} ${data.model}: ${data.content} ${data.price}`;
    const embedding = await getEmbeddings(searchString);
    
    const { error } = await supabase.from('piano_knowledge').insert({
      category: data.category,
      brand: data.brand,
      model: data.model,
      content: data.content,
      price: data.price,
      image_url: data.image_url,
      embedding
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error adding knowledge:', error);
    return { success: false, error };
  }
}

export async function addCourse(data: {
  title: string;
  price: string;
  schedule: string;
  duration: string;
  content: string;
  image_url?: string;
}) {
  try {
    const searchString = `Khóa học: ${data.title} ${data.content} ${data.price} ${data.schedule}`;
    const embedding = await getEmbeddings(searchString);
    
    const { error } = await supabase.from('piano_courses').insert({
      title: data.title,
      price: data.price,
      schedule: data.schedule,
      duration: data.duration,
      content: data.content,
      image_url: data.image_url,
      embedding
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error adding course:', error);
    return { success: false, error };
  }
}

export async function addService(data: {
  title: string;
  subtitle: string;
  content: string;
  image_url?: string;
}) {
  try {
    const searchString = `Dịch vụ: ${data.title} ${data.subtitle} ${data.content}`;
    const embedding = await getEmbeddings(searchString);
    
    const { error } = await supabase.from('piano_services').insert({
      title: data.title,
      subtitle: data.subtitle,
      content: data.content,
      image_url: data.image_url,
      embedding
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error adding service:', error);
    return { success: false, error };
  }
}

// Auth Helpers
export async function signUpWithEmail(email: string, password: string, metadata: { first_name: string, last_name: string }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${metadata.first_name} ${metadata.last_name}`,
        first_name: metadata.first_name,
        last_name: metadata.last_name
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updateMissingEmbeddings(onProgress?: (count: number) => void) {
  const tables = ['piano_knowledge', 'piano_courses', 'piano_services'];
  let totalUpdated = 0;

  console.log('Bắt đầu quét dữ liệu để cập nhật AI...');

  for (const table of tables) {
    const { data: allItems, error: fetchError } = await supabase
      .from(table)
      .select('*');

    if (fetchError) {
      console.error(`Lỗi khi đọc bảng ${table}:`, fetchError.message);
      continue;
    }
    
    if (!allItems || allItems.length === 0) {
      console.warn(`Bảng ${table} đang trống hoặc AI không có quyền đọc (hãy kiểm tra RLS).`);
      continue;
    }

    const missing = allItems.filter(item => !item.embedding);
    console.log(`Bảng ${table}: Tìm thấy ${allItems.length} mục, trong đó ${missing.length} mục thiếu AI.`);

    if (missing.length === 0) continue;

    for (const item of missing) {
      const searchString = table === 'piano_knowledge' 
        ? `${item.category || 'Đàn'} ${item.brand || ''} ${item.model || ''}: ${item.content || ''} ${item.price || ''}`
        : table === 'piano_courses'
          ? `Khóa học: ${item.title || ''} ${item.content || ''} ${item.price || ''} ${item.schedule || ''}`
          : `Dịch vụ: ${item.title || ''} ${item.subtitle || ''} ${item.content || ''}`;

      try {
        const embeddingValue = await getEmbeddings(searchString);
        const { error: updateError } = await supabase
          .from(table)
          .update({ embedding: embeddingValue })
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`Lỗi cập nhật dòng ID ${item.id} ở ${table}:`, updateError.message);
        } else {
          totalUpdated++;
          if (onProgress) onProgress(totalUpdated);
        }
      } catch (err) {
        console.error('Lỗi khi tạo Vector AI:', err);
      }
    }
  }
  console.log(`Hoàn tất cập nhật AI. Tổng số được xử lý: ${totalUpdated}`);
  return totalUpdated;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

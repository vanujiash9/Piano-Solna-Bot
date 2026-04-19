import { createClient } from '@supabase/supabase-js';

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

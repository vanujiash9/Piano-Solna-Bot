import { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle, Check, User, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Lỗi đăng nhập Google');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isRegister && password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      setLoading(false);
      return;
    }

    try {
      // Kiểm tra định dạng email cơ bản bằng Regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Địa chỉ email không hợp lệ. Vui lòng nhập đúng định dạng (VD: ten@gmail.com)');
        setLoading(false);
        return;
      }

      if (isRegister) {
        await signUpWithEmail(email, password, { first_name: firstName, last_name: lastName });
        setMessage('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
        setIsRegister(false); // Chuyển sang form đăng nhập
      } else {
        const data = await signInWithEmail(email, password);
        if (data.user) {
          onClose();
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || '';
      if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
        setError('Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc Đăng nhập!');
      } else if (errorMsg.includes('Email not confirmed') || errorMsg.includes('Invalid login credentials')) {
        setError('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại!');
      } else if (errorMsg.includes('signup_disabled')) {
        setError('Tính năng đăng ký tạm thời đóng.');
      } else {
        setError('Có lỗi xảy ra: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            className="bg-surface border border-line w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-8"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-serif font-bold text-white">
                  {isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  {isRegister ? 'Tham gia cộng đồng Piano Solna' : 'Đăng nhập để nhận tư vấn từ Piano Solna'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegister && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Họ</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="text" 
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="VD: Nguyễn"
                        className="w-full pl-11 pr-4 py-2.5 bg-bg border border-line rounded-xl text-sm focus:border-gold/50 outline-none transition-all text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Tên</label>
                    <input 
                      type="text" 
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="VD: Văn A"
                      className="w-full px-4 py-2.5 bg-bg border border-line rounded-xl text-sm focus:border-gold/50 outline-none transition-all text-white"
                    />
                  </div>
                </div>
              )}

                  <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Email (Gmail đăng nhập)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@gmail.com"
                    className="w-full pl-12 pr-4 py-3 bg-bg border border-line rounded-xl text-sm focus:border-gold/50 outline-none transition-all text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-bg border border-line rounded-xl text-sm focus:border-gold/50 outline-none transition-all text-white"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Nhập lại mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 bg-bg border border-line rounded-xl text-sm focus:border-gold/50 outline-none transition-all text-white"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs animate-shake">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {message && (
                <div className="p-3 bg-status-green/10 border border-status-green/20 rounded-xl flex items-start gap-3 text-status-green text-xs">
                  <Check size={14} className="shrink-0 mt-0.5" />
                  <p>{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gold text-bg font-black rounded-xl hover:bg-gold/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
              >
                {loading ? <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : 
                 isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
                {isRegister ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>

              {!isRegister && (
                <>
                  <div className="relative flex items-center gap-4 my-6">
                    <div className="h-[1px] flex-1 bg-line"></div>
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Hoặc</span>
                    <div className="h-[1px] flex-1 bg-line"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-4 bg-white/5 border border-line text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 shadow-xl"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.3h6.44c-.28 1.48-1.11 2.74-2.37 3.58v2.98h3.84c2.25-2.07 3.55-5.12 3.58-8.59z" fill="#4285F4"/>
                      <path d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.84-2.98c-1.06.71-2.42 1.13-4.11 1.13-3.17 0-5.85-2.14-6.81-5.02H1.28v3.11C3.26 21.3 7.35 24 12 24z" fill="#34A853"/>
                      <path d="M5.19 14.21c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26V6.58H1.28C.47 8.21 0 10.05 0 12s.47 3.79 1.28 5.42l3.91-3.21z" fill="#FBBC05"/>
                      <path d="M12 4.77c1.76 0 3.35.6 4.59 1.78l3.44-3.44C17.95 1.08 15.24 0 12 0 7.35 0 3.26 2.7 1.28 6.58l3.91 3.21c.96-2.88 3.64-5.02 6.81-5.02z" fill="#EA4335"/>
                    </svg>
                    Tiếp tục với Google
                  </button>
                </>
              )}
            </form>

            <div className="mt-8 pt-6 border-t border-line text-center">
              <p className="text-xs text-text-muted">
                {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                <button 
                  onClick={() => setIsRegister(!isRegister)}
                  className="ml-2 text-gold font-bold hover:underline"
                >
                  {isRegister ? 'Đăng nhập' : 'Đăng ký miễn phí'}
                </button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

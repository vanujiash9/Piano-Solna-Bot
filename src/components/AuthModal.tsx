import { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle, Check, User, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPasswordForEmail } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await resetPasswordForEmail(email);
      setMessage('Yêu cầu đã được gửi! Vui lòng kiểm tra email của bạn để đặt lại mật khẩu.');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi gửi yêu cầu đặt lại mật khẩu.');
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
      // Kiểm tra định dạng email
      const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-z]{2,})$/;
      const match = email.toLowerCase().match(emailRegex);
      
      if (!match) {
        setError('Email không đúng định dạng. Vui lòng kiểm tra lại!');
        setLoading(false);
        return;
      }

      // Bỏ qua kiểm tra tên miền khắt khe
      if (!match[1].includes('.')) {
        setError('Tên miền email không hợp lệ.');
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            className="bg-surface border border-line w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-8"
          >
            <div className="flex justify-between items-center mb-8">
              <div id="auth-modal-title">
                {isForgotPassword ? (
                  <button 
                    onClick={() => setIsForgotPassword(false)}
                    className="flex items-center gap-2 text-gold group mb-2"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Trở lại</span>
                  </button>
                ) : null}
                <h2 className="text-xl md:text-2xl font-serif font-bold text-white">
                  {isForgotPassword ? 'Quên mật khẩu' : isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  {isForgotPassword 
                    ? 'Nhập email để nhận liên kết đặt lại mật khẩu'
                    : isRegister ? 'Tham gia cộng đồng Piano Solna' : 'Đăng nhập để nhận tư vấn từ Piano Solna'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-colors self-start"
              >
                <X size={20} />
              </button>
            </div>

            {isForgotPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Email của bạn</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@pianosolna.vn"
                      className="w-full pl-12 pr-4 py-3 bg-bg border border-line rounded-xl text-sm focus:border-gold/50 outline-none transition-all text-white"
                    />
                  </div>
                </div>

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
                  {loading ? <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : <KeyRound size={18} />}
                  Gửi yêu cầu đặt lại
                </button>
              </form>
            ) : (
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
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Mật khẩu</label>
                    {!isRegister && (
                      <button 
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-[10px] font-bold text-gold hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
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
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-line text-center">
              <p className="text-xs text-text-muted">
                {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                <button 
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setIsForgotPassword(false);
                  }}
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

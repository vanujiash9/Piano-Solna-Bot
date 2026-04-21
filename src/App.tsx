import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Piano, 
  Send, 
  Mic, 
  Square, 
  User, 
  Bot, 
  Loader2, 
  MapPin, 
  Phone,
  Info,
  ChevronRight,
  Music4,
  Database,
  LogIn,
  LogOut,
  UserCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { createPianoChat, transcribeAudio } from './services/geminiService';
import { cn } from './lib/utils';
import { supabase, checkSupabaseConnection } from './lib/supabase';
import { getContextualPrompt } from './lib/ragService';
import { KnowledgeManager } from './components/KnowledgeManager';
import { AuthModal } from './components/AuthModal';

interface Message {
  role: 'user' | 'model';
  content: string;
  id: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Dạ chào bạn! Mình là nhân viên tư vấn của Piano Solna. Bạn đang quan tâm đến dòng piano nào hay cần mình tư vấn cho người mới bắt đầu ạ?',
      id: 'welcome'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chat, setChat] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<{connected: boolean, message: string} | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setChat(createPianoChat());
    
    const verifyDb = async () => {
      const status = await checkSupabaseConnection();
      setDbStatus(status);
    };
    verifyDb();

    // Listen for auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Danh sách Admin cố định: Chỉ đúng 2 tài khoản này mới thấy nút Quản lý
  const ADMIN_EMAILS = [
    'btthanhvan.19062004@gmail.com', // Email của bạn
    'admin@pianosolna.vn'           // Email phụ (bạn có thể đổi tùy ý)
  ];

  const displayUser = user;
  const isUserAdmin = displayUser && ADMIN_EMAILS.includes(displayUser.email || '');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (chat) {
        // Use RAG to get context for the user query
        const enrichedPrompt = await getContextualPrompt(messageText);
        
        const result = await chat.sendMessage({ message: enrichedPrompt });
        const modelMessage: Message = {
          role: 'model',
          content: result.text || 'Dạ, mình xin lỗi, có chút trục trặc kỹ thuật. Bạn nói lại giúp mình nhé!',
          id: (Date.now() + 1).toString()
        };
        setMessages(prev => [...prev, modelMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Dạ, hệ thống đang bận một chút, bạn chờ mình xíu nha!',
        id: (Date.now() + 1).toString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsLoading(true);
          try {
            const transcription = await transcribeAudio(base64Audio);
            if (transcription) {
              handleSend(transcription);
            }
          } catch (err) {
            console.error('Transcription error:', err);
          } finally {
            setIsLoading(false);
          }
        };
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Could not start recording', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="h-screen-safe flex flex-col md:flex-row font-sans bg-bg selection:bg-gold/30 overflow-hidden text-text-main">
      <KnowledgeManager isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex bg-surface text-text-main w-1/3 lg:w-1/4 p-6 lg:p-8 flex-col justify-between border-r border-line relative overflow-hidden h-full">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -ml-32 -mb-32" />

        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {/* Logo Section - Fixed top */}
          <motion.a 
            href="https://pianosolna.com/"
            target="_blank"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-8 shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-gold to-[#B8860B] rounded-xl flex items-center justify-center text-bg shadow-xl rotate-3">
              <Piano size={28} />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-white">Piano Solna</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-status-green rounded-full animate-pulse" />
                <p className="text-gold/90 text-[8px] uppercase tracking-[0.2em] font-bold">Showroom Hệ Thống</p>
              </div>
            </div>
          </motion.a>

          {/* Scrollable Mid Section */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
            <section>
              <h2 className="font-serif text-lg mb-3 italic text-gold">Dẫn lối đam mê</h2>
              <p className="text-text-muted text-[13px] leading-relaxed font-light mb-4">
                Chào mừng bạn đến với Piano Solna. Chúng tôi tự hào mang đến những cây đàn piano tinh túy nhất từ Nhật Bản cho ngôi nhà bạn.
              </p>
              
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase tracking-widest text-gold font-bold mb-2">Phân khúc được quan tâm nhất</p>
                {[
                  { label: 'Piano cho bé mới tập', query: 'Tư vấn cho bé 5-10 tuổi mới bắt đầu học piano điện' },
                  { label: 'Ngân sách dưới 20 triệu', query: 'Những mẫu piano điện tốt nhất tầm giá dưới 20 triệu' },
                  { label: 'Yamaha U3H huyền thoại', query: 'Đánh giá chi tiết và giá bán Yamaha U3H' },
                  { label: 'Piano điện phím gỗ', query: 'Tư vấn các dòng piano điện có phím gỗ thật như piano cơ' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.query)}
                    className="w-full text-left p-2.5 rounded-lg bg-card border border-line hover:border-gold/40 text-[11px] text-text-muted hover:text-white transition-all flex items-center justify-between group"
                  >
                    {item.label}
                    <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            </section>

            <nav className="space-y-4">
              <div className="flex items-start gap-4 group">
                <div className="w-9 h-9 rounded-lg bg-card border border-line flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-bg transition-all shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Hệ thống Chi nhánh</p>
                  <p className="text-[10px] font-medium leading-loose text-white/80">
                    📍 140/27/11 Vườn Lài, Q.12<br/>
                    📍 142 Lê Hồng Phong, Dĩ An<br/>
                    📍 Him Lam Phú An, Thủ Đức
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="w-9 h-9 rounded-lg bg-card border border-line flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-bg transition-all shrink-0">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Hotline Liên hệ</p>
                  <p className="text-[11px] font-bold text-white">090 687 6281</p>
                  <p className="text-[10px] text-text-muted italic">0896 405 421</p>
                </div>
              </div>
            </nav>
          </div>

                {/* Fixed Bottom Area */}
                <div className="mt-8 pt-6 border-t border-line/30 space-y-4 shrink-0">
                  {/* Supabase Status Indicator (Simplified) */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-card/20 w-fit">
                    <div className={cn(
                      "w-1 h-1 rounded-full",
                      dbStatus?.connected ? "bg-status-green shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-red-500"
                    )} />
                    <span className="text-[7px] uppercase tracking-wider text-text-muted font-bold">
                      {dbStatus?.connected ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Login/User Profile Area */}
                  {!displayUser ? (
              <button 
                onClick={() => setIsAuthOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3.5 bg-gold/10 border border-gold/30 rounded-xl hover:bg-gold/20 transition-all text-[11px] font-bold text-gold group"
              >
                <LogIn size={16} className="group-hover:scale-110 transition-transform" />
                Đăng nhập hệ thống
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-card/40 rounded-xl border border-line">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold border border-gold/30">
                    <UserCircle size={20} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-white truncate">{displayUser.email}</p>
                    <p className="text-[8px] text-text-muted uppercase tracking-tight">
                      {isUserAdmin ? 'Quản trị viên' : 'Thành viên Solna'}
                    </p>
                  </div>
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                </div>

                {isUserAdmin && (
                  <button 
                    onClick={() => setIsAdminOpen(true)}
                    className="w-full flex items-center justify-between p-3.5 bg-gold/20 border border-gold/50 rounded-xl hover:bg-gold/30 transition-all text-left shadow-lg shadow-gold/5"
                  >
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-gold font-bold">Bảng điều khiển</p>
                      <p className="text-xs font-black text-white">Quản lý kho hàng</p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center text-bg">
                      <Database size={14} />
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-bg">
        {/* Chat Header (Mobile Only - Beautiful Redesign) */}
        <header className="md:hidden px-4 py-3 bg-surface/80 backdrop-blur-xl text-white flex items-center justify-between shadow-lg z-30 border-b border-line/50 sticky top-0">
          <a href="https://pianosolna.com/" target="_blank" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center text-bg shadow-md">
              <Piano size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-sm tracking-tight leading-tight">Piano Solna</span>
              <span className="text-[7px] text-gold font-bold uppercase tracking-widest leading-none">Chuyên gia tư vấn</span>
            </div>
          </a>
          <div className="flex items-center gap-2">
            {!displayUser && (
              <button 
                onClick={() => setIsAuthOpen(true)}
                className="p-2 text-text-muted hover:text-gold transition-colors"
              >
                <User size={20} />
              </button>
            )}
            {isUserAdmin && (
              <button 
                onClick={() => setIsAdminOpen(true)}
                className="p-2 text-gold animate-pulse"
              >
                <Database size={20} />
              </button>
            )}
          </div>
        </header>

        {/* Messages Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10 space-y-6 md:space-y-8 scroll-smooth custom-scrollbar"
        >
          <div className="mx-auto max-w-4xl">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex gap-3 md:gap-4 mb-6 md:mb-8",
                    m.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl shrink-0 flex items-center justify-center shadow-md border",
                    m.role === 'user' 
                      ? "bg-line border-line text-gold font-bold" 
                      : "bg-surface border-line text-gold"
                  )}>
                    {m.role === 'user' ? displayUser?.email?.charAt(0).toUpperCase() || <User size={18} /> : <Piano size={18} className="md:w-5 md:h-5" />}
                  </div>
                  <div className={cn(
                    "p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-sm text-sm md:text-[15px] leading-relaxed max-w-[85%] md:max-w-[75%]",
                    m.role === 'user' 
                      ? "bg-line text-white rounded-tr-none border border-line" 
                      : "bg-surface border border-white/5 shadow-xl rounded-tl-none border border-gold/10"
                  )}>
                    <div className="prose prose-sm md:prose-base max-w-none prose-invert">
                      <ReactMarkdown
                        components={{
                          img: ({ ...props }) => {
                            const originalSrc = props.src || '';
                            const proxiedSrc = originalSrc.startsWith('http') 
                              ? `https://images.weserv.nl/?url=${encodeURIComponent(originalSrc)}&w=800` 
                              : originalSrc;
                            
                            return (
                              <span className="my-6 block">
                                <a 
                                  href={originalSrc} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="relative block group overflow-hidden rounded-2xl border-2 border-gold/20 shadow-2xl bg-surface p-0 hover:border-gold/50 transition-colors"
                                >
                                  <img 
                                    {...props} 
                                    src={proxiedSrc}
                                    onError={(e: any) => {
                                      const target = e.target as HTMLImageElement;
                                      if (!target.src.includes('weserv.nl')) {
                                        target.src = `https://images.weserv.nl/?url=${encodeURIComponent(originalSrc)}&w=800`;
                                      } 
                                      else if (!target.src.includes('wp.com')) {
                                        target.src = `https://i0.wp.com/${originalSrc.replace(/^https?:\/\//, '')}`;
                                      }
                                    }}
                                    className="block w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-[10px] font-bold px-3 py-1.5 bg-gold rounded-full flex items-center gap-1 shadow-lg">
                                      <Info size={12} /> Xem chi tiết
                                    </span>
                                  </span>
                                </a>
                                <span className="mt-2 text-[10px] text-gold/40 flex items-center justify-center gap-1 italic opacity-60">
                                  Hệ thống Piano Solna
                                </span>
                              </span>
                            );
                          }
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 mb-8"
              >
                <div className="w-10 h-10 rounded-2xl bg-surface text-gold flex items-center justify-center animate-pulse shadow-md border border-line">
                  <Bot size={20} />
                </div>
                <div className="bg-surface/50 px-5 py-3 rounded-2xl border border-line flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs italic text-text-muted font-medium">Solna đang soạn câu trả lời...</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 md:px-10 py-6 border-t border-line/50 bg-bg/80 backdrop-blur-2xl">
          <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
             {/* Quick Suggestions */}
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
              {['Tư vấn cho bé', 'Tầm 15-20tr', 'Piano Yamaha', 'Giao hàng'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="whitespace-nowrap px-4 py-2 rounded-xl border border-line bg-surface/50 text-[11px] font-bold text-text-muted hover:border-gold hover:text-gold transition-all shadow-sm flex items-center gap-2"
                >
                  {suggestion}
                  <ChevronRight size={12} className="opacity-50" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Hỏi Piano Solna..."
                  className="w-full pl-5 pr-14 py-4 md:py-5 bg-surface border border-line rounded-2xl md:rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-gold/5 focus:border-gold/30 transition-all shadow-xl text-sm md:text-base text-white placeholder:text-text-muted/50"
                />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-full flex items-center justify-center transition-all",
                    isRecording 
                      ? "bg-red-500 text-white shadow-lg animate-pulse scale-105" 
                      : "text-text-muted hover:text-gold hover:bg-gold/5"
                  )}
                >
                  {isRecording ? <Square size={16} /> : <Mic size={20} />}
                </button>
              </div>
              
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="bg-gold text-bg p-4 md:p-5 rounded-2xl md:rounded-full hover:bg-white hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xl hover:shadow-gold/30 active:scale-95 group shrink-0"
              >
                <Send size={22} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            <p className="text-center text-[8px] md:text-[10px] text-text-muted/40 font-black uppercase tracking-[0.3em]">
              Piano Solna AI • Premium Assistant
            </p>
          </div>
        </div>
      </main>

      {/* Floating Action Buttons for Customer Experience */}
      <div className="fixed bottom-32 right-6 md:bottom-10 md:right-10 flex flex-col gap-4 z-50">
        <motion.a
          href="https://zalo.me/0906876281" // Số Zalo thật
          target="_blank"
          whileHover={{ scale: 1.1, x: -5 }}
          className="w-14 h-14 bg-[#0068ff] rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/20 border-2 border-white/20"
          title="Chat Zalo"
        >
          <img src="https://picsum.photos/seed/zalo-logo/40/40" alt="Zalo" className="w-8 h-8 rounded-lg" />
        </motion.a>
        
        <motion.a
          href="tel:0906876281" // Số hotline thật
          whileHover={{ scale: 1.1, x: -5 }}
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="w-14 h-14 bg-status-green rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-green-500/20 border-2 border-white/20"
          title="Gọi hotline"
        >
          <Phone size={24} />
        </motion.a>
      </div>
    </div>
  );
}

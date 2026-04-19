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
  Music4
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { createPianoChat, transcribeAudio } from './services/geminiService';
import { cn } from './lib/utils';
import { supabase, checkSupabaseConnection } from './lib/supabase';

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
  }, []);

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
        const result = await chat.sendMessage({ message: messageText });
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
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex bg-surface text-text-main w-1/3 lg:w-1/4 p-10 flex-col justify-between border-r border-line relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -ml-32 -mb-32" />

        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 mb-16"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-gold to-[#B8860B] rounded-2xl flex items-center justify-center text-bg shadow-2xl rotate-3">
              <Piano size={32} />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">Piano Solna</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-status-green rounded-full animate-pulse" />
                <p className="text-gold/90 text-[10px] uppercase tracking-[0.2em] font-bold">CHI NHÁNH TP.HCM</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-10">
            <section>
              <h2 className="font-serif text-xl mb-4 italic text-gold">Dẫn lối đam mê</h2>
              <p className="text-text-muted text-sm leading-relaxed font-light">
                Chào mừng bạn đến với Piano Solna. Chúng tôi tự hào mang đến những cây đàn piano tinh túy nhất từ Yamaha, Kawai và Roland cho ngôi nhà bạn.
              </p>
            </section>

            <nav className="space-y-6">
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-card border border-line flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-bg transition-all shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Showroom</p>
                  <p className="text-sm font-medium">TP. Hồ Chí Minh</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-card border border-line flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-bg transition-all shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Liên hệ</p>
                  <p className="text-sm font-medium">pianosolna.vn</p>
                </div>
              </div>

              {/* Database Status Indicator */}
              <div className="pt-4 border-t border-line/30">
                <div className="flex items-center gap-3 bg-card/50 p-3 rounded-xl border border-line">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    dbStatus?.connected ? "bg-status-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  )} />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Supabase Status</span>
                    <span className="text-[11px] font-medium truncate max-w-[150px]">
                      {dbStatus ? dbStatus.message : 'Đang kiểm tra...'}
                    </span>
                  </div>
                </div>
              </div>
            </nav>

            <div className="pt-6 grid grid-cols-2 gap-4">
              <div className="bg-card p-4 rounded-2xl border border-line flex flex-col gap-3 hover:bg-gold/10 transition-all cursor-default group">
                <Music4 size={24} className="text-gold group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold tracking-wide">Piano Điện</span>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-line flex flex-col gap-3 hover:bg-gold/10 transition-all cursor-default group">
                <Piano size={24} className="text-gold group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold tracking-wide">Piano Cơ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-10">
          <div className="flex items-center gap-2 mb-2">
             <div className="h-[1px] flex-1 bg-line" />
             <span className="text-[10px] text-text-muted uppercase tracking-[0.3em]">Hồ Chí Minh</span>
             <div className="h-[1px] flex-1 bg-line" />
          </div>
          <p className="text-[9px] text-center text-text-muted uppercase tracking-widest">
            Expertly crafted for musicians
          </p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-bg">
        {/* Chat Header (Mobile Only) */}
        <header className="md:hidden p-4 bg-surface text-text-main flex items-center justify-between shadow-xl z-20 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-bg">
              <Piano size={18} />
            </div>
            <span className="font-serif font-bold text-lg tracking-tight">Solna Support</span>
          </div>
          <button className="text-gold">
            <Info size={22} />
          </button>
        </header>

        {/* Messages Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 scroll-smooth"
        >
          <div className="mx-auto max-w-3xl">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex gap-4 mb-8",
                    m.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-md border",
                    m.role === 'user' 
                      ? "bg-line border-line text-white" 
                      : "bg-surface border-line text-gold"
                  )}>
                    {m.role === 'user' ? <User size={20} /> : <Piano size={20} />}
                  </div>
                  <div className={cn(
                    "p-5 rounded-3xl shadow-sm text-[15px] leading-relaxed max-w-[85%] md:max-w-[70%]",
                    m.role === 'user' 
                      ? "bg-line text-white rounded-tr-none border border-line" 
                      : "bg-gold/5 text-text-main rounded-tl-none border border-gold/20"
                  )}>
                    <div className={cn(
                      "prose prose-sm max-w-none prose-invert"
                    )}>
                      <ReactMarkdown>{m.content}</ReactMarkdown>
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
        <div className="px-4 md:px-10 py-6 border-t border-line bg-surface/60 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl space-y-4">
             {/* Quick Suggestions */}
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
              {['Tư vấn cho bé học', 'Tầm 15-20 triệu', 'Piano điện Yamaha', 'Giao hàng thế nào?'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="whitespace-nowrap px-5 py-2 rounded-2xl border border-line bg-card text-xs font-semibold text-text-muted hover:border-gold hover:text-gold hover:bg-gold/5 transition-all shadow-sm flex items-center gap-2 group"
                >
                  {suggestion}
                  <ChevronRight size={14} className="text-text-muted group-hover:text-gold transition-colors" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Gõ thắc mắc của bạn tại đây..."
                  className="w-full pl-6 pr-14 py-5 bg-bg border border-line rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/40 transition-all shadow-sm text-sm text-white"
                />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all",
                    isRecording 
                      ? "bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse scale-110" 
                      : "text-gray-400 border border-gray-100 bg-gray-50 hover:text-gold hover:bg-gold/10 hover:border-gold/20"
                  )}
                >
                  {isRecording ? <Square size={18} /> : <Mic size={20} />}
                </button>
              </div>
              
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="bg-gold text-bg p-5 rounded-full hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-gold/20 hover:-translate-y-0.5 active:translate-y-0 group"
              >
                <Send size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

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
  UserCircle,
  Image as ImageIcon,
  Video,
  Paperclip,
  MessageSquare,
  History,
  Trash2,
  ExternalLink,
  MessageCircle,
  ArrowLeft
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { createPianoChat, transcribeAudio } from './services/geminiService';
import { cn } from './lib/utils';
import { 
  supabase, 
  checkSupabaseConnection, 
  getOrCreateSession, 
  saveMessage, 
  getSessionMessages, 
  uploadMedia,
  markSessionHelp
} from './lib/supabase';
import { getContextualPrompt } from './lib/ragService';
import { KnowledgeManager } from './components/KnowledgeManager';
import { AuthModal } from './components/AuthModal';
import { ChatDashboard } from './components/ChatDashboard';

interface Message {
  role: 'user' | 'model' | 'admin';
  content: string;
  id: string;
  media_url?: string;
  media_type?: 'image' | 'video';
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Xin chào quý khách! Piano Solna rất hân hạnh được đồng hành cùng bạn. Bạn đang quan tâm đến dòng piano nào (Cơ, Điện) hay cần tư vấn cho người mới bắt đầu ạ?',
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
  const [isChatDashboardOpen, setIsChatDashboardOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    setChat(createPianoChat());
    
    const verifyDb = async () => {
      const status = await checkSupabaseConnection();
      setDbStatus(status);
    };
    verifyDb();

    // Initial session setup
    const initSession = async () => {
      try {
        const session = await getOrCreateSession();
        if (session) {
          setSessionId(session.id);
          const history = await getSessionMessages(session.id);
          if (history.length > 0) {
            setMessages(history.map((m: any) => ({
              role: m.role,
              content: m.content || '',
              id: m.id,
              media_url: m.media_url,
              media_type: m.media_type
            })));
          }

          // Subscribe to real-time messages for this session
          const channelName = `session_user_${session.id}_${Date.now()}`;
          channelRef.current = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${session.id}` },
              (payload) => {
                const newMessage = payload.new as any;
                setMessages(prev => {
                  if (prev.find(m => m.id === newMessage.id)) return prev;
                  return [...prev, {
                    role: newMessage.role,
                    content: newMessage.content || '',
                    id: newMessage.id,
                    media_url: newMessage.media_url,
                    media_type: newMessage.media_type
                  }];
                });
              }
            )
            .subscribe();
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      }
    };
    initSession();

    // Listen for auth changes
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setUser(s?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setUser(s?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Danh sách Admin cố định: Chỉ đúng 2 tài khoản này mới thấy nút Quản lý
  const ADMIN_EMAILS = [
    'btthanhvan.19062004@gmail.com', // Email của bạn
    'admin@pianosolna.vn'           // Email phụ (bạn có thể đổi tùy ý)
  ];

  const displayUser = user;
  const isUserAdmin = displayUser && ADMIN_EMAILS.includes(displayUser.email || '');

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setIsUploading(true);
            try {
              const media = await uploadMedia(file);
              setPendingMedia(media as any);
            } catch (error) {
              console.error('Paste upload error:', error);
            } finally {
              setIsUploading(false);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string, media?: { url: string, type: 'image' | 'video' }) => {
    const messageText = text || input.trim();
    const mediaToSend = media || pendingMedia;
    
    if (!messageText && !mediaToSend && !isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      id: Date.now().toString(),
      media_url: mediaToSend?.url,
      media_type: mediaToSend?.type
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setPendingMedia(null);
    setIsLoading(true);

    try {
      // Save user message to Supabase
      if (sessionId) {
        await saveMessage(sessionId, 'user', messageText, mediaToSend || undefined);
      }

      if (chat && !mediaToSend) {
        // Use RAG to get context for the user query
        const enrichedPrompt = await getContextualPrompt(messageText);
        
        const result = await chat.sendMessage({ message: enrichedPrompt });
        const aiResponse = result.text || 'Dạ, mình xin lỗi, có chút trục trặc kỹ thuật. Bạn nói lại giúp mình nhé!';
        
        const modelMessage: Message = {
          role: 'model',
          content: aiResponse,
          id: (Date.now() + 1).toString()
        };
        
        setMessages(prev => [...prev, modelMessage]);

        // Save AI message to Supabase
        if (sessionId) {
          await saveMessage(sessionId, 'model', aiResponse);
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      // If AI fails significantly or explicitly stated help needed
      if (sessionId) {
         await markSessionHelp(sessionId, true);
      }
      
      const fallback = 'Dạ, hệ thống đang bận một chút, nhân viên tư vấn sẽ phản hồi bạn ngay lập tức qua đây nhé!';
      setMessages(prev => [...prev, {
        role: 'model',
        content: fallback,
        id: (Date.now() + 1).toString()
      }]);
      
      if (sessionId) {
        await saveMessage(sessionId, 'model', fallback);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const media = await uploadMedia(file);
      setPendingMedia(media as any);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Lỗi tải tệp lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
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

  if (isUserAdmin) {
    return (
      <div className="h-screen bg-bg">
        <KnowledgeManager isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
        <ChatDashboard onOpenKnowledge={() => setIsAdminOpen(true)} />
      </div>
    );
  }

  return (
    <div className="h-screen-safe flex flex-col md:flex-row font-sans bg-bg selection:bg-gold/30 overflow-hidden text-text-main">
      <KnowledgeManager isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <ChatDashboard isOpen={isChatDashboardOpen} onClose={() => setIsChatDashboardOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      
      {/* Sidebar - Desktop Only (Refined & Compact) */}
      <aside className="hidden md:flex bg-[#0A0A0A] text-text-main w-[280px] lg:w-[320px] p-6 lg:p-7 flex-col justify-between border-r border-white/5 relative h-full shrink-0">
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-10 shrink-0">
            <motion.a 
              href="https://pianosolna.com/"
              target="_blank"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center text-bg shadow-lg shadow-gold/10 group-hover:scale-105 transition-transform">
                <Piano size={22} className="shrink-0" />
              </div>
              <div>
                <h1 className="font-serif text-lg font-bold tracking-tight text-white leading-none">Piano Solna</h1>
                <p className="text-[7px] text-gold font-bold uppercase tracking-[0.2em] mt-1 opacity-70">Chuyên gia tư vấn</p>
              </div>
            </motion.a>

            {isUserAdmin && (
              <button 
                onClick={() => setIsChatDashboardOpen(true)}
                className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all shadow-sm"
                title="Tin nhắn quản trị"
              >
                <MessageSquare size={18} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
            <section>
              <div className="space-y-6 pt-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-gold shrink-0 border border-white/5">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-gold/60 font-bold mb-1">Showroom</p>
                    <p className="text-[10px] md:text-xs font-medium text-text-muted leading-relaxed">
                      140/27/11 Vườn Lài, Q.12<br/>
                      142 Lê Hồng Phong, Dĩ An<br/>
                      Him Lam Phú An, Thủ Đức
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-gold shrink-0 border border-white/5">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-gold/60 font-bold mb-1">Hotline</p>
                    <p className="text-sm md:text-base font-black text-white">090 687 6281</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Fixed Bottom Area */}
          <div className="mt-6 pt-4 border-t border-white/5 space-y-4 shrink-0">
            <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-white/5 bg-white/5 w-fit">
              <div className={cn(
                "w-1 h-1 rounded-full",
                dbStatus?.connected ? "bg-status-green shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-red-500"
              )} />
              <span className="text-[7px] uppercase tracking-wider text-text-muted font-bold">
                {dbStatus?.connected ? 'Online' : 'Offline'}
              </span>
            </div>

            {!displayUser ? (
              <button 
                onClick={() => setIsAuthOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gold/10 border border-gold/20 rounded-xl hover:bg-gold/20 transition-all text-[11px] font-bold text-gold"
              >
                <LogIn size={15} />
                Đăng nhập
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2.5 bg-white/5 rounded-xl border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/10">
                    <UserCircle size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-white truncate leading-none">{displayUser.email}</p>
                    <p className="text-[7px] text-text-muted uppercase tracking-tight mt-1">
                      {isUserAdmin ? 'Quản trị viên' : 'Thành viên'}
                    </p>
                  </div>
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                  >
                    <LogOut size={14} />
                  </button>
                </div>

                {isUserAdmin && (
                  <button 
                    onClick={() => setIsAdminOpen(true)}
                    className="w-full flex items-center justify-between p-2.5 bg-gold/10 border border-gold/20 rounded-xl hover:bg-gold/20 transition-all text-left shadow-lg shadow-gold/5"
                  >
                    <div>
                      <p className="text-[7px] uppercase tracking-widest text-gold font-bold">Bảng điều khiển</p>
                      <p className="text-[11px] font-black text-white">Quản lý kho hàng</p>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-gold flex items-center justify-center text-bg">
                      <Database size={12} />
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
        <header className="md:hidden px-4 py-4 bg-surface/95 backdrop-blur-xl text-white flex items-center justify-between shadow-lg z-30 border-b-2 border-gold/20 sticky top-0">
          <a href="https://pianosolna.com/" target="_blank" className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-gold to-[#B8860B] rounded-xl flex items-center justify-center text-bg shadow-lg">
              <Piano size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-lg tracking-tight leading-tight">Piano Solna</span>
              <span className="text-[8px] text-gold font-bold uppercase tracking-[0.2em] leading-none mt-1">Chuyên gia tư vấn</span>
            </div>
          </a>
          <div className="flex items-center gap-3">
            {!displayUser && (
              <button 
                onClick={() => setIsAuthOpen(true)}
                className="p-2.5 bg-white/5 border border-line rounded-xl text-text-muted hover:text-gold transition-colors"
              >
                <User size={22} />
              </button>
            )}
            {isUserAdmin && (
              <button 
                onClick={() => setIsAdminOpen(true)}
                className="p-2.5 bg-gold/20 border border-gold/30 text-gold rounded-xl animate-pulse shadow-lg"
              >
                <Database size={22} />
              </button>
            )}
          </div>
        </header>

        {/* Messages Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 py-8 md:py-12 space-y-8 md:space-y-10 scroll-smooth custom-scrollbar"
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
                    "flex flex-col gap-1.5",
                    m.role === 'user' ? "items-end ml-12" : "items-start mr-12"
                  )}>
                    {m.media_url && (
                      <div className="mb-2 max-w-sm rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        {m.media_type === 'video' ? (
                          <video src={m.media_url} controls className="w-full h-auto" />
                        ) : (
                          <img src={m.media_url} alt="User media" className="w-full h-auto object-cover max-h-[300px]" />
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "p-4 md:p-5 rounded-[20px] shadow-sm text-sm md:text-[15px] leading-relaxed relative",
                      m.role === 'user' 
                        ? "bg-gold text-bg font-bold rounded-tr-[4px]" 
                        : m.role === 'admin'
                          ? "bg-blue-600 text-white font-bold rounded-tl-[4px]"
                          : "bg-surface border border-white/5 shadow-xl rounded-tl-[4px] border-l-gold/30"
                    )}>
                      <div className="prose prose-sm md:prose-base max-w-none prose-invert font-medium selection:bg-white/20">
                      <ReactMarkdown
                        components={{
                          img: ({ ...props }) => {
                            const src = props.src || '';
                            return (
                              <span className="my-4 block">
                                <a 
                                  href={src} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="relative block rounded-xl overflow-hidden border border-gold/20 shadow-lg"
                                >
                                  <img 
                                    {...props} 
                                    className="block w-full h-auto max-h-[350px] object-contain bg-black/40" 
                                    referrerPolicy="no-referrer"
                                  />
                                </a>
                              </span>
                            );
                          }
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
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
        <div className="px-4 md:px-10 py-6 md:py-10 border-t-2 border-line bg-bg/95 backdrop-blur-3xl">
          <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
            <AnimatePresence>
              {pendingMedia && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="flex justify-end"
                >
                  <div className="relative group p-2 bg-surface border-2 border-gold/30 rounded-2xl shadow-2xl">
                    <button 
                      onClick={() => setPendingMedia(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    {pendingMedia.type === 'video' ? (
                      <div className="w-32 h-32 md:w-48 md:h-48 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                        <Video size={32} className="text-gold" />
                      </div>
                    ) : (
                      <img 
                        src={pendingMedia.url} 
                        alt="Preview" 
                        className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-xl"
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

             {/* Quick Suggestions */}
             <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
              {['Tư vấn cho bé', 'Tầm 15-20tr', 'Piano Yamaha', 'Giao hàng'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="whitespace-nowrap px-6 py-3 rounded-2xl border-2 border-line bg-surface text-xs md:text-sm font-bold text-text-main hover:border-gold hover:text-gold transition-all shadow-md flex items-center gap-2 active:scale-95"
                >
                  {suggestion}
                  <ChevronRight size={14} className="opacity-50" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Gõ thắc mắc của bạn tại đây..."
                  className="w-full pl-6 pr-32 py-5 md:py-6 bg-surface border-2 border-line rounded-2xl md:rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/50 transition-all shadow-2xl text-base md:text-lg text-white font-medium"
                />
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload}
                    accept="image/*,video/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-gold transition-all"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
                  </button>

                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-full flex items-center justify-center transition-all",
                      isRecording 
                        ? "bg-red-500 text-white shadow-xl animate-pulse scale-105" 
                        : "text-text-muted hover:text-gold bg-bg/30 border border-line"
                    )}
                  >
                    {isRecording ? <Square size={20} /> : <Mic size={24} />}
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="bg-gold text-bg p-5 md:p-6 rounded-2xl md:rounded-full hover:bg-white hover:text-gold disabled:opacity-20 transition-all shadow-2xl active:scale-90 group shrink-0"
              >
                <Send size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
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

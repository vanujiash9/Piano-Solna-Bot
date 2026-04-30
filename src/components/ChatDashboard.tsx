import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageSquare, 
  User, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  ChevronRight,
  ArrowLeft,
  Info,
  Loader2,
  Database,
  LogOut,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { supabase, getAllSessions, getSessionMessages, saveMessage, markSessionHelp } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Session {
  id: string;
  user_email: string;
  user_name: string;
  last_message_at: string;
  needs_human: boolean;
  status: string;
}

interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'model' | 'admin';
  content: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
}

export function ChatDashboard({ className, onOpenKnowledge }: { className?: string; onOpenKnowledge?: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'needs_human' | 'admin_replied'>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showDetails, setShowDetails] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
    
    const channel = supabase
      .channel('admin_dashboard_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => {
        loadSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let channel: any = null;
    if (selectedSessionId) {
      loadMessages(selectedSessionId);
      
      const channelName = `session_admin_${selectedSessionId}_${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `session_id=eq.${selectedSessionId}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        })
        .subscribe();
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = (s.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.user_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.id.includes(searchQuery);
    
    let matchesFilter = true;
    if (filterMode === 'needs_human') matchesFilter = s.needs_human;
    else if (filterMode === 'admin_replied') matchesFilter = !s.needs_human;
    
    return matchesSearch && matchesFilter;
  });

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await getAllSessions();
      setSessions(data);
    } catch (err) {
      console.error('Load sessions error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ...

  const loadMessages = async (sid: string) => {
    setLoadingChat(true);
    const data = await getSessionMessages(sid);
    setMessages(data);
    setLoadingChat(false);
  };

  const handleReply = async () => {
    if (!input.trim() || !selectedSessionId) return;
    
    const text = input.trim();
    setInput('');
    
    try {
      await saveMessage(selectedSessionId, 'admin', text);
      // Mark as helped
      await markSessionHelp(selectedSessionId, false);
    } catch (error) {
      console.error('Reply error:', error);
    }
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className={cn("flex flex-col h-screen w-full bg-bg overflow-hidden", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-line bg-surface/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 id="dashboard-title" className="text-lg font-serif font-black text-white">Quản lý Tư vấn</h2>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Trung tâm tin nhắn khách hàng</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold text-[10px] font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <p className="text-[10px] font-bold text-white/70">{user.email}</p>
            </div>
          )}

          <button 
            onClick={onOpenKnowledge}
            className="flex items-center gap-2 px-3 py-2 bg-gold/10 hover:bg-gold/20 text-gold rounded-xl border border-gold/20 transition-all text-[11px] font-bold"
          >
            <Database size={14} />
            <span className="hidden sm:inline">Dữ liệu AI</span>
          </button>

          <button 
            onClick={() => supabase.auth.signOut()}
            className="p-2.5 hover:bg-red-500/10 rounded-xl text-text-muted hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
              {/* Session List (Column 1) */}
              <div className={cn(
                "w-full md:w-72 lg:w-80 border-r border-line bg-surface/20 flex flex-col transition-all",
                selectedSessionId && "hidden md:flex"
              )}>
                <div className="p-4 border-b border-line space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-gold/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'needs_human', label: 'Cần hỗ trợ' },
                      { id: 'admin_replied', label: 'Đã phản hồi' }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setFilterMode(tab.id as any)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all whitespace-nowrap",
                          filterMode === tab.id ? "bg-gold text-bg shadow-lg shadow-gold/20" : "bg-white/5 text-text-muted hover:bg-white/10"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {loading && (
                    <div className="flex items-center justify-center py-20 text-gold scale-125">
                      <Loader2 className="animate-spin" />
                    </div>
                  )}

                  {!loading && filteredSessions.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-center opacity-40">
                      <MessageSquare size={32} className="mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Không có dữ liệu</p>
                    </div>
                  )}

                  <div className="divide-y divide-line">
                    {filteredSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={cn(
                          "w-full p-4 flex items-start gap-3 transition-all hover:bg-white/5 text-left group relative",
                          selectedSessionId === session.id && "bg-blue-600/10 border-r-4 border-blue-500"
                        )}
                      >
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-text-muted shadow-sm group-hover:border-gold/40 transition-colors",
                            session.needs_human && "border-red-500/50 text-red-400"
                          )}>
                            <User size={18} />
                          </div>
                          {session.needs_human && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-surface animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-bold text-white truncate text-xs group-hover:text-gold transition-colors">
                              {session.user_name || session.user_email || `Khách ${session.id.slice(0, 4)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-text-muted text-[9px] font-medium">
                            <Clock size={8} />
                            <span>{new Date(session.last_message_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            {session.needs_human && (
                              <span className="ml-auto flex items-center gap-1 text-[7px] text-red-500 font-black uppercase">
                                <AlertCircle size={8} />
                                Ưu tiên
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat Content (Column 2) */}
              <div className={cn(
                "flex-1 flex flex-col bg-bg/10 relative border-r border-line",
                !selectedSessionId && "hidden md:flex"
              )}>
                {selectedSessionId ? (
                  <>
                    <div className="p-4 border-b border-line bg-surface/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setSelectedSessionId(null)}
                          className="md:hidden p-2 -ml-2 text-text-muted hover:text-white"
                        >
                          <ArrowLeft size={18} />
                        </button>
                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-[13px] leading-none mb-1">
                            {selectedSession?.user_name || selectedSession?.user_email || 'Khách truy cập'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            <p className="text-[9px] text-text-muted font-bold uppercase tracking-tight">Trực tuyến</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowDetails(!showDetails)}
                          className={cn(
                            "p-2 rounded-lg transition-all border",
                            showDetails ? "bg-white/10 border-white/20 text-white" : "text-text-muted border-transparent hover:bg-white/5"
                          )}
                          title="Chi tiết hội thoại"
                        >
                          <Info size={18} />
                        </button>
                      </div>
                    </div>

                    <div 
                      ref={scrollRef}
                      className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/5"
                    >
                      {loadingChat && (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="animate-spin text-gold" />
                        </div>
                      )}
                      
                      {messages.map(m => (
                        <div key={m.id} className={cn(
                          "flex gap-3",
                          m.role === 'admin' ? "flex-row-reverse" : "flex-row"
                        )}>
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-md border",
                            m.role === 'user' ? "bg-gold border-gold/40 text-bg" : 
                            m.role === 'admin' ? "bg-blue-600 border-blue-500/40 text-white" : "bg-surface border-line text-gold"
                          )}>
                            {m.role === 'user' ? <User size={14} /> : 
                             m.role === 'admin' ? <User size={14} /> : <div className="text-[10px] font-black italic">AI</div>}
                          </div>
                          
                          <div className={cn(
                            "flex flex-col gap-1.5 max-w-[75%]",
                            m.role === 'admin' ? "items-end" : "items-start"
                          )}>
                            <div className={cn(
                              "p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm relative group",
                              m.role === 'user' ? "bg-gold/90 text-bg font-bold rounded-tl-none" : 
                              m.role === 'admin' ? "bg-blue-600 text-white font-bold rounded-tr-none" :
                              "bg-[#1A1A1A] border border-white/5 text-text-main rounded-tl-none"
                            )}>
                              {m.content}
                            </div>
                            <span className="text-[8px] text-text-muted/60 font-bold px-1 flex items-center gap-1">
                              <Clock size={8} />
                              {new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-line bg-surface/40">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                          <textarea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReply();
                              }
                            }}
                            placeholder="Nhập nội dung tư vấn trực tiếp..."
                            className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-medium custom-scrollbar min-h-[50px] max-h-[150px] resize-none"
                          />
                        </div>
                        <button 
                          onClick={handleReply}
                          disabled={!input.trim()}
                          className="bg-blue-600 text-white p-3.5 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-30 shadow-lg active:scale-95 shrink-0"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-text-muted mb-6">
                      <MessageSquare size={40} />
                    </div>
                    <h3 className="text-lg font-serif font-black text-white mb-2">Trung tâm Điều hành</h3>
                    <p className="text-xs text-text-muted max-w-xs leading-relaxed font-medium">
                      Vui lòng chọn một cuộc hội thoại để phản hồi khách hàng hoặc giám sát AI.
                    </p>
                  </div>
                )}
              </div>

              {/* Details Sidepanel (Column 3) */}
              <AnimatePresence>
                {selectedSessionId && showDetails && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="hidden lg:flex flex-col border-l border-line bg-surface/10 overflow-hidden"
                  >
                    <div className="p-5 border-b border-line flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gold opacity-60">Thông tin chi tiết</p>
                      <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-white/5 rounded-md text-text-muted">
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
                      <section className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[8px] uppercase tracking-widest text-gold font-black mb-2">ID Hội thoại</p>
                          <code className="text-[10px] font-mono text-white break-all bg-black/30 p-1.5 rounded block">
                            {selectedSessionId}
                          </code>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[8px] uppercase tracking-widest text-text-muted font-black mb-1">Trạng thái</p>
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                              selectedSession?.needs_human ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
                            )}>
                              {selectedSession?.needs_human ? 'Cần giúp' : 'Ổn định'}
                            </span>
                          </div>
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[8px] uppercase tracking-widest text-text-muted font-black mb-1">Bắt đầu lúc</p>
                            <span className="text-[9px] font-bold text-white">
                              {new Date(selectedSession?.last_message_at || '').toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gold opacity-60 border-b border-line pb-2">Hành động nhanh</p>
                        <div className="space-y-2">
                          <button 
                            onClick={() => markSessionHelp(selectedSessionId, !selectedSession?.needs_human)}
                            className={cn(
                              "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-[11px] font-bold",
                              selectedSession?.needs_human 
                                ? "bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20" 
                                : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
                            )}
                          >
                            <span>{selectedSession?.needs_human ? 'Đã giải quyết xong' : 'Đánh dấu cần hỗ trợ'}</span>
                            {selectedSession?.needs_human ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          </button>
                        </div>
                      </section>

                      <section className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gold opacity-60 border-b border-line pb-2">Ghi chú AI</p>
                        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 italic text-[11px] text-text-muted leading-relaxed">
                          AI đang hỗ trợ dựa trên dữ liệu Showroom. Nếu phản hồi sai lệch, vui lòng can thiệp trực tiếp bằng cách gửi tin nhắn.
                        </div>
                      </section>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
    </div>
  );
}
